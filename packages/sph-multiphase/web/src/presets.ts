import type { LiveConfig } from "./solver.js";

export type Region =
  | { kind: "box"; phase: 0 | 1; min: [number, number, number]; max: [number, number, number] }
  | { kind: "sphere"; phase: 0 | 1; center: [number, number, number]; radius: number };

export interface ScenePreset {
  id: string;
  label: string;
  title: string;
  regions: Region[];
  gravity: [number, number, number];
  densityRatio: number;
  viscosityRatio: number;
  sigma: number;
  contactAngle: [number, number];
  camera?: { theta: number; phi: number; dist: number; target: [number, number, number] };
  obstacle?: [number, number, number, number];
  stir?: number;
  experimentalMarangoni?: number;
}

const bath = (height = 0.78): Region => ({ kind: "box", phase: 0, min: [0.03, 0.03, 0.03], max: [0.97, 0.97, height] });
const drop = (center: [number, number, number], radius: number): Region => ({ kind: "sphere", phase: 1, center, radius });

export const PRESETS: ScenePreset[] = [
  { id: "emulsion-storm", label: "emulsion storm", title: "Signature scene: a dense droplet field is conducted through a transparent bath.", regions: [bath(0.82), ...[[.25,.25,.28],[.48,.3,.55],[.72,.28,.32],[.3,.7,.55],[.67,.7,.57],[.5,.52,.27]].map((c,i)=>drop(c as [number,number,number], .09 + (i%3)*.012))], gravity: [0,0,-3.8], densityRatio: .82, viscosityRatio: 2.5, sigma: .055, contactAngle: [70,115], stir: 1.1 },
  { id: "laplace-lens", label: "Laplace lens", title: "A density-matched static sphere: pressure jump should scale as 2 sigma / R.", regions: [bath(.92), drop([.5,.5,.5],.19)], gravity: [0,0,0], densityRatio: 1, viscosityRatio: 1, sigma: .075, contactAngle: [90,90] },
  { id: "ringing-drop", label: "ringing drop", title: "A capillary droplet relaxes in zero gravity; frequency and damping are the observables.", regions: [bath(.92), {kind:"box",phase:1,min:[.31,.4,.36],max:[.69,.6,.64]}], gravity:[0,0,0], densityRatio:1, viscosityRatio:.45, sigma:.09, contactAngle:[90,90] },
  { id: "capillary-keyboard", label: "capillary keyboard", title: "Droplets of several radii reveal the R^(3/2) capillary timescale.", regions:[bath(.84),drop([.2,.5,.35],.07),drop([.4,.5,.38],.1),drop([.66,.5,.43],.14)], gravity:[0,0,0], densityRatio:1, viscosityRatio:1, sigma:.08, contactAngle:[90,90] },
  { id:"oil-over-water",label:"oil over water",title:"A light viscous phase rises and stratifies above the dense bath.",regions:[bath(.7),drop([.35,.5,.2],.13),drop([.65,.5,.3],.1)],gravity:[0,0,-9.81],densityRatio:.72,viscosityRatio:4,sigma:.045,contactAngle:[85,105]},
  { id:"rayleigh-taylor",label:"Rayleigh–Taylor",title:"Dense phase above light phase: buoyancy grows the interface perturbation.",regions:[{kind:"box",phase:0,min:[.03,.03,.03],max:[.97,.97,.48]},{kind:"box",phase:1,min:[.03,.03,.48],max:[.97,.97,.92]},drop([.5,.5,.46],.08)],gravity:[0,0,-5],densityRatio:1.8,viscosityRatio:1,sigma:.02,contactAngle:[90,90]},
  { id:"rising-analogue",label:"rising bubble analogue",title:"A light liquid droplet rises through a heavier immiscible bath.",regions:[bath(.9),drop([.5,.5,.22],.14)],gravity:[0,0,-7],densityRatio:.32,viscosityRatio:.55,sigma:.055,contactAngle:[90,90]},
  { id:"taylor-cell",label:"Taylor shear cell",title:"Stir across a drop and compare deformation with the low-Ca Taylor slope.",regions:[bath(.88),drop([.5,.5,.48],.17)],gravity:[0,0,0],densityRatio:1,viscosityRatio:1.6,sigma:.065,contactAngle:[90,90],stir:1.4},
  { id:"wetting-atlas",label:"wetting atlas",title:"Five droplets meet differently wetting wall zones; the control reports equilibrium targets.",regions:[{kind:"box",phase:0,min:[.03,.03,.03],max:[.97,.97,.18]},drop([.16,.5,.2],.095),drop([.33,.5,.2],.095),drop([.5,.5,.2],.095),drop([.67,.5,.2],.095),drop([.84,.5,.2],.095)],gravity:[0,0,-5],densityRatio:1,viscosityRatio:1,sigma:.075,contactAngle:[30,150]},
  { id:"capillary-maze",label:"capillary maze",title:"A wetting contrast and obstacle turn the tank into a capillary instrument.",regions:[{kind:"box",phase:0,min:[.03,.03,.03],max:[.97,.97,.22]},drop([.25,.5,.35],.11),drop([.72,.5,.35],.11)],gravity:[0,0,-4],densityRatio:1.1,viscosityRatio:2,sigma:.09,contactAngle:[35,140],obstacle:[.5,.5,.32,.13]},
  { id:"t-junction",label:"T-junction",title:"Inject phase B while stirring phase A to explore pinch-off regimes.",regions:[bath(.45),{kind:"box",phase:1,min:[.45,.03,.22],max:[.55,.32,.36]}],gravity:[0,0,-3],densityRatio:.9,viscosityRatio:1.4,sigma:.052,contactAngle:[75,105],stir:.8},
  { id:"coalescence",label:"coalescence lab",title:"Two equal droplets collide; speed, viscosity and tension decide their fate.",regions:[bath(.9),drop([.32,.5,.5],.13),drop([.68,.5,.5],.13)],gravity:[0,0,0],densityRatio:1,viscosityRatio:.7,sigma:.07,contactAngle:[90,90],stir:1},
  { id:"zero-g-marbles",label:"zero-g marbles",title:"Colored liquid marbles seek lower interfacial area in microgravity.",regions:[bath(.92),drop([.32,.38,.48],.13),drop([.62,.42,.52],.16),drop([.48,.68,.4],.1)],gravity:[0,0,0],densityRatio:1.4,viscosityRatio:2.2,sigma:.11,contactAngle:[90,90]},
  { id:"marangoni-painter",label:"Marangoni painter",title:"Experimental sigma-gradient proxy pulls interface particles along +x.",regions:[bath(.88),drop([.42,.5,.47],.17)],gravity:[0,0,0],densityRatio:1,viscosityRatio:1,sigma:.06,contactAngle:[90,90],experimentalMarangoni:18},
  { id:"gate-scene",label:"the gate scene",title:"Small deterministic two-phase lens used by the browser run-twice gate.",regions:[bath(.72),drop([.5,.5,.42],.16)],gravity:[0,0,0],densityRatio:.8,viscosityRatio:2,sigma:.05,contactAngle:[90,90]},
];

