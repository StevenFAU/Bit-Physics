// IC-1 implementation (charter § 3.1).
//
// JSON manifest + per-step raw-binary payload. The manifest lists each
// captured step and the per-field byte offsets / shapes / dtypes; the
// payload file is one contiguous binary blob concatenating every
// step's every field in the order declared by the manifest.
//
// On-disk layout:
//
//   <manifest_path>.json   (sidecar; we accept ".json" extension or
//                          a same-stem ".bin" pair)
//   <manifest_path stem>.bin  (raw payload)
//
// Manifest sub-schema for the step index:
//
//   "steps": [
//     {
//       "step": 0,
//       "fields": [
//         {"name": "u", "dtype": "f64", "shape": [64], "offset": 0, "size": 512},
//         ...
//       ],
//       "diagnostics": {"l2": 1.25}
//     },
//     ...
//   ]
//
// SHIFT from charter — payload format: see header for rationale.

#include "bit_physics/common/capture.hpp"

#include <algorithm>
#include <cstdio>
#include <fstream>
#include <map>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <string>

namespace bit_physics::common_cpp::capture {

using json = nlohmann::json;

namespace {

std::filesystem::path payload_path_for(const std::filesystem::path& manifest_path) {
    auto bin = manifest_path;
    bin.replace_extension(".bin");
    return bin;
}

}  // namespace

json manifest_to_json(const Manifest& m) {
    json out;
    out["schema_version"] = m.schema_version;
    out["sim"] = {{"name", m.sim.name}, {"category", m.sim.category},
                  {"variant", m.sim.variant}};
    out["stack"] = {{"name", m.stack.name}, {"version", m.stack.version},
                    {"build_id", m.stack.build_id}};
    out["config"] = {
        {"tier", m.config.tier},
        {"dims", m.config.dims},
        {"dtype", m.config.dtype},
        {"seed", m.config.seed},
        {"params", m.config.params}};
    out["run"] = {
        {"step_count", m.run.step_count},
        {"capture_interval", m.run.capture_interval},
        {"wall_clock_seconds", m.run.wall_clock_seconds},
        {"start_utc", m.run.start_utc}};
    out["payload"] = {
        {"format", m.payload.format},
        {"path", m.payload.path.string()},
        {"checksum", m.payload.checksum}};
    out["determinism"] = {
        {"claimed", m.determinism.claimed},
        {"atomic_ops", m.determinism.atomic_ops},
        {"subgroup_ops", m.determinism.subgroup_ops}};
    return out;
}

Manifest manifest_from_json(const json& in) {
    Manifest m;
    m.schema_version = in.at("schema_version").get<std::string>();
    m.sim.name = in.at("sim").at("name").get<std::string>();
    m.sim.category = in.at("sim").at("category").get<std::string>();
    m.sim.variant = in.at("sim").at("variant").get<std::string>();
    m.stack.name = in.at("stack").at("name").get<std::string>();
    m.stack.version = in.at("stack").at("version").get<std::string>();
    m.stack.build_id = in.at("stack").at("build_id").get<std::string>();
    const auto& cfg = in.at("config");
    m.config.tier = cfg.at("tier").get<std::string>();
    m.config.dims = cfg.at("dims").get<std::vector<int64_t>>();
    m.config.dtype = cfg.at("dtype").get<std::string>();
    m.config.seed = cfg.at("seed").get<uint64_t>();
    m.config.params = cfg.at("params");
    const auto& run = in.at("run");
    m.run.step_count = run.at("step_count").get<uint64_t>();
    m.run.capture_interval = run.at("capture_interval").get<uint64_t>();
    m.run.wall_clock_seconds = run.at("wall_clock_seconds").get<double>();
    m.run.start_utc = run.at("start_utc").get<std::string>();
    const auto& pay = in.at("payload");
    m.payload.format = pay.at("format").get<std::string>();
    m.payload.path = pay.at("path").get<std::string>();
    m.payload.checksum = pay.at("checksum").get<std::string>();
    const auto& det = in.at("determinism");
    m.determinism.claimed = det.at("claimed").get<std::string>();
    m.determinism.atomic_ops = det.at("atomic_ops").get<bool>();
    m.determinism.subgroup_ops = det.at("subgroup_ops").get<bool>();
    return m;
}

struct Reader::Impl {
    Manifest manifest;
    json step_index;  // the "steps" array from the manifest JSON
    std::filesystem::path payload_path;
};

Reader::Reader(const std::filesystem::path& manifest_path)
    : impl_(std::make_unique<Impl>()) {
    std::ifstream fh(manifest_path);
    if (!fh) {
        throw std::runtime_error("Reader: cannot open manifest " + manifest_path.string());
    }
    json doc = json::parse(fh);
    impl_->manifest = manifest_from_json(doc);
    impl_->step_index = doc.value("steps", json::array());
    auto payload = manifest_path.parent_path() / impl_->manifest.payload.path;
    impl_->payload_path = payload;
}

Reader::~Reader() = default;
Reader::Reader(Reader&&) noexcept = default;
Reader& Reader::operator=(Reader&&) noexcept = default;

const Manifest& Reader::manifest() const {
    return impl_->manifest;
}

std::size_t Reader::step_count() const {
    return impl_->step_index.size();
}

StepData Reader::read_step(std::size_t step_idx) const {
    if (step_idx >= impl_->step_index.size()) {
        throw std::out_of_range("Reader::read_step idx out of range");
    }
    const auto& entry = impl_->step_index.at(step_idx);
    std::ifstream payload(impl_->payload_path, std::ios::binary);
    if (!payload) {
        throw std::runtime_error("Reader: cannot open payload " +
                                 impl_->payload_path.string());
    }
    StepData out;
    for (const auto& field : entry.at("fields")) {
        FieldData fd;
        fd.dtype = field.at("dtype").get<std::string>();
        fd.shape = field.at("shape").get<std::vector<int64_t>>();
        auto offset = field.at("offset").get<std::uint64_t>();
        auto size = field.at("size").get<std::uint64_t>();
        fd.bytes.resize(size);
        payload.seekg(static_cast<std::streamoff>(offset));
        payload.read(reinterpret_cast<char*>(fd.bytes.data()),
                     static_cast<std::streamsize>(size));
        if (!payload) {
            throw std::runtime_error("Reader: short read on payload");
        }
        out.fields.emplace(field.at("name").get<std::string>(), std::move(fd));
    }
    if (entry.contains("diagnostics")) {
        for (auto it = entry.at("diagnostics").begin();
             it != entry.at("diagnostics").end(); ++it) {
            out.diagnostics[it.key()] = it.value().get<double>();
        }
    }
    return out;
}

struct Writer::Impl {
    std::filesystem::path manifest_path;
    Manifest manifest;
    std::map<std::size_t, StepData> buffer;  // ordered by step idx
    bool finalized = false;
};

Writer::Writer(const std::filesystem::path& manifest_path, Manifest m)
    : impl_(std::make_unique<Impl>()) {
    impl_->manifest_path = manifest_path;
    impl_->manifest = std::move(m);
    if (impl_->manifest.payload.path.empty()) {
        impl_->manifest.payload.path = payload_path_for(manifest_path).filename();
    }
}

Writer::~Writer() = default;
Writer::Writer(Writer&&) noexcept = default;
Writer& Writer::operator=(Writer&&) noexcept = default;

void Writer::write_step(std::size_t step_idx, const StepData& data) {
    if (impl_->finalized) {
        throw std::logic_error("Writer::write_step called after finalize()");
    }
    impl_->buffer[step_idx] = data;
}

void Writer::finalize() {
    if (impl_->finalized) return;
    auto payload_path = impl_->manifest_path.parent_path() /
                        impl_->manifest.payload.path;
    std::filesystem::create_directories(payload_path.parent_path());
    std::ofstream payload(payload_path, std::ios::binary);
    if (!payload) {
        throw std::runtime_error("Writer: cannot open payload " + payload_path.string());
    }

    json steps = json::array();
    std::uint64_t cursor = 0;
    for (const auto& [step_idx, step] : impl_->buffer) {
        json entry;
        entry["step"] = step_idx;
        json fields_arr = json::array();
        for (const auto& [name, fd] : step.fields) {
            payload.write(reinterpret_cast<const char*>(fd.bytes.data()),
                          static_cast<std::streamsize>(fd.bytes.size()));
            if (!payload) {
                throw std::runtime_error("Writer: short write on payload");
            }
            json field_entry;
            field_entry["name"] = name;
            field_entry["dtype"] = fd.dtype;
            field_entry["shape"] = fd.shape;
            field_entry["offset"] = cursor;
            field_entry["size"] = fd.bytes.size();
            cursor += fd.bytes.size();
            fields_arr.push_back(field_entry);
        }
        entry["fields"] = fields_arr;
        if (!step.diagnostics.empty()) {
            json diag_obj = json::object();
            for (const auto& [name, value] : step.diagnostics) {
                diag_obj[name] = value;
            }
            entry["diagnostics"] = diag_obj;
        }
        steps.push_back(entry);
    }
    payload.close();

    json manifest_doc = manifest_to_json(impl_->manifest);
    manifest_doc["steps"] = steps;
    std::ofstream manifest_fh(impl_->manifest_path);
    if (!manifest_fh) {
        throw std::runtime_error("Writer: cannot open manifest " +
                                 impl_->manifest_path.string());
    }
    manifest_fh << manifest_doc.dump(2);
    impl_->finalized = true;
}

}  // namespace bit_physics::common_cpp::capture
