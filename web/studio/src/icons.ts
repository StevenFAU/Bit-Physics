// One stroke icon set (00-foundation.md § 2.4), drawn for Field Studies on a
// 24-unit grid in the Lucide manner: 1.75 stroke, round caps and joins.
// Inline SVG, decorative (aria-hidden) — every control carries its own name.

const PATHS = {
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  step: '<path d="M6 5v14"/><path d="M10 5l9 7-9 7z"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>',
  save: '<path d="M7 4h10v16l-5-4-5 4z"/>',
  restore: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v5h5"/><path d="M12 8v4l3 2"/>',
  compare: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M12 3v18"/>',
  undo: '<path d="M9 15l-5-5 5-5"/><path d="M4 10h10a6 6 0 0 1 0 12h-3"/>',
  seed: '<path d="M12 3c4.2 5 6.2 8.2 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 11.2 7.8 8 12 3z"/>',
  erase: '<path d="M15.5 4.5l4 4L10 18H6l-2-2z"/><path d="M8.5 10l5.5 5.5"/><path d="M10 20h10"/>',
  chemistry:
    '<path d="M9 3h6"/><path d="M10 3v6.5L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9.5V3"/><path d="M7 15h10"/>',
  probe: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="1"/>',
  hand:
    '<path d="M8 12.5V5.8a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.2 10V4.4a1.6 1.6 0 0 1 3.2 0V11"/><path d="M14.4 10.5V6a1.6 1.6 0 0 1 3.2 0v6.5"/><path d="M17.6 9.5a1.6 1.6 0 0 1 3.2 0v3.2A8.3 8.3 0 0 1 12.5 21h-.9a7.5 7.5 0 0 1-6.3-3.5L3.6 14.8a1.6 1.6 0 0 1 2.7-1.7L8 15"/>',
  tune:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  learn: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M8 8h8M8 11.5h6"/>',
  prove: '<path d="M12 3l7.5 3v5.8c0 4.4-3.1 7.6-7.5 9.2-4.4-1.6-7.5-4.8-7.5-9.2V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>',
  share: '<path d="M12 15V3.5"/><path d="M7.5 8L12 3.5 16.5 8"/><path d="M5 13.5V20h14v-6.5"/>',
  back: '<path d="M14.5 6l-6 6 6 6"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  keyboard:
    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7 14h10"/>',
  camera: '<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>',
  record: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  dive: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/>',
  map: '<path d="M3.5 6.5l5-2.5 7 2.5 5-2.5v13.5l-5 2.5-7-2.5-5 2.5z"/><path d="M8.5 4v13.5M15.5 6.5V20"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.01"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 20): string {
  return (
    `<svg class="bp-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${PATHS[name]}</svg>`
  );
}
