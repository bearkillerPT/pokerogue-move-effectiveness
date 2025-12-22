import type { Move } from "./types.d";
import moves from "./moves.js";

(async function () {
  try {
    window.__PME_MOVES = moves;
    console.log("[PME] moves DB injected to page as window.__PME_MOVES");
  } catch (e) {
    console.warn("[PME] could not assign moves DB to window", e);
  }
})();
