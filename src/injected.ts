import {
  deriveEnemyTypes,
  getExternalMoveMap,
  getMultiplier,
  formatMultiplier,
  multiplierClass,
} from "./injected-data.js";
import {
  updateOverlay,
  clearBadges,
  observeTouchControls,
  showOverlay,
  hideOverlay,
} from "./injected-ui.js";
import pokedex from "./data/pokedex.js";

const POKEDEX_NAMES: string[] = (pokedex || [])
  .map((p: any) => p?.name?.english)
  .filter((n: any) => typeof n === "string" && n.length > 0);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ENEMY_NAME_REGEX = new RegExp(
  `^A wild (${POKEDEX_NAMES.map(escapeRegex).join("|")}) appeared!$`,
  "u"
);

const TAG = "[PME injected]";

let activePokemonMoves: string[] = [];
let enemyPokemons: string[] = [];
let currentUiMode: string | null = null;
// No longer using session-based data; we derive moves directly from UI

console.log(`${TAG} initialized`);

// Build and cache a name->type lookup using the external move dataset
let _moveNameToType: Map<string, string> | null = null;
function getMoveNameToType(): Map<string, string> {
  if (_moveNameToType) return _moveNameToType;
  const map = new Map<string, string>();
  try {
    const ext = getExternalMoveMap();
    for (const [, v] of ext.entries()) {
      const n = v?.name;
      const t = v?.type;
      if (n && t) map.set(n, t);
    }
  } catch {}
  _moveNameToType = map;
  return map;
}

// (Removed debug helpers and unused deep-search utilities)

export function observePokemonNameChanges() {
  let lastText = "";
  let lastEnemyPushTime = 0;
  let lastUiMode = "";
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (...args: any[]) {
    try {
      const [text] = args;
      if (lastUiMode !== currentUiMode) {
        lastUiMode = currentUiMode || "";
        if (currentUiMode === "COMMAND") activePokemonMoves = [];
      }
      if(text.includes("winning!")){
        console.log("WIN DETECTED, resetting enemyPokemons", text);
        enemyPokemons = [];
      }

      // Active Pokémon name detection removed (unused)

      const enemyPokemonNameMatch = text.match(ENEMY_NAME_REGEX);
      const doubleWildEnemyMatch1 = [lastText, text]
        .join(" ")
        .match(/A wild (.*) and (.*) appeared/);
      const doubleWildEnemyMatch2 = [lastText, text]
        .join(" ")
        .match(/(.*) sent out (.*)\!/);

      if (enemyPokemonNameMatch) {
        console.log("enemyPokemonNameMatch", enemyPokemonNameMatch);
        enemyPokemons = [enemyPokemonNameMatch[1]];
        console.log("enemyPokemonNameMatch pokemon", enemyPokemons);
      } else if (doubleWildEnemyMatch1) {
        enemyPokemons = [doubleWildEnemyMatch1[1], doubleWildEnemyMatch1[2]];
        console.log("doubleWildEnemyMatch1 pokemon", enemyPokemons);
      } else if (
        doubleWildEnemyMatch2 &&
        !enemyPokemons.includes(doubleWildEnemyMatch2[2])
      ) {
        console.log("doubleWildEnemyMatch2", doubleWildEnemyMatch2, lastEnemyPushTime, Date.now() - lastEnemyPushTime);
        if (Date.now() - lastEnemyPushTime > 1000) {
          enemyPokemons = [];
        }

        enemyPokemons.push(doubleWildEnemyMatch2[2]);
        lastEnemyPushTime = Date.now();
        console.log("doubleWildEnemyMatch2 pokemon", enemyPokemons);
      }
      // Recompute and update overlay based on new names/types
      if (lastText === "-" && text !== " " && text !== "-" && text !== "" && !text.match(/\d\/\d/)) {
        activePokemonMoves.push(text);
      }
      updateOverlayFromActiveData();
      lastText = text;
    } catch {}
    // @ts-ignore
    return originalFillText.apply(this, args);
  };
}

function updateOverlayFromActiveData(): void {
  try {
    const enemyTypes = deriveEnemyTypes(enemyPokemons);
    const byName = getMoveNameToType();
    clearBadges();
    const movesInfo = (activePokemonMoves || []).map((name) => {
      const mType = byName.get(name) || null;
      const values = (enemyTypes || []).map((typesForEnemy) => {
        const mult = getMultiplier(mType, typesForEnemy || []);
        return { text: formatMultiplier(mult), cls: multiplierClass(mult) };
      });
      return { name, values };
    });
    if (currentUiMode === "FIGHT") {
      updateOverlay(movesInfo, enemyPokemons);
      showOverlay();
    } else hideOverlay();
  } catch (e) {
    console.error(`${TAG} updateOverlayFromActiveData error`, e);
  }
}

function handleUiModeChange(newMode: string | null): void {
  try {
    if (newMode === currentUiMode) return;
    currentUiMode = newMode;
    console.log(
      `${TAG} ui-mode changed to ${currentUiMode} ENEMIES:`,
      enemyPokemons
    );
    if (
      currentUiMode === "COMMAND" ||
      currentUiMode === "CONFIRM" ||
      currentUiMode === "MESSAGE" ||
      currentUiMode === "FIGHT"
    ) {
      updateOverlayFromActiveData();
    }
  } catch (e) {
    console.error(`${TAG} handleUiModeChange error`, e);
  }
}

// observe UI mode changes
try {
  observeTouchControls(handleUiModeChange);
  observePokemonNameChanges();
} catch (e) {
  console.error(`${TAG} observeTouchControls error`, e);
}
