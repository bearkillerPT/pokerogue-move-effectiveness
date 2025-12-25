import type { SavedSession, Party, Moveset } from "./types";

import { setupNetworkHooks } from "./injected-network.js";
import {
  getMoveLookup,
  buildMovesInfo,
  deriveEnemyTypes,
} from "./injected-data.js";
import {
  updateOverlay,
  clearBadges,
  observeTouchControls,
  showOverlay,
  hideOverlay,
} from "./injected-ui.js";
import pokedex from "./data/pokedex.js";
// Precompute single-encounter regex: match exactly "<Name>!" where Name is in pokedex
const POKEDEX_NAMES: string[] = (pokedex || [])
  .map((p: any) => p?.name?.english)
  .filter((n: any) => typeof n === "string" && n.length > 0);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ENEMY_NAME_REGEX = new RegExp(
  `^(?:${POKEDEX_NAMES.map(escapeRegex).join("|")})!$`
);

// Helper: find pokedex species id by English name
function getSpeciesIdByName(name: string | null): number | null {
  if (!name) return null;
  const entry = (pokedex as any[]).find(
    (p) => p?.name?.english?.toLowerCase() === name.toLowerCase()
  );
  return entry?.id ?? null;
}

const TAG = "[PME injected]";

let activePokemon: string | null = null;
let enemyPokemons: string[] = [];
let currentUiMode: string | null = null;
let lastSavedSession: SavedSession | null = null;

console.log(`${TAG} initialized`);

// Format a full path like window.<rootKey>.foo[0]["bar-baz"]
function formatPath(rootKey: string, path: Array<string | number>): string {
  let s = `window.${rootKey}`;
  for (const seg of path) {
    if (typeof seg === "number") s += `[${seg}]`;
    else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(seg)) s += `.${seg}`;
    else s += `[${JSON.stringify(seg)}]`;
  }
  return s;
}

// Utility: recursively search for one or more target values within an object/array graph up to a maxDepth
function findValuesRecursively(
  root: any,
  targets: any[] = [],
  maxDepth: number = 2
): Array<{ value: any; path: Array<string | number>; container: any }> {
  const results: Array<{
    value: any;
    path: Array<string | number>;
    container: any;
  }> = [];
  const visited = new WeakSet<object>();
  const isObj = (o: any): o is object => !!o && typeof o === "object";

  const dfs = (obj: any, depth: number, path: Array<string | number>) => {
    if (!isObj(obj) || visited.has(obj) || depth > maxDepth) return;
    visited.add(obj);

    // If the root itself matches, capture it (only once at path [])
    if (path.length === 0 && targets.some((t) => Object.is(obj, t))) {
      results.push({ value: obj, path: [], container: null });
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        let v: any;
        try {
          v = obj[i];
        } catch {
          continue;
        }

        if (targets.some((t) => Object.is(v, t))) {
          results.push({ value: v, path: path.concat(i), container: obj });
        }
        if (isObj(v)) dfs(v, depth + 1, path.concat(i));
      }
      return;
    }

    const anyObj: Record<string, any> = obj as Record<string, any>;
    for (const k in anyObj) {
      let v: any;
      try {
        v = anyObj[k];
      } catch {
        continue;
      }

      if (targets.some((t) => Object.is(v, t))) {
        results.push({ value: v, path: path.concat(k), container: anyObj });
      }
      if (isObj(v)) dfs(v, depth + 1, path.concat(k));
    }
  };

  dfs(root, 0, []);
  return results;
}