function points(region: Region, spacing: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const lo = region.kind === "box" ? region.min : [region.center[0]-region.radius,region.center[1]-region.radius,region.center[2]-region.radius];
  const hi = region.kind === "box" ? region.max : [region.center[0]+region.radius,region.center[1]+region.radius,region.center[2]+region.radius];
  for(let x=lo[0]+spacing/2;x<hi[0];x+=spacing) for(let y=lo[1]+spacing/2;y<hi[1];y+=spacing) for(let z=lo[2]+spacing/2;z<hi[2];z+=spacing){
    if(region.kind === "sphere" && (x-region.center[0])**2+(y-region.center[1])**2+(z-region.center[2])**2>region.radius**2) continue;
    out.push([x,y,z]);
  }
  return out;
}

export function seedScene(preset: ScenePreset, target: number): { positions: Float32Array; phases: Uint32Array; spacing: number; h: number } {
  let volume = 0;
  for (const r of preset.regions) volume += r.kind === "box" ? (r.max[0]-r.min[0])*(r.max[1]-r.min[1])*(r.max[2]-r.min[2]) : 4*Math.PI*r.radius**3/3;
  const spacing = Math.cbrt(volume / Math.max(target, 1));
  const cells = new Map<string, { p: [number,number,number]; phase: 0|1 }>();
  for (const r of preset.regions) for (const p of points(r, spacing)) cells.set(`${Math.round(p[0]/spacing)},${Math.round(p[1]/spacing)},${Math.round(p[2]/spacing)}`, { p, phase: r.phase });
  const positions = new Float32Array(cells.size * 3); const phases = new Uint32Array(cells.size); let i=0;
  for (const v of cells.values()) { positions.set(v.p,3*i); phases[i]=v.phase; i+=1; }
  return { positions, phases, spacing, h: 1.2 * spacing };
}

export function liveConfigFor(preset: ScenePreset, seeded: { spacing:number; h:number }, pressureIters=5): LiveConfig & { activeLimiter: string } {
  const rhoA=1000, rhoB=rhoA*preset.densityRatio, muA=.06, muB=muA*preset.viscosityRatio;
  const cap=.4*Math.sqrt((rhoA+rhoB)*seeded.spacing**3/(4*Math.PI*Math.max(preset.sigma,1e-9)));
  const cfl=.35*seeded.h/5; const visc=.125*seeded.h**2/Math.max(muA/rhoA,muB/rhoB); const candidates={capillary:cap,CFL:cfl,viscosity:visc,maximum:.003};
  const activeLimiter=Object.entries(candidates).sort((a,b)=>a[1]-b[1])[0][0]; const dt=Math.max(0.00025,Math.min(...Object.values(candidates)));
  const cell=2*seeded.h; const grid: LiveConfig["grid"]={origin:[-cell,-cell,-cell],dims:[Math.ceil((1+2*cell)/cell),Math.ceil((1+2*cell)/cell),Math.ceil((1+2*cell)/cell)],cell};
  // Discrete rest-number-density calibration for an infinite cubic lattice at
  // the active h/dx. This removes the startup pressure pop without involving
  // either phase mass.
  let latticeSum=0;const norm=1/Math.PI/seeded.h**3;
  for(let ix=-3;ix<=3;ix++)for(let iy=-3;iy<=3;iy++)for(let iz=-3;iz<=3;iz++){
    const q=Math.hypot(ix,iy,iz)*seeded.spacing/seeded.h;let f=0;if(q<1)f=1-1.5*q*q+.75*q*q*q;else if(q<2)f=.25*(2-q)**3;latticeSum+=norm*f;
  }
  return { n:0,h:seeded.h,spacing:seeded.spacing,grid,dt,delta0:latticeSum,density:[rhoA,rhoB],viscosity:[muA,muB],sigma:preset.sigma,gravity:[...preset.gravity],boxMin:[0,0,0],boxMax:[1,1,1],contactAngle:[...preset.contactAngle],wettingCenter:.5,adhesion:6,marangoni:preset.experimentalMarangoni??0,vmax:.7*2*seeded.h/dt,kappaClamp:2e3,interfaceThreshold:.03,pressureIters,activeLimiter };
}

export function dropletStamp(center:[number,number,number], radius:number, spacing:number):Float32Array{
  const r:Region={kind:"sphere",phase:1,center,radius}; return new Float32Array(points(r,spacing).flat());
}
