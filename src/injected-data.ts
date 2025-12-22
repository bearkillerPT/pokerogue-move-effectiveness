import type { SavedSession, Party, Moveset } from "./types";
import moves from "./data/moves.js";
import pokedex from "./data/pokedex.js";

type MoveLookupValue = { name?: string | null; type?: string | null };

const _moveLookupCache: WeakMap<
  object,
  Map<number, MoveLookupValue>
> = new WeakMap();
let _externalMoveMap: Map<number, MoveLookupValue> | null = null;

export function getMoveLookup(
  session: SavedSession | null
): Map<number, MoveLookupValue> {
  if (!session || typeof session !== "object") return new Map();
  const cached = _moveLookupCache.get(session as object);
  if (cached) return cached;
  const map: Map<number, MoveLookupValue> = new Map();

  try {
    const ext = getExternalMoveMap();
    for (const [id, val] of ext.entries()) map.set(id, val);
  } catch (e) {
    // ignore
  }

  _moveLookupCache.set(session, map);
  return map;
}

export function getExternalMoveMap(): Map<number, MoveLookupValue> {
  if (_externalMoveMap) return _externalMoveMap;
  const map: Map<number, MoveLookupValue> = new Map();
  try {
    for (const move of moves) {
      map.set(Number(move.id), { name: move.ename, type: move.type });
    }
  } catch (e) {
    // ignore
  }
  _externalMoveMap = map;
  return map;
}

export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    rock: 2,
    dark: 2,
    steel: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    ghost: 0,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    rock: 0.5,
    bug: 2,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
};

export function getMultiplier(
  attType: string | null | undefined,
  targetTypes: string[]
): number {
  if (!attType) return 1;
  const attacker = TYPE_CHART[(attType || "").toLowerCase()] || {};
  let mult = 1;
  if (!Array.isArray(targetTypes) || targetTypes.length === 0) return 1;
  for (const t of targetTypes) {
    const key = (t || "").toLowerCase();
    const m = (attacker as Record<string, number | undefined>)[key];
    if (typeof m === "number") mult *= m;
    else mult *= 1;
  }
  return mult;
}

export function formatMultiplier(m: number): string {
  if (m === 0) return "Immune";
  if (m === 0.25) return "x0.25";
  if (m === 0.5) return "x0.5";
  if (m === 1) return "x1";
  if (m === 2) return "x2";
  if (m === 4) return "x4";
  return `x${m}`;
}

export function multiplierClass(m: number): string {
  if (m === 0) return "pme-immune";
  if (m < 1) return "pme-not-very";
  if (m > 1) return "pme-super";
  return "pme-neutral";
}

export function buildMovesInfo(
  moves: Array<Moveset | number>,
  moveLookup: Map<number, MoveLookupValue>,
  enemyTypes: string[]
): Array<{ name?: string | null; text?: string; cls?: string; id?: number }> {
  const out: Array<{
    name?: string | null;
    text?: string;
    cls?: string;
    id?: number;
  }> = [];
  for (const m of moves) {
    const id =
      typeof m === "number"
        ? m
        : "moveId" in (m as Moveset)
        ? (m as Moveset).moveId
        : undefined;
    let name: string | null | undefined;
    let mType: string | null | undefined;
    if (id != null) {
      const resolved = moveLookup.get(Number(id));
      if (resolved) {
        name = resolved.name;
        mType = resolved.type;
      }
    }
    const mult = getMultiplier(
      mType as string | null | undefined,
      enemyTypes || []
    );
    const text = formatMultiplier(mult);
    const cls = multiplierClass(mult);
    out.push({ name, text, cls, id: id as number | undefined });
  }
  return out;
}

export function deriveEnemyTypesFromSession(
  session: SavedSession | null
): string[] {
  if (!session) return [];
  return pokedex[session.enemyParty[0].species - 1]?.type || [];
}

export function guessEnemyTypes(enemy: Party | null | undefined): string[] {
  if (!enemy) return [];
  const custom = (enemy as unknown as Record<string, unknown>)[
    "customPokemonData"
  ] as Record<string, unknown> | undefined;
  const fusion = (enemy as unknown as Record<string, unknown>)[
    "fusionCustomPokemonData"
  ] as Record<string, unknown> | undefined;
  if (Array.isArray(custom?.types))
    return (custom!.types as unknown[]).map((t) => `${t}`);
  if (Array.isArray(fusion?.types))
    return (fusion!.types as unknown[]).map((t) => `${t}`);
  // no direct `type` string on strict Party; return empty if unknown
  return [];
}
