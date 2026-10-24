// Connect the Cities (02-physarum.md § Scenes): a stylised Kantō plain after
// Tero et al. 2010, who grew Physarum from Tokyo across a map of 36 food
// sources at the cities of the Tokyo area, in an arena bounded by the coast.
//
// This is not their layout: the cities below are approximate positions of 30
// real cities (longitude, latitude to ~0.01°), and the coastline is a coarse
// polygon — Tokyo Bay, the Bōsō and Miura peninsulas, Sagami Bay, the Pacific
// coast to Hitachi. The sea is wall. Distances are measured on the dish.

import type { Spot } from "./model/sim.js";

export interface City {
  name: string;
  lon: number;
  lat: number;
}

export const CITIES: readonly City[] = [
  { name: "Tokyo", lon: 139.76, lat: 35.68 },
  { name: "Yokohama", lon: 139.6, lat: 35.47 },
  { name: "Kawasaki", lon: 139.66, lat: 35.55 },
  { name: "Saitama", lon: 139.65, lat: 35.86 },
  { name: "Chiba", lon: 140.14, lat: 35.62 },
  { name: "Funabashi", lon: 139.99, lat: 35.72 },
  { name: "Hachiōji", lon: 139.32, lat: 35.66 },
  { name: "Sagamihara", lon: 139.37, lat: 35.57 },
  { name: "Yokosuka", lon: 139.65, lat: 35.29 },
  { name: "Fujisawa", lon: 139.49, lat: 35.36 },
  { name: "Hiratsuka", lon: 139.35, lat: 35.35 },
  { name: "Odawara", lon: 139.16, lat: 35.27 },
  { name: "Atsugi", lon: 139.36, lat: 35.44 },
  { name: "Tokorozawa", lon: 139.47, lat: 35.8 },
  { name: "Kawagoe", lon: 139.49, lat: 35.93 },
  { name: "Kumagaya", lon: 139.39, lat: 36.15 },
  { name: "Ōme", lon: 139.28, lat: 35.79 },
  { name: "Kashiwa", lon: 139.98, lat: 35.87 },
  { name: "Narita", lon: 140.32, lat: 35.78 },
  { name: "Tsukuba", lon: 140.11, lat: 36.08 },
  { name: "Mito", lon: 140.47, lat: 36.37 },
  { name: "Utsunomiya", lon: 139.88, lat: 36.56 },
  { name: "Maebashi", lon: 139.06, lat: 36.39 },
  { name: "Oyama", lon: 139.8, lat: 36.31 },
  { name: "Kisarazu", lon: 139.95, lat: 35.38 },
  { name: "Chōshi", lon: 140.8, lat: 35.73 },
  { name: "Mobara", lon: 140.29, lat: 35.43 },
  { name: "Tateyama", lon: 139.89, lat: 35.01 },
  { name: "Chichibu", lon: 139.09, lat: 35.99 },
  { name: "Kashima", lon: 140.6, lat: 35.97 },
];

/** The arena: land inside this polygon (lon, lat), clockwise from the north-west corner; the rest is sea or off the map. */
export const LAND: readonly [number, number][] = [
  [138.95, 36.65],
  [140.66, 36.65],
  [140.62, 36.45],
  [140.6, 36.3],
  [140.66, 36.12],
  [140.72, 35.95],
  [140.88, 35.72],
  [140.62, 35.55],
  [140.44, 35.36],
  [140.33, 35.15],
  [140.1, 35.09],
  [139.88, 34.9],
  [139.82, 34.98],
  [139.8, 35.25],
  [139.88, 35.36],
  [139.95, 35.45],
  [140.07, 35.57],
  [139.98, 35.66],
  [139.9, 35.65],
  [139.79, 35.63],
  [139.77, 35.55],
  [139.72, 35.5],
  [139.66, 35.44],
  [139.68, 35.28],
  [139.74, 35.24],
  [139.62, 35.13],
  [139.57, 35.27],
  [139.53, 35.3],
  [139.47, 35.31],
  [139.4, 35.32],
  [139.3, 35.3],
  [139.16, 35.23],
  [139.13, 35.15],
  [139.07, 35.1],
  [139.1, 34.9],
  [139.08, 34.85],
  [138.95, 34.85],
];

const LON0 = 138.95;
const LAT1 = 36.65;
const MAP_W = (140.95 - LON0) * Math.cos((35.75 * Math.PI) / 180);
const MAP_H = LAT1 - 34.85;

/** Lon/lat → dish cells: the map fitted to 96% of the dish's height (or width), centred. */
export function projector(w: number, h: number): (lon: number, lat: number) => [number, number] {
  const s = Math.min((w * 0.96) / MAP_W, (h * 0.96) / MAP_H);
  const ox = (w - MAP_W * s) / 2;
  const oy = (h - MAP_H * s) / 2;
  const k = Math.cos((35.75 * Math.PI) / 180);
  return (lon, lat) => [ox + (lon - LON0) * k * s, oy + (LAT1 - lat) * s];
}

/** Cells per kilometre on a w × h dish (1° of latitude ≈ 111 km). */
export function cellsPerKm(w: number, h: number): number {
  return Math.min((w * 0.96) / MAP_W, (h * 0.96) / MAP_H) / 111.2;
}

/**
 * Fill a polygon (dish cells) into a bit mask, or clear it: scanline at each
 * row's cell centres, even–odd. `set` true marks the inside as wall.
 */
export function fillPolygon(bits: Uint32Array, w: number, h: number, poly: readonly [number, number][], inside: boolean): void {
  const xs: number[] = [];
  for (let y = 0; y < h; y += 1) {
    const cy = y + 0.5;
    xs.length = 0;
    for (let k = 0; k < poly.length; k += 1) {
      const [x0, y0] = poly[k]!;
      const [x1, y1] = poly[(k + 1) % poly.length]!;
      if (y0 <= cy === y1 <= cy) continue;
      xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k]! - 0.5));
      const b = Math.min(w - 1, Math.floor(xs[k + 1]! - 0.5));
      for (let x = a; x <= b; x += 1) {
        const c = y * w + x;
        if (inside) bits[c >> 5]! |= 1 << (c & 31);
        else bits[c >> 5]! &= ~(1 << (c & 31));
      }
    }
  }
}

/** The arena's walls on a w × h dish: everything but the land. */
export function kantoWalls(w: number, h: number): Uint32Array {
  const bits = new Uint32Array(Math.ceil((w * h) / 32)).fill(0xffffffff);
  const proj = projector(w, h);
  fillPolygon(
    bits,
    w,
    h,
    LAND.map(([lon, lat]) => proj(lon, lat)),
    false,
  );
  return bits;
}

/** The cities as food crumbs on a w × h dish. */
export function kantoFood(w: number, h: number, r: number): Spot[] {
  const proj = projector(w, h);
  return CITIES.map((c) => {
    const [x, y] = proj(c.lon, c.lat);
    return { x, y, r };
  });
}

export const isWall = (bits: Uint32Array | null, w: number, x: number, y: number): boolean => {
  if (!bits) return false;
  const c = Math.floor(y) * w + Math.floor(x);
  return (bits[c >> 5]! & (1 << (c & 31))) !== 0;
};
