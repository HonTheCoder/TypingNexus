const EASY = ['neon','grid','sun','wave','ride','glow','city','byte','code','dusk','rain','star','volt','beam','dash','echo','flux','iron','jolt','kilo','lazer','mode','nova','orbit','pixel','quark','retro','synth','turbo','vibe','warp','zero','arc','bit','chip','disk','edge','fire','gear','hack']

const MEDIUM = ['cyberpunk','synthwave','particle','velocity','spectrum','hologram','override','protocol','terminal','renegade','obsidian','daybreak','wireless','mainframe','synthetic','interface','momentum','paradigm','quantum','reactor','satellite','threshold','ultraviolet','vector','wavelength','xenon','zeppelin','algorithm','bandwidth','cryptic']

const HARD = ['juxtaposition','kaleidoscope','labyrinthine','magnanimous','nebulousness','obfuscation','perpendicular','quintessential','reverberation','serendipitous','transcendence','unprecedented','vulnerability','whimsicality','exacerbation','melancholic','phosphorescence','disenfranchise','idiosyncrasy','onomatopoeia','procrastination','rambunctious','surreptitious','ubiquitous','vicissitude','clairvoyance','grandiloquent','incandescent','metamorphosis','paraphernalia']

const ASIAN = ['antidisestablishmentarianism','floccinaucinihilipilification','pneumonoultramicroscopic','sesquipedalianism','incomprehensibilities','electroencephalography','otorhinolaryngologist','psychophysicotherapeutics','thyroparathyroidectomy','dichlorodifluoromethane','immunoelectrophoresis','counterrevolutionaries','disproportionableness','honorificabilitudinity','uncharacteristically','interdenominational','magnetohydrodynamics','crystallographically','phenomenologically','institutionalization','compartmentalization','deinstitutionalize','intercontinentalism','overintellectualize','photolithographically','radioimmunoassay','spectrophotometrically','thermodynamically','ultracentrifugation','xenotransplantation']

const POOLS = { easy: EASY, medium: MEDIUM, hard: HARD, asian: ASIAN }

export function generateWords(difficulty, count = 200) {
  const pool = POOLS[difficulty] ?? EASY
  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)])
}

export function randomWord(difficulty) {
  const pool = POOLS[difficulty] ?? EASY
  return pool[Math.floor(Math.random() * pool.length)]
}
