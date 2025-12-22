(() => {
  const TAG = "[PME injected]";

  let lastBattle = null;
  const _moveLookupCache = new WeakMap();
  function getMoveLookup(session) {
    if (!session) return new Map();
    const cached = _moveLookupCache.get(session);
    if (cached) return cached;
    const map = new Map();
    try {
      const candidates = [];
      [
        "moves",
        "moveList",
        "moveDefs",
        "moveDefinitions",
        "allMoves",
        "moveCatalog",
        "gameData",
        "data",
      ].forEach((k) => {
        if (session[k]) candidates.push(session[k]);
        if (session.gameData && session.gameData[k])
          candidates.push(session.gameData[k]);
      });
      for (const key of Object.keys(session)) {
        const val = session[key];
        if (Array.isArray(val)) candidates.push(val);
        else if (val && typeof val === "object" && Object.keys(val).length > 0)
          candidates.push(val);
      }
      function tryAdd(item) {
        if (!item) return;
        if (Array.isArray(item)) return item.forEach(tryAdd);
        if (typeof item !== "object") return;
        const id =
          item.id || item.moveId || item.move_id || item.moveID || item._id;
        const name = item.name || item.label || item.move || item.title;
        const type =
          item.type || item.moveType || (item.types && item.types[0]);
        if (id != null && (name || type)) map.set(Number(id), { name, type });
        for (const k of Object.keys(item)) {
          const v = item[k];
          if (v && typeof v === "object") {
            const vid = v.id || v.moveId || v.move_id;
            const vname = v.name || v.move || v.label;
            const vtype = v.type || v.moveType || (v.types && v.types[0]);
            if (vid != null && (vname || vtype))
              map.set(Number(vid), { name: vname, type: vtype });
          }
        }
      }
      for (const c of candidates) tryAdd(c);
    } catch (e) {}
    // also merge any externally-provided move DB (e.g. moves.js loaded on page)
    try {
      const ext = getExternalMoveMap();
      for (const [id, val] of ext.entries()) map.set(id, val);
    } catch (e) {}
    _moveLookupCache.set(session, map);
    return map;
  }

  // Attempt to find a moves array exposed on the page under the single
  // canonical key we support: window.__PME_MOVES. This keeps the lookup
  // deterministic and small.
  let _externalMoveMap = null;
  function getExternalMoveMap() {
    if (_externalMoveMap) return _externalMoveMap;
    const map = new Map();
    try {
      const c = window.__PME_MOVES;
      if (Array.isArray(c)) {
        for (const it of c) {
          const id = it.id || it.moveId || it.move_id;
          // moves DB uses 'ename' and 'type' per standard
          const name = it.ename || it.name;
          const typeRaw = it.type || it.Type || it.moveType;
          const type = typeof typeRaw === 'string' ? typeRaw.toLowerCase() : typeRaw;
          if (id != null) map.set(Number(id), { name, type });
        }
      }
    } catch (e) {}
    _externalMoveMap = map;
    return map;
  }

  // minimal startup log
  console.log(`${TAG} initialized`);

  // Small UI overlay so the user can see move effectiveness even if badges
  // don't attach to the game's DOM. This keeps feedback visible and simple.
  function ensureOverlay() {
    if (document.getElementById("pme-overlay"))
      return document.getElementById("pme-overlay");
  const s = document.createElement("style");
  s.textContent = `#pme-overlay{position:fixed;top:12px;right:12px;z-index:2147483647;background:rgba(0,0,0,0.8);color:#fff;padding:10px 12px;border-radius:10px;font-size:18px;line-height:1.1;font-family:Arial,Helvetica,sans-serif;max-width:360px;pointer-events:none}#pme-overlay .pme-line{margin:6px 0;display:flex;justify-content:space-between;gap:12px;align-items:center}#pme-overlay .pme-name{opacity:0.95;font-size:18px}#pme-overlay .pme-val{font-weight:900;font-size:20px;padding:2px 8px;border-radius:6px;color:#fff}#pme-overlay .pme-super{background:#27ae60}#pme-overlay .pme-not-very{background:#e67e22}#pme-overlay .pme-immune{background:#c0392b}#pme-overlay .pme-neutral{background:#7f8c8d}`;
    document.head.appendChild(s);
    const d = document.createElement("div");
    d.id = "pme-overlay";
    d.style.display = "none";
    document.body.appendChild(d);
    return d;
  }

  function updateOverlay(movesInfo) {
    // Only show the overlay when the UI mode is explicitly FIGHT.
    // This prevents the overlay from appearing on other screens (TITLE,
    // COMMAND, MESSAGE, etc.). If not in FIGHT, ensure overlay is hidden.
    const overlay = ensureOverlay();
    if (typeof currentUiMode !== "string" || currentUiMode !== "FIGHT") {
      overlay.style.display = "none";
      return;
    }
    if (!movesInfo || movesInfo.length === 0) {
      // show a small hint so the user knows we tried to render
      overlay.innerHTML =
        '<div class="pme-line"><div class="pme-name">No moves detected</div><div class="pme-val">-</div></div>';
      overlay.style.display = "block";
      try {
        console.log(`${TAG} overlay updated: no moves`);
      } catch (e) {}
      return;
    }
    overlay.innerHTML = "";
    for (const mi of movesInfo) {
      const line = document.createElement("div");
      line.className = "pme-line";
      const name = document.createElement("div");
      name.className = "pme-name";
      name.textContent = mi.name || "(unknown)";
      const val = document.createElement("div");
      val.className = `pme-val ${mi.cls || ""}`;
      val.textContent = mi.text || "";
      line.appendChild(name);
      line.appendChild(val);
      overlay.appendChild(line);
    }
    overlay.style.display = "block";
    try {
      console.log(`${TAG} overlay updated with ${movesInfo.length} moves`);
    } catch (e) {}
  }

  // Intercept fetch responses for savedata so we can get the battle/session
  // object when the game requests it from the API. This mirrors the approach
  // used by the original RogueDex extension.
  try {
    const { fetch: origFetch } = window;
    window.fetch = async (...args) => {
      const response = await origFetch(...args);
      try {
        const url = response && response.url ? response.url : "";
        if (
          url.includes("api.pokerogue.net/savedata/session") ||
          url.includes("api.pokerogue.net/savedata/update") ||
          url.includes("api.pokerogue.net/savedata/updateall")
        ) {
          response
            .clone()
            .json()
            .then((data) => {
              const session = data && data.session ? data.session : data;
              // store and process savedata (minimal logging)
              try {
                processSavedata(session);
              } catch (e) {
                console.error(`${TAG} processSavedata error`, e);
              }
            })
            .catch(() => {
              /* ignore non-json responses */
            });
        }
      } catch (e) {
        // ignore
      }
      return response;
    };
  } catch (e) {
    console.warn(`${TAG} could not override fetch`, e);
  }

  // Intercept XMLHttpRequest responses as well (some code uses XHR instead of fetch)
  try {
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    XHR.open = function (method, url) {
      try {
        this._pme_url = url;
      } catch (e) {}
      return open.apply(this, arguments);
    };
    XHR.send = function (postData) {
      try {
        this.addEventListener("load", function () {
          try {
            const u = this._pme_url || this.responseURL || "";
            if (
              u &&
              (u.includes("api.pokerogue.net/savedata/session") ||
                u.includes("api.pokerogue.net/savedata/update") ||
                u.includes("api.pokerogue.net/savedata/updateall"))
            ) {
              try {
                const data = JSON.parse(this.responseText || "{}");
                const session = data && data.session ? data.session : data;
                processSavedata(session);
              } catch (e) {
                /* ignore parse errors */
              }
            }
          } catch (e) {
            /* swallow */
          }
        });
      } catch (e) {}
      return send.apply(this, arguments);
    };
  } catch (e) {
    console.warn(`${TAG} could not override XHR`, e);
  }

  // Try to extract useful info from a saved session object and call updateUI.
  function processSavedata(session) {
    console.log(session);
    if (!session) return;
    // keep latest session for UI-mode-triggered re-renders
    try {
      lastSavedSession = session;
    } catch (e) {}
    // brief log so user can see savedata was captured
    try {
      console.log(`${TAG} savedata captured`);
    } catch (e) {}
    // build move lookup early so it's available to all code paths
    const moveLookup = getMoveLookup(session);
    // small, safe truncated summary to help adapt to savedata shape
    try {
      const summary = {};
      try {
        summary.keys = Object.keys(session);
      } catch (e) {
        summary.keys = null;
      }
      try {
        summary.party0 =
          session.party && session.party[0]
            ? {
                species: session.party[0].species,
                moves: Array.isArray(session.party[0].moveset)
                  ? session.party[0].moveset.length
                  : typeof session.party[0].moveset,
              }
            : null;
      } catch (e) {
        summary.party0 = null;
      }
      try {
        summary.enemy0 =
          session.enemyParty && session.enemyParty[0]
            ? {
                species: session.enemyParty[0].species,
                types:
                  session.enemyParty[0].types ||
                  (session.enemyParty[0].species &&
                    session.enemyParty[0].species.types) ||
                  null,
              }
            : null;
      } catch (e) {
        summary.enemy0 = null;
      }
      try {
        summary.arena = session.arena ? Object.keys(session.arena) : null;
      } catch (e) {
        summary.arena = null;
      }
      console.log(`${TAG} savedata summary:`, summary);
    } catch (e) {}
    try {
      const enemyParty = session.enemyParty || [];
      const party = session.party || [];

      // Try to find the current active player's pokemon and its moves
      let playerMoves = [];
      // Some shapes: session.player { moves: [...] } or party entries have moves
      if (session.player && Array.isArray(session.player.moveset))
        playerMoves = session.player.moveset;
      else if (Array.isArray(party)) {
        // attempt to find the active one
        let active =
          party.find((p) => p.isActive || p.active || p.position === 0) ||
          party[0];
        if (active && Array.isArray(active.moveset))
          playerMoves = active.moveset;
        else {
          // fallback: collect moves from first party entry that has them
          for (const p of party) {
            if (p && Array.isArray(p.moveset)) {
              playerMoves = p.moveset;
              break;
            }
          }
        }
      }

      // Enemy types: try to get types from first enemy (active)
      let enemyTypes = [];
      if (Array.isArray(session.arena?.enemies)) {
        const e = session.arena.enemies[0];
        if (e) {
          if (Array.isArray(e.types)) enemyTypes = e.types;
          else if (e.type) enemyTypes = [e.type];
        }
      }
      if (
        !enemyTypes.length &&
        Array.isArray(enemyParty) &&
        enemyParty.length
      ) {
        const e = enemyParty[0];
        if (Array.isArray(e.types)) enemyTypes = e.types;
        else if (e.species && e.species.types) enemyTypes = e.species.types;
        else if (e.type) enemyTypes = [e.type];
      }

      // If we have moves, compute multipliers and attach badges (minimal)
      if (!Array.isArray(playerMoves) || playerMoves.length === 0) {
        // ensure overlay still gives feedback when no moves are present
        try {
          updateOverlay([]);
        } catch (e) {}
      }
      if (Array.isArray(playerMoves) && playerMoves.length > 0) {
        try {
          console.log(
            `${TAG} processing ${playerMoves.length} moves vs ${enemyTypes.length} enemy types`
          );
        } catch (e) {}
        clearBadges();
        const movesInfo = [];
        for (const m of playerMoves) {
          const id = (m && (m.moveId || m.id || m.move_id)) || (typeof m === 'number' ? m : undefined);
          let name, mType;
          if (id != null) {
            const resolved = moveLookup.get(Number(id));
            if (resolved) {
              name = resolved.name;
              mType = resolved.type;
            }
          }
          const mult = getMultiplier(mType, enemyTypes || []);
          const text = formatMultiplier(mult);
          const cls = multiplierClass(mult);
          movesInfo.push({ name, text, cls, id });
        }
        updateOverlay(movesInfo);
      }
    } catch (e) {
      console.error(`${TAG} processSavedata error`, e);
    }
  }

  // Partial Pokémon type effectiveness chart. Keys are attacker types; values map
  // target type -> multiplier.
  const TYPE_CHART = {
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

  function getMultiplier(attType, targetTypes) {
    if (!attType) return 1;
    const attacker = TYPE_CHART[(attType || "").toLowerCase()] || {};
    let mult = 1;
    if (!Array.isArray(targetTypes) || targetTypes.length === 0) return 1;
    for (const t of targetTypes) {
      const key = (t || "").toLowerCase();
      const m = attacker[key];
      if (typeof m === "number") mult *= m;
      else mult *= 1;
    }
    return mult;
  }

  function formatMultiplier(m) {
    if (m === 0) return "Immune";
    if (m === 0.25) return "x0.25";
    if (m === 0.5) return "x0.5";
    if (m === 1) return "x1";
    if (m === 2) return "x2";
    if (m === 4) return "x4";
    return `x${m}`;
  }

  function multiplierClass(m) {
    if (m === 0) return "pme-immune";
    if (m < 1) return "pme-not-very";
    if (m > 1) return "pme-super";
    return "pme-neutral";
  }

  function clearBadges() {
    // Floating badges are no longer used; ensure any leftover elements are removed.
    try {
      document.querySelectorAll(".pme-effectiveness").forEach((n) => n.remove());
    } catch (e) {}
  }

  // Floating per-move badges have been removed. The consolidated overlay
  // (`#pme-overlay`) shows all moves and their effectiveness. There is no
  // longer any DOM insertion for per-move badges.

  // Floating-badge repositioning and related listeners removed.

  function guessEnemyTypes(enemy) {
    if (!enemy) return [];
    // common shapes: enemy.types (array of strings), enemy.type (string), enemy.species?.types
    if (Array.isArray(enemy.types)) return enemy.types.map((t) => `${t}`);
    if (Array.isArray(enemy.typesRaw)) return enemy.typesRaw.map((t) => `${t}`);
    if (enemy.type) return [enemy.type];
    if (enemy.species && Array.isArray(enemy.species.types))
      return enemy.species.types.map((t) => `${t}`);
    // as a last resort, try to pick from misc fields
    if (enemy.typesString && typeof enemy.typesString === "string")
      return enemy.typesString.split("/").map((s) => s.trim());
    return [];
  }

  function updateUI(battle) {
    try {
      clearBadges();
      const enemy = battle.enemy;
      const enemyTypes = guessEnemyTypes(enemy);
      if (!enemyTypes || enemyTypes.length === 0) {
        // minimal log for debugging
        console.log(`${TAG} cannot determine enemy types for battle`);
      }
      const moves =
        battle.player && Array.isArray(battle.player.moveset)
          ? battle.player.moveset
          : [];
      const movesInfo = [];
      const moveLookup = getMoveLookup(lastSavedSession);
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const id = (m && (m.moveId || m.id || m.move_id)) || (typeof m === 'number' ? m : undefined);
        let name, mType;
        if (id != null) {
          const resolved = moveLookup.get(Number(id));
          if (resolved) {
            name = resolved.name;
            mType = resolved.type;
          }
        }
        const mult = getMultiplier(mType, enemyTypes);
        const text = formatMultiplier(mult);
        const cls = multiplierClass(mult);
        movesInfo.push({ name, text, cls, id });
      }
      updateOverlay(movesInfo);
    } catch (e) {
      console.error(`${TAG} updateUI error`, e);
    }
  }
  // Track UI mode via the #touchControls element (data-ui-mode). This mirrors
  // the upstream RogueDex approach: the page sets data-ui-mode to values like
  // TITLE, SAVE_SLOT, MESSAGE, COMMAND, CONFIRM which indicate different UI
  // states. We use this to detect when the move-selection screen (COMMAND)
  // is active.
  let currentUiMode = null;
  let lastSavedSession = null;
  let isBattleActive = false;

  function handleUiModeChange(newMode) {
    try {
      if (newMode === currentUiMode) return;
      currentUiMode = newMode;
      try {
        console.log(`${TAG} ui-mode -> ${currentUiMode}`);
      } catch (e) {}
      // When entering COMMAND (choose a move) or CONFIRM/MESSAGE, try to
      // (re)render the effectiveness badges using last saved session if
      // available — the game often fetches savedata just before or after this
      // transition so this keeps UI responsive.
      // treat FIGHT as the move-selection screen as well (some builds use it)
      if (
        currentUiMode === "COMMAND" ||
        currentUiMode === "CONFIRM" ||
        currentUiMode === "MESSAGE" ||
        currentUiMode === "FIGHT"
      ) {
        if (lastSavedSession) {
          processSavedata(lastSavedSession);
        } else {
          try {
            console.log(
              `${TAG} ui-mode ${currentUiMode} entered but no savedata yet`
            );
          } catch (e) {}
        }
      }
      // track whether a battle appears active: if mode is COMMAND or MESSAGE
      isBattleActive =
        currentUiMode === "COMMAND" ||
        currentUiMode === "MESSAGE" ||
        currentUiMode === "CONFIRM";
    } catch (e) {
      console.error(`${TAG} handleUiModeChange error`, e);
    }
  }

  (function observeTouchControls() {
    try {
      const el = document.getElementById("touchControls");
      if (!el) {
        // element not present yet; poll until it appears
        const poll = setInterval(() => {
          const e2 = document.getElementById("touchControls");
          if (e2) {
            clearInterval(poll);
            const initial = e2.getAttribute("data-ui-mode");
            handleUiModeChange(initial);
            const observer = new MutationObserver((mutations) => {
              for (const m of mutations) {
                if (
                  m.type === "attributes" &&
                  m.attributeName === "data-ui-mode"
                ) {
                  handleUiModeChange(e2.getAttribute("data-ui-mode"));
                }
              }
            });
            observer.observe(e2, { attributes: true });
          }
        }, 300);
      } else {
        const initial = el.getAttribute("data-ui-mode");
        handleUiModeChange(initial);
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "data-ui-mode") {
              handleUiModeChange(el.getAttribute("data-ui-mode"));
            }
          }
        });
        observer.observe(el, { attributes: true });
      }
    } catch (e) {
      console.error(`${TAG} observeTouchControls error`, e);
    }
  })();

  function findBattle() {
    try {
      // Look for objects with player & enemy (heuristic)
      const candidates = Object.values(window).filter(
        (obj) =>
          obj &&
          typeof obj === "object" &&
          obj.player &&
          obj.enemy &&
          Array.isArray(obj.player?.moveset)
      );
      if (candidates.length > 0) {
        const battle = candidates[0];
        if (battle !== lastBattle) {
          lastBattle = battle;
          updateUI(battle);
        } else {
          updateUI(battle);
        }
      }
    } catch (err) {
      // swallow errors
    }
  }
  setInterval(findBattle, 500);
})();
