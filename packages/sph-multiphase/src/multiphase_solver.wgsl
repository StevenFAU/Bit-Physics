// Two-fluid number-density SPH.  The shader mirrors the f64 primitives in
// sph_multiphase/reference: phase is stored in position.w, every particle has
// equal rest volume, and phase density enters only through particle mass.

const PI: f32 = 3.14159265358979323846;

struct LiveParams {
  n: u32, nx: u32, ny: u32, nz: u32,
  n_cells: u32, _flags: u32, cell_inv: f32, h: f32,
  origin: vec3<f32>, dt: f32,
  gravity: vec3<f32>, delta0: f32,
  box_min: vec3<f32>, volume0: f32,
  box_max: vec3<f32>, sigma: f32,
  rho: vec2<f32>, mu: vec2<f32>,
  obstacle: vec4<f32>,
  impulse_pos: vec4<f32>,
  impulse_vel: vec4<f32>,
  wetting: vec4<f32>, // cos(theta A/B), adhesion, Marangoni proxy
  safety: vec4<f32>,  // vmax, kappa clamp, interface threshold, wetting patch x
};

@group(0) @binding(0) var<uniform> L: LiveParams;
@group(0) @binding(1) var<storage, read_write> pos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> vel_out: array<vec4<f32>>;
// delta, alpha, neighbor count, compression residual
@group(0) @binding(4) var<storage, read_write> aux: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> kappa: array<f32>;
// normalized color gradient xyz, interface weight w
@group(0) @binding(6) var<storage, read_write> iface: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> pos_sorted: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read> sorted_idx: array<u32>;
@group(0) @binding(9) var<storage, read> cell_start: array<u32>;

fn f(q: f32) -> f32 {
  if (q < 1.0) { return 1.0 - 1.5*q*q + 0.75*q*q*q; }
  if (q < 2.0) { let d=2.0-q; return 0.25*d*d*d; }
  return 0.0;
}
fn fp(q: f32) -> f32 {
  if (q < 1.0) { return -3.0*q + 2.25*q*q; }
  if (q < 2.0) { let d=2.0-q; return -0.75*d*d; }
  return 0.0;
}
fn W(r: f32) -> f32 { return (1.0/PI)/(L.h*L.h*L.h)*f(r/L.h); }
fn gradW(r: vec3<f32>) -> vec3<f32> {
  let d=length(r); if (d <= 1e-9) { return vec3<f32>(0.0); }
  return (1.0/PI)/(L.h*L.h*L.h*L.h)*fp(d/L.h)*r/d;
}
fn phase_of(i: u32) -> u32 { return select(0u, 1u, pos[i].w > 0.5); }
fn density_of(i: u32) -> f32 { return select(L.rho.x, L.rho.y, phase_of(i)==1u); }
fn mass_of(i: u32) -> f32 { return density_of(i)*L.volume0; }
fn mu_of(i: u32) -> f32 { return select(L.mu.x, L.mu.y, phase_of(i)==1u); }
fn harmonic(a:f32,b:f32)->f32 { return select(0.0,2.0*a*b/max(a+b,1e-12),a>0.0&&b>0.0); }
fn cell_coord(p:vec3<f32>)->vec3<i32>{return clamp(vec3<i32>(floor((p-L.origin)*L.cell_inv)),vec3<i32>(0),vec3<i32>(i32(L.nx)-1,i32(L.ny)-1,i32(L.nz)-1));}
fn cell_id(c:vec3<i32>)->u32{return u32(c.x)+L.nx*(u32(c.y)+L.ny*u32(c.z));}