export function observePokemonNameChanges() {
  let lastText = "";
  let lastUiMode = "";
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (...args: any[]) {
    try {
      const [text] = args;

      if (lastUiMode !== currentUiMode && currentUiMode === "MESSAGE") {
        lastUiMode = currentUiMode;
        enemyPokemons = [];
      }

      const partyPokemonNameMatch = text.match(/(.*) do\?/);
      if (partyPokemonNameMatch) {
        activePokemon = partyPokemonNameMatch[1];
        console.log("partyPokemonNameMatch activePokemon", activePokemon);
      }

      const enemyPokemonNameMatch = text.match(ENEMY_NAME_REGEX);
      const doubleWildEnemyMatch1 = [lastText, text]
        .join(" ")
        .match(/A wild (.*) and (.*) appeared/);
      const doubleWildEnemyMatch2 = [lastText, text]
        .join(" ")
        .match(/(.*) sent out (.*)\!/);

      if (doubleWildEnemyMatch1) {
        enemyPokemons = [doubleWildEnemyMatch1[1], doubleWildEnemyMatch1[2]];
        console.log("doubleWildEnemyMatch1 pokemon", enemyPokemons);
      } else if (doubleWildEnemyMatch2) {
        enemyPokemons.push(doubleWildEnemyMatch2[2]);
        console.log("doubleWildEnemyMatch2 pokemon", enemyPokemons);
      } else if (enemyPokemonNameMatch) {
        enemyPokemons = [enemyPokemonNameMatch[0].replace(/!$/, "")];
        console.log("enemyPokemonNameMatch pokemon", enemyPokemons);
      }
      // Recompute and update overlay based on new names/types
      if (lastSavedSession) {
        processSavedata(lastSavedSession);
      }
      lastText = text;
    } catch {}
    // @ts-ignore
    return originalFillText.apply(this, args);
  };
}

function processSavedata(session: SavedSession | null): void {
  if (!session) return;
  lastSavedSession = session;

  try {
    const moveLookup = getMoveLookup(session);
    const party: Party[] = Array.isArray(session.party) ? session.party : [];

    let playerMoves: Array<Moveset | number> = [];
    // Prefer the party Pokémon that matches the active species via pokedex
    if (party.length > 0) {
      const activeSpeciesId = getSpeciesIdByName(activePokemon);
      let playerEntry: Party | undefined;

      if (activeSpeciesId != null) {
        playerEntry = party.find((p) => p?.species === activeSpeciesId);
      }

      // Fallbacks: explicit player flag, then first with moveset
      if (!playerEntry) playerEntry = party.find((p) => p.player === true);
      if (!playerEntry)
        playerEntry = party.find((p) => Array.isArray(p.moveset));

      if (playerEntry && Array.isArray(playerEntry.moveset)) {
        playerMoves = playerEntry.moveset;
      }
    }

    const enemyTypes = deriveEnemyTypes(enemyPokemons);

    clearBadges();
    const movesInfo = buildMovesInfo(playerMoves, moveLookup, enemyTypes || []);
    if (currentUiMode === "FIGHT") {
      updateOverlay(movesInfo, enemyPokemons);
      showOverlay();
    } else hideOverlay();
  } catch (e) {
    console.error(`${TAG} processSavedata error`, e);
  }
}

function handleUiModeChange(newMode: string | null): void {
  try {
    if (newMode === currentUiMode) return;
    currentUiMode = newMode;
    //console.log(`${TAG} ui-mode changed to ${currentUiMode}`);
    if (
      currentUiMode === "COMMAND" ||
      currentUiMode === "CONFIRM" ||
      currentUiMode === "MESSAGE" ||
      currentUiMode === "FIGHT"
    ) {
      if (lastSavedSession) processSavedata(lastSavedSession);
      else
        console.log(
          `${TAG} ui-mode ${currentUiMode} entered but no savedata yet`
        );
    }
  } catch (e) {
    console.error(`${TAG} handleUiModeChange error`, e);
  }
}

// wire network hooks -> processSavedata
try {
  setupNetworkHooks((session) => {
    try {
      processSavedata(session);
    } catch (e) {
      console.error(`${TAG} network onSession error`, e);
    }
  });
} catch (e) {
  console.warn(`${TAG} could not setup network hooks`, e);
}

//const seen = new WeakSet<object>();
//setInterval(() => {
//  console.log("[PME] starting RAF object scan...");
//  for (const key in window) {
//    const val = (window as any)[key];
//    if (!val || typeof val !== "object") continue;
//    if (seen.has(val)) continue;
//
//    // generic deep value search for target values (e.g., "Zubat"), limited by maxDepth
//    const matches = findValuesRecursively(val, ["Ember"], 25);
//    if (matches.length > 0) {
//      for (const m of matches) {
//        console.log(
//          "RAF scan found value 'Zubat' at path:",
//          formatPath(key, m.path)
//        );
//      }
//    }
//  }
//}, 20000);

console.log("[PME] RAF object scanner installed");

// observe UI mode changes
try {
  observeTouchControls(handleUiModeChange);
  observePokemonNameChanges();
} catch (e) {
  console.error(`${TAG} observeTouchControls error`, e);
}
