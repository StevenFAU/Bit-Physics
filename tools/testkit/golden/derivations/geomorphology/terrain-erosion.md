# Independent shallow-water flux anchors

For a constant left/right state, consistency requires the numerical face flux
to equal F=(hu, hu²+gh²/2, huv, uS), with g=9.81. These are hand evaluations
of the continuum conservation law, independent of either HLL implementation.

1. h=2,u=v=S=0: F=(0,19.62,0,0).
2. h=1,u=2,v=3,S=.01: F=(2,8.905,6,.02).
3. Vacuum has no water, momentum or sediment flux: F=(0,0,0,0).

Settling separately solves dS/dt=-ws S/h at fixed h: S(t)=S0 exp(-ws t/h),
and conservation requires A(t)-A0=S0-S(t). The capture verifies this trajectory
with h=1,S0=.01,ws=.1,t=1; expected S=.009048374180359596.

No upstream software was copied. See Audusse et al. (2004), equations for the
shallow-water conservative flux: https://publications.imp.fu-berlin.de/478/.
