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
