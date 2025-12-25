import moves from "./data/moves.js";
import pokedex from "./data/pokedex.js";
import moveTypes from "./data/move-types.js";

type MoveLookupValue = { name?: string | null; type?: string | null };
let _externalMoveMap: Map<number, MoveLookupValue> | null = null;


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

export function getMultiplier(
  attType: string | null | undefined,
  targetTypes: string[]
): number {
  if (!attType) return 1;
  const attacker = moveTypes.find((m) => m.english === attType);
  let mult = 1;
  if (!Array.isArray(targetTypes) || targetTypes.length === 0) return 1;
  for (const t of targetTypes) {
    if (attacker?.effective?.includes(t)) mult *= 2;
    else if (attacker?.ineffective?.includes(t)) mult *= 0.5;
    else if (attacker?.no_effect?.includes(t)) mult *= 0;
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


export function deriveEnemyTypes(enemyPokemons: string[]): string[][] {
  return enemyPokemons
    .map((ep) => pokedex.find((p) => p.name.english === ep)?.type || []);
}
