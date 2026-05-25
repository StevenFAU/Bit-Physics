// HDF5 capture-v1 writer/reader (Stage 1b; gate C-1).
//
// Replicates the testkit capture-v1 layout (tools/testkit/capture/writer.py)
// via HighFive (header-only) + system libhdf5. See capture.hpp for the contract.
// C-1's bar is the C++-internal write -> read-back round-trip; cross-language
// Python parse-equality is C-6 (Stage 1c).

#include "bit_physics/common/capture.hpp"

#include <algorithm>
#include <cstdint>
#include <fstream>
#include <map>
#include <stdexcept>

#include <highfive/H5DataSet.hpp>
#include <highfive/H5DataSpace.hpp>
#include <highfive/H5File.hpp>
#include <highfive/H5Group.hpp>
#include <nlohmann/json.hpp>

#include "bit_physics/common/hash.hpp"

namespace bit_physics::common_cpp::capture {

namespace {

using json = nlohmann::json;

std::filesystem::path h5_path_for(const std::filesystem::path& manifest_path) {
    auto p = manifest_path;
    p.replace_extension(".h5");
    return p;
}

// dtype string -> element byte width.
std::size_t dtype_size(const std::string& dtype) {
    if (dtype == "f32" || dtype == "i32" || dtype == "u32") return 4;
    if (dtype == "f64" || dtype == "i64" || dtype == "u64") return 8;
    throw std::runtime_error("Hdf5: unsupported dtype '" + dtype + "'");
}

// Create a state dataset of the right HDF5 type + shape and write raw bytes.
void write_state_dataset(HighFive::Group& state_g, const std::string& name,
                         const FieldData& fd) {
    std::vector<std::size_t> dims(fd.shape.begin(), fd.shape.end());
    HighFive::DataSpace space(dims);
    if (fd.dtype == "f32") {
        auto ds = state_g.createDataSet<float>(name, space);
        ds.write_raw(reinterpret_cast<const float*>(fd.bytes.data()));
    } else if (fd.dtype == "f64") {
        auto ds = state_g.createDataSet<double>(name, space);
        ds.write_raw(reinterpret_cast<const double*>(fd.bytes.data()));
    } else if (fd.dtype == "i32") {
        auto ds = state_g.createDataSet<int32_t>(name, space);
        ds.write_raw(reinterpret_cast<const int32_t*>(fd.bytes.data()));
    } else if (fd.dtype == "i64") {
        auto ds = state_g.createDataSet<int64_t>(name, space);
        ds.write_raw(reinterpret_cast<const int64_t*>(fd.bytes.data()));
    } else if (fd.dtype == "u32") {
        auto ds = state_g.createDataSet<uint32_t>(name, space);
        ds.write_raw(reinterpret_cast<const uint32_t*>(fd.bytes.data()));
    } else {
        throw std::runtime_error("Hdf5: unsupported dtype '" + fd.dtype + "'");
    }
}

// Read a state dataset back into a FieldData (bytes/dtype/shape).
FieldData read_state_dataset(const HighFive::DataSet& ds) {
    FieldData fd;
    auto dims = ds.getSpace().getDimensions();
    fd.shape.assign(dims.begin(), dims.end());
    auto dt = ds.getDataType();
    const auto cls = dt.getClass();
    const std::size_t esz = dt.getSize();
    std::size_t n = 1;
    for (auto d : dims) n *= d;
    fd.bytes.resize(n * esz);
    if (cls == HighFive::DataTypeClass::Float && esz == 4) {
        fd.dtype = "f32";
        ds.read_raw(reinterpret_cast<float*>(fd.bytes.data()));
    } else if (cls == HighFive::DataTypeClass::Float && esz == 8) {
        fd.dtype = "f64";
        ds.read_raw(reinterpret_cast<double*>(fd.bytes.data()));
    } else if (cls == HighFive::DataTypeClass::Integer && esz == 4) {
        fd.dtype = "i32";
        ds.read_raw(reinterpret_cast<int32_t*>(fd.bytes.data()));
    } else if (cls == HighFive::DataTypeClass::Integer && esz == 8) {
        fd.dtype = "i64";
        ds.read_raw(reinterpret_cast<int64_t*>(fd.bytes.data()));
    } else {
        throw std::runtime_error("Hdf5: unsupported dataset type on read-back");
    }
    return fd;
}

std::string sha256_of_file(const std::filesystem::path& path) {
    std::ifstream f(path, std::ios::binary);
    if (!f) throw std::runtime_error("Hdf5: cannot reopen payload for checksum");
    std::vector<unsigned char> bytes((std::istreambuf_iterator<char>(f)),
                                     std::istreambuf_iterator<char>());
    return hash::sha256_hex(bytes);
}

}  // namespace

// ---- Hdf5Writer ----------------------------------------------------------

struct Hdf5Writer::Impl {
    std::filesystem::path manifest_path;
    std::filesystem::path payload_path;
    Manifest manifest;
    std::map<std::size_t, StepData> buffer;  // sorted by step number (deterministic order)
    bool finalized = false;
};

Hdf5Writer::Hdf5Writer(const std::filesystem::path& manifest_path, Manifest m)
    : impl_(std::make_unique<Impl>()) {
    impl_->manifest_path = manifest_path;
    impl_->manifest = std::move(m);
    // The testkit capture-v1 manifest schema pins payload.format to "hdf5"
    // (the HDF5 payload kind); the raw-binary path uses "raw-binary-v1".
    if (impl_->manifest.payload.format.empty() ||
        impl_->manifest.payload.format == "raw-binary-v1") {
        impl_->manifest.payload.format = "hdf5";
    }
    if (impl_->manifest.payload.path.empty()) {
        impl_->manifest.payload.path = h5_path_for(manifest_path).filename();
    }
    impl_->payload_path = manifest_path.parent_path() / impl_->manifest.payload.path;
}

Hdf5Writer::~Hdf5Writer() = default;
Hdf5Writer::Hdf5Writer(Hdf5Writer&&) noexcept = default;
Hdf5Writer& Hdf5Writer::operator=(Hdf5Writer&&) noexcept = default;

void Hdf5Writer::write_step(std::size_t step_number, const StepData& data) {
    if (impl_->finalized) {
        throw std::logic_error("Hdf5Writer::write_step called after finalize()");
    }
    impl_->buffer[step_number] = data;
}

void Hdf5Writer::finalize() {
    if (impl_->finalized) return;
    if (!impl_->payload_path.parent_path().empty()) {
        std::filesystem::create_directories(impl_->payload_path.parent_path());
    }

    // capture-v1 determinism flag: libver low bound = earliest (matches h5py
    // libver="earliest" semantics = (EARLIEST, LATEST); HDF5 rejects a high bound
    // of EARLIEST). Defense-in-depth, matching testkit writer.py; not load-bearing
    // for C-1's parse-equality bar.
    HighFive::FileAccessProps fapl;
    fapl.add(HighFive::FileVersionBounds(H5F_LIBVER_EARLIEST, H5F_LIBVER_LATEST));
    {
        HighFive::File file(impl_->payload_path.string(), HighFive::File::Truncate, fapl);
        file.createGroup("steps");
        for (const auto& [step_number, step] : impl_->buffer) {
            const std::string base = "steps/" + std::to_string(step_number);
            auto state_g = file.createGroup(base + "/state");
            // Sorted field order (std::map in StepData would already sort; the
            // unordered_map here is sorted explicitly for deterministic layout).
            std::vector<std::string> fnames;
            fnames.reserve(step.fields.size());
            for (const auto& kv : step.fields) fnames.push_back(kv.first);
            std::sort(fnames.begin(), fnames.end());
            for (const auto& fname : fnames) {
                write_state_dataset(state_g, fname, step.fields.at(fname));
            }
            auto diag_g = file.createGroup(base + "/diagnostics");
            std::vector<std::string> cnames;
            cnames.reserve(step.diagnostics.size());
            for (const auto& kv : step.diagnostics) cnames.push_back(kv.first);
            std::sort(cnames.begin(), cnames.end());
            for (const auto& cname : cnames) {
                diag_g.createDataSet<double>(cname, step.diagnostics.at(cname));
            }
        }
        auto meta_g = file.createGroup("metadata");
        meta_g.createAttribute<std::string>("schema_version", impl_->manifest.schema_version);
        meta_g.createAttribute<std::string>("sim_name", impl_->manifest.sim.name);
        meta_g.createAttribute<std::string>("sim_category", impl_->manifest.sim.category);
        meta_g.createAttribute<std::string>("sim_variant", impl_->manifest.sim.variant);
        meta_g.createAttribute<std::string>("stack_name", impl_->manifest.stack.name);
        meta_g.createAttribute<int64_t>("seed",
                                        static_cast<int64_t>(impl_->manifest.config.seed));
    }  // file closed/flushed here

    impl_->manifest.payload.checksum = "sha256:" + sha256_of_file(impl_->payload_path);

    json doc = manifest_to_json(impl_->manifest);  // no "steps" array (steps live in .h5)
    std::ofstream manifest_fh(impl_->manifest_path);
    if (!manifest_fh) {
        throw std::runtime_error("Hdf5Writer: cannot open manifest " +
                                 impl_->manifest_path.string());
    }
    manifest_fh << doc.dump(2);  // nlohmann default ordered map => sort_keys=True analog
    impl_->finalized = true;
}

// ---- Hdf5Reader ----------------------------------------------------------

struct Hdf5Reader::Impl {
    Manifest manifest;
    std::unordered_map<std::string, std::string> metadata;
    std::filesystem::path payload_path;
};

Hdf5Reader::Hdf5Reader(const std::filesystem::path& manifest_path)
    : impl_(std::make_unique<Impl>()) {
    std::ifstream fh(manifest_path);
    if (!fh) {
        throw std::runtime_error("Hdf5Reader: cannot open manifest " + manifest_path.string());
    }
    json doc = json::parse(fh);
    impl_->manifest = manifest_from_json(doc);
    impl_->payload_path = manifest_path.parent_path() / impl_->manifest.payload.path;

    HighFive::File file(impl_->payload_path.string(), HighFive::File::ReadOnly);
    if (file.exist("metadata")) {
        auto meta_g = file.getGroup("metadata");
        for (const auto& name : meta_g.listAttributeNames()) {
            auto attr = meta_g.getAttribute(name);
            if (attr.getDataType().getClass() == HighFive::DataTypeClass::String) {
                std::string v;
                attr.read(v);
                impl_->metadata[name] = v;
            } else {
                int64_t v = 0;
                attr.read(v);
                impl_->metadata[name] = std::to_string(v);
            }
        }
    }
}

Hdf5Reader::~Hdf5Reader() = default;
Hdf5Reader::Hdf5Reader(Hdf5Reader&&) noexcept = default;
Hdf5Reader& Hdf5Reader::operator=(Hdf5Reader&&) noexcept = default;

const Manifest& Hdf5Reader::manifest() const { return impl_->manifest; }

const std::unordered_map<std::string, std::string>& Hdf5Reader::metadata() const {
    return impl_->metadata;
}

std::vector<std::size_t> Hdf5Reader::step_numbers() const {
    HighFive::File file(impl_->payload_path.string(), HighFive::File::ReadOnly);
    std::vector<std::size_t> out;
    if (file.exist("steps")) {
        for (const auto& key : file.getGroup("steps").listObjectNames()) {
            out.push_back(static_cast<std::size_t>(std::stoull(key)));
        }
    }
    std::sort(out.begin(), out.end());
    return out;
}

StepData Hdf5Reader::read_step(std::size_t step_number) const {
    HighFive::File file(impl_->payload_path.string(), HighFive::File::ReadOnly);
    const std::string base = "steps/" + std::to_string(step_number);
    StepData out;
    auto state_g = file.getGroup(base + "/state");
    for (const auto& fname : state_g.listObjectNames()) {
        out.fields.emplace(fname, read_state_dataset(state_g.getDataSet(fname)));
    }
    if (file.exist(base + "/diagnostics")) {
        auto diag_g = file.getGroup(base + "/diagnostics");
        for (const auto& cname : diag_g.listObjectNames()) {
            double v = 0.0;
            diag_g.getDataSet(cname).read(v);
            out.diagnostics[cname] = v;
        }
    }
    return out;
}

}  // namespace bit_physics::common_cpp::capture
