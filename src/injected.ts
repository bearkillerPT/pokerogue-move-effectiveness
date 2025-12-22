import type { SavedSession, Party, Moveset } from "./types";

import { setupNetworkHooks } from "./injected-network.js";
import {
  getMoveLookup,
  buildMovesInfo,
  deriveEnemyTypesFromSession,
  guessEnemyTypes,
} from "./injected-data.js";
import {
  updateOverlay,
  clearBadges,
  observeTouchControls,
  showOverlay,
  hideOverlay,
} from "./injected-ui.js";

const TAG = "[PME injected]";

let lastBattle: unknown | null = null;
let currentUiMode: string | null = null;
let lastSavedSession: SavedSession | null = null;

console.log(`${TAG} initialized`);

function processSavedata(session: SavedSession | null): void {
  if (!session) return;
  lastSavedSession = session;

  try {
    const moveLookup = getMoveLookup(session);

    const enemyParty: Party[] = Array.isArray(session.enemyParty)
      ? session.enemyParty
      : [];
    const party: Party[] = Array.isArray(session.party) ? session.party : [];

    let playerMoves: Array<Moveset | number> = [];
    // prefer explicit player flag in party entries
    if (party.length > 0) {
      const playerEntry = party.find((p) => p.player === true) || party[0];
      if (playerEntry && Array.isArray(playerEntry.moveset))
        playerMoves = playerEntry.moveset;
      else {
        for (const p of party) {
          if (p && Array.isArray(p.moveset)) {
            playerMoves = p.moveset;
            break;
          }
        }
      }
    }

    const enemyTypes: string[] = deriveEnemyTypesFromSession(session);

    if (!Array.isArray(playerMoves) || playerMoves.length === 0) {
      try {
        if (currentUiMode === "FIGHT") showOverlay();
        else hideOverlay();
      } catch (e) {
        /* noop */
      }
      return;
    }

    clearBadges();
    const movesInfo = buildMovesInfo(playerMoves, moveLookup, enemyTypes || []);
    try {
      if (currentUiMode === "FIGHT") updateOverlay(movesInfo);
      else hideOverlay();
    } catch (e) {
      /* noop */
    }
  } catch (e) {
    console.error(`${TAG} processSavedata error`, e);
  }
}

function handleUiModeChange(newMode: string | null): void {
  try {
    if (newMode === currentUiMode) return;
    currentUiMode = newMode;

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

// observe UI mode changes
try {
  observeTouchControls(handleUiModeChange);
} catch (e) {
  console.error(`${TAG} observeTouchControls error`, e);
}
