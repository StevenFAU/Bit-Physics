// A tiny WGSL `#import` preprocessor (00-foundation.md § 7.2).
//
// Shared shader code (hash, colormaps, tone maps, fullscreen triangle) is
// registered once under a name; a shader source pulls it in with a line of
// the form
//
//     #import bp/hash
//
// Imports resolve recursively, each module is emitted once (first use wins
// the position, dependencies before dependants), and an unknown name is an
// error at pipeline-build time rather than a confusing WGSL parse failure.
// Gated kernels never go through this: they are shipped byte-for-byte.

const registry = new Map<string, string>();

const IMPORT = /^[ \t]*#import[ \t]+["<]?([A-Za-z0-9_\-./]+)[">]?[ \t]*;?[ \t]*$/gm;

export function defineWgsl(name: string, code: string): void {
  const prev = registry.get(name);
  if (prev !== undefined && prev !== code) {
    throw new Error(`WGSL module "${name}" registered twice with different code`);
  }
  registry.set(name, code);
}

export function hasWgsl(name: string): boolean {
  return registry.has(name);
}

/**
 * Expand `#import` lines. `local` modules shadow the global registry for this
 * call only (handy for per-sim snippets).
 */
export function wgsl(source: string, local: Readonly<Record<string, string>> = {}): string {
  const emitted = new Set<string>();
  const stack: string[] = [];
  const lookup = (name: string): string => {
    const code = local[name] ?? registry.get(name);
    if (code === undefined) throw new Error(`WGSL #import of unknown module "${name}"`);
    return code;
  };
  const expand = (src: string): string =>
    src.replace(IMPORT, (_line, name: string) => {
      if (emitted.has(name)) return `// #import ${name} (already included)`;
      if (stack.includes(name)) throw new Error(`WGSL #import cycle: ${[...stack, name].join(" → ")}`);
      stack.push(name);
      const body = expand(lookup(name));
      stack.pop();
      emitted.add(name);
      return `// ---- begin #import ${name}\n${body}\n// ---- end #import ${name}`;
    });
  return expand(source);
}
