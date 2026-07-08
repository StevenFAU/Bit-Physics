"""signal-workbench — verified DSP instrument f64 reference.

Every displayed quantity is gated against the closed-form transform of the
signal's own generator (spec-ref.md section 3): window DTFTs and figures of
merit, Chowning FM Bessel sidebands, RBJ biquad H(e^jw), constellations /
RC-RRC / EVM, THD/SINAD/SFDR/ENOB, plus the machine-exact Rayleigh/Parseval
energy gate and the discrete-spectrum discipline (golden = F*W, never the
continuous line spectrum).
"""
