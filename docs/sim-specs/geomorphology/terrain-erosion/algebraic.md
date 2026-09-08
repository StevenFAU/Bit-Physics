# Equations and representation

Water state is (h,qx,qy,S). Ground stores (base,cut,A,resistance).
Bed elevation is base-cut+A/(1-.35). S and A are grain volume per area.
Hydrostatic reconstruction at an interface takes z*=max(zL,zR),
h*L=max(0,hL+zL-z*), and similarly on the right. HLL uses the bounding
u±sqrt(gh) speeds. Pressure corrections gh²/2-gh*²/2 balance a still lake.
Sediment advects with the shared water flux and the donor concentration.

Bed shear is rho Cf |u|². Cover fraction exp(-A/(.65*.08)) shields bedrock.
Incision is proportional to max(shear-1,0), material response and exposed rock;
entrainment to max(shear-.5,0) and covered fraction. Both obey inventory,
concentration (.02 grain volume/water volume), layer and erosion-floor bounds.
Settling uses the exact fixed-depth exponential update. Dry sediment deposits.
Alluvium-only pair transfers relax slopes above .7 with bounded donors.

Water and external grain ledgers use coarse 1/16 m buckets plus bounded f32
residuals, avoiding unbounded accumulation of small terms into large floats.
All residuals travel with snapshots and scientific captures. No energy
conservation or experimentally calibrated canyon prediction is asserted.
