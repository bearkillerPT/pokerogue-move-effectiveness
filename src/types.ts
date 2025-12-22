export interface SavedSession {
  seed: string
  playTime: number
  gameMode: number
  party: Party[]
  enemyParty: Party[]
  modifiers: any
  enemyModifiers: any
  arena: Arena
  pokeballCounts: PokeballCounts
  money: number
  score: number
  victoryCount: number
  faintCount: number
  reviveCount: number
  waveIndex: number
  battleType: number
  trainer: any
  gameVersion: string
  timestamp: number
  challenges: any
  mysteryEncounterType: number
  mysteryEncounterSaveData: MysteryEncounterSaveData
}

export interface Party {
  abilityIndex: number
  battleData: BattleData
  boss: boolean
  bossSegments: number
  customPokemonData: CustomPokemonData
  exp: number
  formIndex: number
  friendship: number
  fusionCustomPokemonData: FusionCustomPokemonData
  fusionLuck: number
  fusionMysteryEncounterPokemonData: any
  fusionTeraType: number
  gender: number
  hp: number
  id: number
  isTerastallized: boolean
  ivs: number[]
  level: number
  levelExp: number
  luck: number
  metBiome: number
  metLevel: number
  metSpecies: number
  metWave: number
  moveset: Moveset[]
  mysteryEncounterPokemonData: any
  nature: number
  pauseEvolutions: boolean
  player: boolean
  pokeball: number
  pokerus: boolean
  shiny: boolean
  species: number
  stats: number[]
  status: any
  stellarTypesBoosted: any
  summonData: SummonData
  teraType: number
  usedTMs: any
  variant: number
}

export interface BattleData {
  berriesEaten: any
  hasEatenBerry: boolean
  hitCount: number
}

export interface CustomPokemonData {
  ability: number
  hitsRecCount: any
  nature: number
  passive: number
  spriteScale: number
  types: any
}

export interface FusionCustomPokemonData {
  ability: number
  hitsRecCount: any
  nature: number
  passive: number
  spriteScale: number
  types: any
}

export interface Moveset {
  moveId: number
  ppUp: number
  ppUsed: number
}

export interface SummonData {
  abilitySuppressed: boolean
  berriesEatenLast: any
  illusionBroken: boolean
  moveHistory: any
  moveQueue: any
  statStages: number[]
  stats: number[]
  tags: any
  types: any
}

export interface Arena {
  biome: number
  playerTerasUsed: number
  positionalTags: any
  tags: any
}

export interface PokeballCounts {
  "0": number
  "1": number
  "2": number
  "3": number
  "4": number
}

export interface MysteryEncounterSaveData {
  encounteredEvents: any
  encounterSpawnChance: number
  queuedEncounters: any
}

// Moves.js move type
export interface Move {
  id: number;
  ename?: string | null;
  cname?: string | null;
  jname?: string | null;
  power?: number | null;
  accuracy?: number | null;
  pp?: number | null;
  type?: string | null;
  tm?: number | null;
  category?: string | null;
}

// Pokedex.js Pokemon type
export interface Pokemon {
  id: number
  name: Name
  type: string[]
  base: Base
  species: string
  description: string
  evolution: Evolution
  profile: Profile
  image: Image
}

export interface Name {
  english: string
  japanese: string
  chinese: string
  french: string
}

export interface Base {
  HP: number
  Attack: number
  Defense: number
  "Sp. Attack": number
  "Sp. Defense": number
  Speed: number
}

export interface Evolution {
  next: string[][]
}

export interface Profile {
  height: string
  weight: string
  egg: string[]
  ability: string[][]
  gender: string
}

export interface Image {
  sprite: string
  thumbnail: string
  hires: string
}
