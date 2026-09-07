export const scenes = [
  {
    id: "plateau",
    title: "Cut the Plateau",
    subtitle: "Follow water into the rock.",
    hint: "Open the river. Watch the pale caprock hold while softer layers wash downstream.",
  },
  {
    id: "heist",
    title: "River Heist",
    subtitle: "Give the river a different future.",
    hint: "Dig a shortcut across the inside bend, or build a berm to redirect the flow.",
  },
  {
    id: "breach",
    title: "Break the Dam",
    subtitle: "A small notch. A large consequence.",
    hint: "The embankment is loose sediment. Dig through its crest and follow the muddy pulse.",
  },
  {
    id: "shield",
    title: "Sediment Shield",
    subtitle: "The same rock, a different cover.",
    hint: "Loose cover protects the right branch. Compare incision with the bare left branch.",
  },
];
export function initial(n: number, scene: string): Float32Array {
  const s = new Float32Array(n * n * 16);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 16;
      const X = (x + 0.5) / n,
        Y = (y + 0.5) / n;
      let rock = 0,
        h = 0,
        a = 0,
        S = 0;
      if (scene === "lake") {
        rock = 0.2 + 1.1 * Math.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2) / 0.025);
        h = Math.max(1 - rock, 0);
      } else if (scene === "dam") {
        h = x < n / 2 ? 1 : 0;
        S = h * 0.01;
      } else if (scene === "settling") {
        h = 1;
        S = 0.01;
      } else if (scene === "channel") {
        h = 0.2;
        rock = 2;
      } else {
        const center = 0.5 + 0.105 * Math.sin(Y * 7.5) * Math.sin(Y * Math.PI);
        const distance = Math.abs(X - center);
        const channel = Math.exp(-((distance / 0.055) ** 2));
        const basin = 1 / (1 + Math.exp(-(Y - 0.77) * 35));
        const mesa = (1 - basin) * (2.7 + 1.1 * (1 - Y));
        const rim =
          0.025 *
          Math.sin(X * 32 + Y * 9) *
          Math.sin(Y * 27) *
          Math.min(distance * 8, 1);
        rock = 0.1 + mesa + rim - channel * (0.48 + 0.45 * Y);
        rock +=
          0.012 *
          Math.sin(X * 74 + Y * 41) *
          Math.sin(Y * 53 + X * 19) *
          Math.min(distance * 8, 1);
        // Shallow initial guide, not an animated morph target.
        a = 0.012 * (1 - basin);
        h = Math.max(0, 0.18 - distance * 4) * (1 - basin);
        if (Y < 0.12 && distance < 0.075)
          h = Math.max(h, 3.85 - (rock + a / 0.65));
        if (scene === "heist") {
          rock += 0.45 * Math.exp(-((X - 0.45) ** 2 + (Y - 0.48) ** 2) / 0.008);
        }
        if (scene === "breach") {
          const dam =
            Math.exp(-(((Y - 0.4) / 0.023) ** 2)) *
            Math.exp(-(((X - 0.58) / 0.11) ** 6));
          a += 0.65 * 1.0 * dam;
          if (Y > 0.12 && Y < 0.38) h = Math.max(h, 3.55 - (rock + a / 0.65));
        }
        if (scene === "shield") {
          a += X > 0.5 ? 0.12 : 0;
        }
      }
      s[i] = h;
      s[i + 3] = S;
      s[i + 4] = rock;
      s[i + 6] = a;
      s[i + 7] = 1;
    }
  return s;
}