@compute @workgroup_size(64)
fn mp_density_alpha(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x; if(i>=L.n){return;} let xi=pos[i].xyz; let mi=mass_of(i);
  var delta=W(0.0); var sumg=vec3<f32>(0.0); var sumg2=0.0; var nc=0.0;
  let c=cell_coord(xi);
  for(var z=max(c.z-1,0);z<=min(c.z+1,i32(L.nz)-1);z++){
    for(var y=max(c.y-1,0);y<=min(c.y+1,i32(L.ny)-1);y++){
      let s=cell_start[cell_id(vec3<i32>(max(c.x-1,0),y,z))];
      let e=cell_start[cell_id(vec3<i32>(min(c.x+1,i32(L.nx)-1),y,z))+1u];
      for(var slot=s;slot<e;slot++){
        let j=sorted_idx[slot]; if(j==i){continue;} let r=xi-pos_sorted[slot].xyz; let d=length(r);
        if(d<2.0*L.h){ delta+=W(d); let g=gradW(r); sumg+=g/mi; sumg2+=dot(g/mass_of(j),g/mass_of(j)); nc+=1.0; }
      }
    }
  }
  let den=max(dot(sumg,sumg)+sumg2,1e-12);
  aux[i]=vec4<f32>(delta,1.0/den,nc,0.0);
}

@compute @workgroup_size(64)
fn mp_interface(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x; if(i>=L.n){return;} let xi=pos[i].xyz; let ci=pos[i].w; var g=vec3<f32>(0.0);
  let c=cell_coord(xi);
  for(var z=max(c.z-1,0);z<=min(c.z+1,i32(L.nz)-1);z++){
    for(var y=max(c.y-1,0);y<=min(c.y+1,i32(L.ny)-1);y++){
      let s=cell_start[cell_id(vec3<i32>(max(c.x-1,0),y,z))]; let e=cell_start[cell_id(vec3<i32>(min(c.x+1,i32(L.nx)-1),y,z))+1u];
      for(var slot=s;slot<e;slot++){let j=sorted_idx[slot];if(j==i){continue;}let r=xi-pos_sorted[slot].xyz;if(dot(r,r)<4.0*L.h*L.h){g+=(pos[j].w-ci)*gradW(r)/max(aux[j].x,1e-9);}}
    }
  }
  let m=length(g); iface[i]=vec4<f32>(select(vec3<f32>(0.0),g/m,m>1e-8),m);
}

fn cohesion(r:f32)->f32{
  let H=2.0*L.h;if(r<=0.0||r>H){return 0.0;}let base=(H-r)*(H-r)*(H-r)*r*r*r;let scale=32.0/(PI*pow(H,9.0));
  if(r<=0.5*H){return scale*(2.0*base-pow(H,6.0)/64.0);}return scale*base;
}

@compute @workgroup_size(64)
fn mp_forces(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x;if(i>=L.n){return;}let xi=pos[i].xyz;let vi=vel[i].xyz;let mi=mass_of(i);let mui=mu_of(i);
  var a=L.gravity;var dv=vec3<f32>(0.0);var curv=0.0;var coh=vec3<f32>(0.0);let c=cell_coord(xi);
  for(var z=max(c.z-1,0);z<=min(c.z+1,i32(L.nz)-1);z++){
    for(var y=max(c.y-1,0);y<=min(c.y+1,i32(L.ny)-1);y++){
      let s=cell_start[cell_id(vec3<i32>(max(c.x-1,0),y,z))];let e=cell_start[cell_id(vec3<i32>(min(c.x+1,i32(L.nx)-1),y,z))+1u];
      for(var slot=s;slot<e;slot++){
        let j=sorted_idx[slot];if(j==i){continue;}let r=xi-pos_sorted[slot].xyz;let r2=dot(r,r);if(r2>=4.0*L.h*L.h||r2<=1e-12){continue;}
        let gj=gradW(r);let muj=mu_of(j);let muij=harmonic(mui,muj);let volj=1.0/max(aux[j].x,1e-9);
        dv+=(-2.0*muij*volj/max(density_of(i),1e-9))*dot(r,gj)/(r2+0.01*L.h*L.h)*(vel[j].xyz-vi);
        if(phase_of(i)!=phase_of(j)){
          curv+=volj*dot(iface[i].xyz-iface[j].xyz,gj);
          coh+=-L.sigma*L.volume0*volj*cohesion(sqrt(r2))*r/sqrt(r2)/mi;
        }
      }
    }
  }
  if(iface[i].w>L.safety.z){a+=-L.sigma*curv*iface[i].xyz/max(density_of(i),1e-9)*iface[i].w+coh; a+=L.wetting.w*iface[i].w*vec3<f32>(1.0,0.0,0.0)/max(density_of(i),1.0);}
  a+=dv;
  if(xi.z<L.box_min.z+2.0*L.h){let wet_target=select(L.wetting.x,L.wetting.y,phase_of(i)==1u);let dx=(xi.x-L.safety.w)/0.18;let wet=wet_target*exp(-dx*dx);a.z+=L.wetting.z*wet*(1.0-(xi.z-L.box_min.z)/(2.0*L.h));}
  var outv=vi+L.dt*a;
  if(L.impulse_pos.w>0.0){let d=xi-L.impulse_pos.xyz;let q=length(d)/L.impulse_pos.w;if(q<1.0){outv+=L.impulse_vel.xyz*pow(1.0-q,max(L.impulse_vel.w,1.0));}}
  vel_out[i]=vec4<f32>(outv,vel[i].w);
}

