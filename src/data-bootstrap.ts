import moves from "./data/moves.js";
import pokedex from "./data/pokedex.js";

(async function () {
  try {
    window.__PME_MOVES = moves;
    window.__PME_POKEDEX = pokedex;
    console.log("[PME] moves and pokedex DBs injected to page as window.__PME_MOVES and window.__PME_POKEDEX");
  } catch (e) {
    console.warn("[PME] could not assign moves and pokedex DBs to window", e);
  }
})();
