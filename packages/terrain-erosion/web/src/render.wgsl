struct Cell { water:vec4f, ground:vec4f, ledger:vec4f, aux:vec4f }
struct View { matrix:mat4x4f, eye:vec4f, info:vec4f, brush:vec4f, options:vec4f }
@group(0) @binding(0) var<uniform> v:View;
@group(0) @binding(1) var<storage,read> state:array<Cell>;
@group(0) @binding(2) var<storage,read> viewClock:array<f32>;
struct Vertex { @builtin(position) clip:vec4f,@location(0) world:vec3f,@location(1) normal:vec3f,@location(2) data:vec4f,@location(3) change:vec4f }
fn cell(x:i32,y:i32)->Cell{let n=i32(v.info.x);return state[u32(clamp(y,0,n-1)*n+clamp(x,0,n-1))];}
fn height(c:Cell)->f32{return c.ground.x-c.ground.y+c.ground.z/0.65;}
fn surface(x:i32,y:i32,water:bool)->f32{let c=cell(x,y);return height(c)+select(0.0,max(c.water.x,0.003),water);}
fn vertex(id:u32,water:bool)->Vertex {
 let n=u32(v.info.x);var x=i32(id%n);var y=i32(id/n);let skirt=id>=n*n;var side=0u;var bottom=false;
 if(skirt){let k=(id-n*n)/2u;side=k/n;let t=i32(k%n);bottom=(id-n*n)%2u==1u;
  if(side==0u){x=0;y=t;}if(side==1u){x=i32(n)-1;y=t;}if(side==2u){x=t;y=0;}if(side==3u){x=t;y=i32(n)-1;}}
 let c=cell(x,y);let dx=v.info.y;
 let pos=vec3f((f32(x)+0.5)*dx-16.0,select(surface(x,y,water),-0.6,bottom),(f32(y)+0.5)*dx-16.0);
 var normal=normalize(vec3f(surface(x-1,y,water)-surface(x+1,y,water),2.0*dx,surface(x,y-1,water)-surface(x,y+1,water)));
 if(skirt){let normals=array<vec3f,4>(vec3f(-1,0,0),vec3f(1,0,0),vec3f(0,0,-1),vec3f(0,0,1));normal=normals[side];}
 var out:Vertex;out.world=pos;out.clip=v.matrix*vec4f(pos,1);out.normal=normal;out.data=c.water;out.change=vec4f(c.ground.y,c.ground.z,c.ground.w,c.ledger.w);return out;
}
@vertex fn terrainVertex(@builtin(vertex_index) id:u32)->Vertex{return vertex(id,false);}
@vertex fn waterVertex(@builtin(vertex_index) id:u32)->Vertex{return vertex(id,true);}
fn strata(h:f32)->vec3f{
 let t=fract(h/0.6);let aa=max(fwidth(h)*1.5,0.008);
 let hard=smoothstep(0.48-aa,0.48+aa,t);
 let red=vec3f(0.49,0.265,0.16);let pale=vec3f(0.70,0.53,0.35);
 var col=mix(red,pale,hard);
 col=mix(col,vec3f(0.64,0.40,0.25),0.3+0.25*sin(h*14.0));
 return col;
}
fn shade(color:vec3f,normal:vec3f,pos:vec3f)->vec3f{
 let light=normalize(vec3f(-0.5,0.85,-0.45));let diffuse=max(dot(normal,light),0.0);
 let sky=0.36+0.18*normal.y;let distance=length(v.eye.xyz-pos);
 return mix(color*(sky+0.75*diffuse),vec3f(0.10,0.15,0.17),1.0-exp(-distance*0.003));
}
@fragment fn terrainFragment(in:Vertex)->@location(0) vec4f {
 let n=normalize(in.normal);var color=strata(in.world.y);
 let grain=0.97+0.03*sin(in.world.x*65.0+sin(in.world.z*42.0))*sin(in.world.z*55.0);
 color=mix(color,vec3f(.57,.40,.26),smoothstep(.91,.995,n.y)*.7);
 color*=grain;
 color=mix(color,vec3f(0.60,0.47,0.29),smoothstep(0.0,0.07,in.change.y));
 color*=mix(1.0,0.68,smoothstep(0.0,0.03,in.data.x));
 let overlay=u32(v.info.z);
 if(overlay==1u){color=mix(vec3f(0.16,0.18,0.18),vec3f(1.0,0.32,0.12),clamp(in.change.x/0.5,0.0,1.0));}
 if(overlay==2u){color=mix(vec3f(0.14,0.18,0.18),vec3f(0.96,0.78,0.35),clamp(in.change.y/0.3,0.0,1.0));}
 if(overlay==3u){color=mix(vec3f(0.2,0.75,0.68),vec3f(0.7,0.4,0.85),clamp(in.change.z/4.0,0.0,1.0));}
 color=shade(color,n,in.world);
 var shadow=1.0;
 for(var k=1;k<=12;k++){let t=f32(k)*.42;let point=in.world+vec3f(-.5,.85,-.45)*t;let xy=vec2i((point.xz+16.0)/v.info.y);if(all(xy>=vec2i(0))&&all(xy<vec2i(i32(v.info.x)))){shadow=min(shadow,smoothstep(-.06,.12,point.y-height(cell(xy.x,xy.y))));}}
 color*=.68+.32*shadow;
 let contour=abs(fract(in.world.y/.3+.5)-.5)/max(fwidth(in.world.y/.3),.001);
 if(v.options.x>0.5){color*=mix(.6,1.0,smoothstep(0.0,1.0,contour));}
 let radius=distance(in.world.xz+16.0,v.brush.xy);let ring=1.0-smoothstep(0.025,0.055,abs(radius-v.brush.z));
 if(v.brush.w>0.5){color=mix(color,vec3f(0.4,1.0,0.9),ring*.85);}
 if(v.options.y>0.5){let section=1.0-smoothstep(.025,.055,abs(in.world.z+16.0-v.options.z));color=mix(color,vec3f(.4,1,.9),section*.9);}
 return vec4f(color,1);
}
@fragment fn waterFragment(in:Vertex)->@location(0) vec4f {
 if(in.data.x<0.002){discard;}
 let speed=length(in.data.yz)/max(in.data.x,0.000001);let c=clamp(in.data.w/max(in.data.x,0.000001)/.02,0.0,1.0);
 var color=mix(vec3f(.065,.36,.38),vec3f(.27,.31,.20),c);
 let direction=in.data.yz/max(length(in.data.yz),.001);
 let phase=dot(in.world.xz,direction)*13.0-viewClock[2]*min(speed,8.0)*5.0;
 let ripple=sin(phase)*sin(in.world.x*17.0+in.world.z*9.0);
 let normal=normalize(in.normal+vec3f(ripple*.06,0,cos(phase)*.05));
 let eye=normalize(v.eye.xyz-in.world);let fresnel=pow(1.0-max(dot(normal,eye),0.0),4.0);
 color=mix(color,vec3f(.62,.78,.78),fresnel*.65);
 let halfVector=normalize(normalize(vec3f(-.5,.85,-.45))+eye);
 color+=vec3f(.9,.87,.7)*pow(max(dot(normal,halfVector),0.0),90.0)*.6;
 let foam=smoothstep(2.0,5.0,speed)*smoothstep(.3,.85,sin(phase*.7)+sin(in.world.x*25.0)*.3);
 color=mix(color,vec3f(.83,.85,.73),foam*.2);
 if(u32(v.info.z)==4u){
  color=mix(vec3f(.04,.1,.19),vec3f(.3,.88,.75),clamp(speed/6.0,0.0,1.0));
  let local=fract((in.world.xz+16.0)/.8)-.5;
  let along=dot(local,direction);let across=dot(local,vec2f(-direction.y,direction.x));
  let shaft=max(abs(across)-.018,abs(along)-.24);
  let head=max(abs(abs(across)-(0.24-along))-.022,max(.07-along,along-.24));
  let arrow=1.0-smoothstep(0.0,max(fwidth(along),.006),min(shaft,head));
  color=mix(color,vec3f(.8,.97,.91),arrow*.8);return vec4f(color,.95);
 }
 return vec4f(color,mix(.30,.94,1.0-exp(-in.data.x*8.0)));
}
