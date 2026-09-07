// Audusse hydrostatic reconstruction, HLL flux; original implementation.
struct Cell { water:vec4f, ground:vec4f, ledger:vec4f, aux:vec4f }
struct Face { flux:vec4f, correction:vec4f }
struct Params { n:u32, dx:f32, maxdt:f32, erosion:f32,
 settling:f32, friction:f32, boundary:u32, negative:u32,
 source:vec4f, brush:vec4f, action:vec4f }
struct Clock { wave:atomic<u32>, errors:atomic<u32>, time:f32, dt:f32 }
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var<storage,read> src:array<Cell>;
@group(0) @binding(2) var<storage,read_write> dst:array<Cell>;
@group(0) @binding(3) var<storage,read_write> faces:array<Face>;
@group(0) @binding(4) var<storage,read_write> clock:Clock;
const g=9.81; const dry=0.000001;
// Bounded residual ledgers: high part in exact 1/16 m buckets, low part
// below one bucket. Avoids relying on compiler preservation of Kahan algebra.
fn credit(c:ptr<function,Cell>,water:f32,solid:f32){
 let low=vec2f(water,solid)+(*c).aux.yz;
 let bucket=trunc(low*16.0)/16.0;
 (*c).aux.y=low.x-bucket.x;(*c).aux.z=low.y-bucket.y;
 (*c).ledger.x+=bucket.x;(*c).ledger.y+=bucket.y;
}
fn bed(c:Cell)->f32 {return c.ground.x-c.ground.y+c.ground.z/0.65;}
fn load(x:i32,y:i32)->Cell {return src[u32(clamp(y,0,i32(p.n)-1))*p.n+u32(clamp(x,0,i32(p.n)-1))];}
@compute @workgroup_size(1) fn reset(){ atomicStore(&clock.wave,0u); }
var<workgroup> waves:array<f32,64>;
@compute @workgroup_size(64) fn reduce(@builtin(global_invocation_id) id:vec3u,@builtin(local_invocation_index) lane:u32){
 var v=0.0;
 if(id.x<p.n*p.n){let w=src[id.x].water;v=(abs(w.y)+abs(w.z))/max(w.x,dry)+2.0*sqrt(g*max(w.x,0.0));}
 waves[lane]=v;workgroupBarrier();
 for(var stride=32u;stride>0u;stride/=2u){if(lane<stride){waves[lane]=max(waves[lane],waves[lane+stride]);}workgroupBarrier();}
 if(lane==0u){atomicMax(&clock.wave,bitcast<u32>(waves[0]));}
}
@compute @workgroup_size(1) fn timestep(){clock.dt=min(p.maxdt,0.4*p.dx/max(bitcast<f32>(atomicLoad(&clock.wave)),0.0001));clock.time+=clock.dt;}
fn hll(l:vec4f,r:vec4f)->vec4f {
 let ul=l.y/max(l.x,dry);let ur=r.y/max(r.x,dry);
 let sl=min(min(ul-sqrt(g*l.x),ur-sqrt(g*r.x)),0.0);
 let sr=max(max(ul+sqrt(g*l.x),ur+sqrt(g*r.x)),0.0);
 let fl=vec4f(l.y,l.y*ul+0.5*g*l.x*l.x,l.z*ul,l.w*ul);
 let fr=vec4f(r.y,r.y*ur+0.5*g*r.x*r.x,r.z*ur,r.w*ur);
 var f=(sr*fl-sl*fr+sl*sr*(r-l))/max(sr-sl,0.000000000001);
 f.w=f.x*select(r.w/max(r.x,dry),l.w/max(l.x,dry),f.x>=0.0);
 return f;
}
@compute @workgroup_size(64) fn fluxes(@builtin(global_invocation_id) id:vec3u){
 let count=p.n*(p.n+1u);if(id.x>=2u*count){return;}
 let axis=id.x/count;let k=id.x%count;
 var x=i32(k%(p.n+1u));var y=i32(k/(p.n+1u));
 if(axis==1u){x=i32(k%p.n);y=i32(k/p.n);}
 var l=load(x-i32(axis==0u),y-i32(axis==1u));var r=load(x,y);
 if(axis==0u){if(x==0){l.water.y=-r.water.y;}if(x==i32(p.n)){r.water.y=-l.water.y;}}
 else {if(y==0){l.water.z=-r.water.z;}if(y==i32(p.n)){r.water.z=select(-l.water.z,max(l.water.z,0.0),p.boundary==1u);}}
 let zl=bed(l);let zr=bed(r);let z=max(zl,zr);
 let hl=max(0.0,l.water.x+zl-z);let hr=max(0.0,r.water.x+zr-z);
 var ll=l.water*(hl/max(l.water.x,dry));var rr=r.water*(hr/max(r.water.x,dry));ll.x=hl;rr.x=hr;
 if(axis==1u){ll=ll.xzyw;rr=rr.xzyw;}
 var f=hll(ll,rr);if(axis==1u){f=f.xzyw;}
 faces[id.x]=Face(f,vec4f(0.5*g*(l.water.x*l.water.x-hl*hl),0.5*g*(r.water.x*r.water.x-hr*hr),0,0));
}
@compute @workgroup_size(8,8) fn advance(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=vec2u(p.n))){return;}
 let i=id.y*p.n+id.x;var c=src[i];let dt=clock.dt;let ratio=dt/p.dx;
 let left=faces[id.y*(p.n+1u)+id.x];let right=faces[id.y*(p.n+1u)+id.x+1u];
 let offset=p.n*(p.n+1u);let down=faces[offset+id.y*p.n+id.x];let up=faces[offset+(id.y+1u)*p.n+id.x];
 let change=-ratio*(right.flux-left.flux+up.flux-down.flux);
 c.water+=change;
 if(p.negative!=1u){c.water.y-=ratio*(right.correction.x-left.correction.y);c.water.z-=ratio*(up.correction.x-down.correction.y);}
 if(p.boundary==1u && id.y==p.n-1u){credit(&c,-ratio*up.flux.x,-ratio*up.flux.w);}
 if(c.water.x < -0.00001 || c.water.w < -0.00001){atomicOr(&clock.errors,1u);}
 c.water.x=max(0.0,c.water.x);c.water.w=max(0.0,c.water.w);
 let world=(vec2f(id.xy)+0.5)*p.dx;
 let sourceShape=exp(-dot(world-p.source.xy,world-p.source.xy)/(2.0*p.source.z*p.source.z));
 let add=dt*(p.source.w*sourceShape+c.aux.x);
 // Sum hydraulic increments with a residual; physical h stays in water.x.
 let dh=change.x+add-c.aux.w;let oldh=src[i].water.x;let nexth=oldh+dh;
 c.aux.w=(nexth-oldh)-dh;c.water.x=max(nexth,0.0);if(nexth<0.0){c.aux.w=0.0;}
 credit(&c,add,0.0);
 let h=c.water.x;var speed=length(c.water.yz)/max(h,dry);
 c.water.y*=1.0/(1.0+dt*p.friction*speed/max(h,dry));c.water.z*=1.0/(1.0+dt*p.friction*speed/max(h,dry));
 if(h<=dry){c.water.y=0;c.water.z=0;}
 speed=length(c.water.yz)/max(h,dry);let stress=1000.0*p.friction*speed*speed;
 let cover=exp(-c.ground.z/(0.65*0.08));let rock=c.ground.x-c.ground.y;
 let layer=rock-floor(rock/0.6)*0.6;let hard=select(1.0,0.12,layer>0.48);
 var ea=min(c.ground.z,p.erosion*0.002*max(stress-0.5,0.0)*(1.0-cover)*dt);
 var er=min(max(rock+0.5,0.0),p.erosion*0.0008*hard/max(c.ground.w,0.05)*max(stress-1.0,0.0)*cover*dt);
 // Stop at a geological interface; the next substep uses its material.
 er=min(er,max(0.0000005,select(layer,layer-0.48,layer>0.48)));
 let capacity=max(0.02*h-c.water.w,0.0);let scale=min(1.0,capacity/max(ea+er,1e-30));ea*=scale;er*=scale;
 let old=c.ground.y;c.ground.y+=er;er=c.ground.y-old;
 c.ground.z-=ea;if(p.negative!=2u){c.water.w+=ea+er;}c.ledger.z+=er;
 var deposit=c.water.w*(1.0-exp(-p.settling*dt/max(h,dry)));
 deposit=max(deposit,c.water.w-0.02*h);if(h<=dry){deposit=c.water.w;}
 c.water.w-=deposit;c.ground.z+=deposit;c.ledger.w+=deposit;
 if(any(c.water!=c.water) || any(abs(c.water)>vec4f(1e10))){atomicOr(&clock.errors,2u);}
 dst[i]=c;
}
@compute @workgroup_size(8,8) fn edit(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=vec2u(p.n))){return;}let i=id.y*p.n+id.x;var c=src[i];
 let world=(vec2f(id.xy)+0.5)*p.dx;let d=distance(world,p.brush.xy)/max(p.brush.z,p.dx);
 let amount=p.brush.w*max(0.0,1.0-d*d);let kind=u32(p.action.x);
 if(kind==1u){c.water.x+=amount;credit(&c,amount,0.0);}
 if(kind==2u){let a=min(c.ground.z,amount);c.ground.z-=a;let r=min(max(c.ground.x-c.ground.y+0.5,0.0),max(amount-a,0.0));let old=c.ground.y;c.ground.y+=r;credit(&c,0.0,-(a+c.ground.y-old));}
 if(kind==3u){c.ground.z+=amount;credit(&c,0.0,amount);}
 if(kind==4u && d<1.0){c.ground.w=mix(c.ground.w,p.action.y,clamp(amount,0.0,1.0));}
 if(kind==5u && d<1.0){c.aux.x=max(0.0,p.action.y)*(1.0-d*d);}
 dst[i]=c;
}
// Alluvium-only, symmetric donor-bounded pair exchange. Each cell owns four
// directed potential outflows, capped to one quarter of its grain inventory.
fn talusOut(a:Cell,b:Cell)->f32 {return min(a.ground.z*0.25,max(0.0,bed(a)-bed(b)-0.7*p.dx)*0.65*0.8*clock.dt);}
@compute @workgroup_size(8,8) fn talus(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=vec2u(p.n))){return;}let i=id.y*p.n+id.x;let a=src[i];var change=0.0;
 let offsets=array<vec2i,4>(vec2i(-1,0),vec2i(1,0),vec2i(0,-1),vec2i(0,1));
 for(var k=0u;k<4u;k++){let xy=vec2i(id.xy)+offsets[k];if(all(xy>=vec2i(0))&&all(xy<vec2i(i32(p.n)))){let b=load(xy.x,xy.y);change+=talusOut(b,a)-talusOut(a,b);}}
 var c=a;c.ground.z+=change;dst[i]=c;
}
struct Totals { a:vec4f,b:vec4f,c:vec4f }
@group(0) @binding(5) var<storage,read_write> totals:array<Totals>;
var<workgroup> sumA:array<vec4f,64>;
var<workgroup> sumB:array<vec4f,64>;
var<workgroup> sumC:array<vec4f,64>;
fn fold(lane:u32){
 workgroupBarrier();
 for(var stride=32u;stride>0u;stride/=2u){
  if(lane<stride){sumA[lane]+=sumA[lane+stride];let b=sumB[lane+stride];sumB[lane]=vec4f(sumB[lane].xyz+b.xyz,max(sumB[lane].w,b.w));let c=sumC[lane+stride];sumC[lane]=vec4f(min(sumC[lane].x,c.x),max(sumC[lane].y,c.y),0,0);}workgroupBarrier();
 }
}
@compute @workgroup_size(64) fn statistics(@builtin(global_invocation_id) id:vec3u,@builtin(local_invocation_index) lane:u32,@builtin(workgroup_id) group:vec3u){
 var a=vec4f(0);var b=vec4f(0);var c=vec4f(1e20,0,0,0);
 if(id.x<p.n*p.n){let s=src[id.x];let w=s.water;let m=s.ground;
  a=vec4f(w.x-s.aux.w-s.ledger.x-s.aux.y,-m.y+m.z+w.w-s.ledger.y-s.aux.z,m.y,s.ledger.w);
  b=vec4f(w.w,w.x,m.z,length(w.yz)/max(w.x,dry));
  c=vec4f(min(min(w.x,w.w),m.z),select(0.0,1.0,any(w!=w)||any(m!=m)||any(abs(w)>vec4f(1e10))),0,0);
 }
 sumA[lane]=a;sumB[lane]=b;sumC[lane]=c;fold(lane);
 if(lane==0u){totals[group.x+1u]=Totals(sumA[0],sumB[0],sumC[0]);}
}
@compute @workgroup_size(64) fn statisticsFinal(@builtin(local_invocation_index) lane:u32){
 var a=vec4f(0);var b=vec4f(0);var c=vec4f(1e20,0,0,0);
 for(var i=lane+1u;i<=(p.n*p.n+63u)/64u;i+=64u){let t=totals[i];a+=t.a;b=vec4f(b.xyz+t.b.xyz,max(b.w,t.b.w));c=vec4f(min(c.x,t.c.x),max(c.y,t.c.y),0,0);}
 sumA[lane]=a;sumB[lane]=b;sumC[lane]=c;fold(lane);
 if(lane==0u){totals[0]=Totals(sumA[0],sumB[0],sumC[0]);}
}