@compute @workgroup_size(64)
fn mp_predict(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x;if(i>=L.n){return;}let xi=pos[i].xyz;let vi=vel_out[i].xyz;var rate=0.0;let c=cell_coord(xi);
  for(var z=max(c.z-1,0);z<=min(c.z+1,i32(L.nz)-1);z++){
    for(var y=max(c.y-1,0);y<=min(c.y+1,i32(L.ny)-1);y++){
      let s=cell_start[cell_id(vec3<i32>(max(c.x-1,0),y,z))];let e=cell_start[cell_id(vec3<i32>(min(c.x+1,i32(L.nx)-1),y,z))+1u];
      for(var slot=s;slot<e;slot++){let j=sorted_idx[slot];if(j==i){continue;}let r=xi-pos_sorted[slot].xyz;if(dot(r,r)<4.0*L.h*L.h){rate+=dot(vi-vel_out[j].xyz,gradW(r));}}
    }
  }
  let err=max(aux[i].x+L.dt*rate-L.delta0,0.0);kappa[i]=clamp(err*aux[i].y/(L.dt*L.dt),0.0,L.safety.y);aux[i].w=err/max(L.delta0,1e-9);
}

@compute @workgroup_size(64)
fn mp_apply_pressure(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x;if(i>=L.n){return;}let xi=pos[i].xyz;let mi=mass_of(i);var impulse=vec3<f32>(0.0);let c=cell_coord(xi);
  for(var z=max(c.z-1,0);z<=min(c.z+1,i32(L.nz)-1);z++){
    for(var y=max(c.y-1,0);y<=min(c.y+1,i32(L.ny)-1);y++){
      let s=cell_start[cell_id(vec3<i32>(max(c.x-1,0),y,z))];let e=cell_start[cell_id(vec3<i32>(min(c.x+1,i32(L.nx)-1),y,z))+1u];
      for(var slot=s;slot<e;slot++){let j=sorted_idx[slot];if(j==i){continue;}let r=xi-pos_sorted[slot].xyz;if(dot(r,r)<4.0*L.h*L.h){impulse+=-0.5*(kappa[i]+kappa[j])*gradW(r)/mi;}}
    }
  }
  vel_out[i]=vec4<f32>(vel_out[i].xyz+L.dt*impulse,vel_out[i].w);
}

@compute @workgroup_size(64)
fn mp_integrate(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x;if(i>=L.n){return;}var v=vel_out[i].xyz;let speed=length(v);if(speed>L.safety.x){v*=L.safety.x/speed;}var p=pos[i].xyz+L.dt*v;let eps=1e-4;
  for(var axis=0;axis<3;axis++){if(p[axis]<L.box_min[axis]+eps){p[axis]=L.box_min[axis]+eps;if(v[axis]<0.0){v[axis]*=-0.05;}}if(p[axis]>L.box_max[axis]-eps){p[axis]=L.box_max[axis]-eps;if(v[axis]>0.0){v[axis]*=-0.05;}}}
  if(L.obstacle.w>0.0){let d=p-L.obstacle.xyz;let dist=length(d);if(dist<L.obstacle.w&&dist>0.0){let n=d/dist;p=L.obstacle.xyz+n*L.obstacle.w;let vn=dot(v,n);if(vn<0.0){v-=1.05*vn*n;}}}
  pos[i]=vec4<f32>(p,pos[i].w);vel_out[i]=vec4<f32>(v,vel_out[i].w);
}
