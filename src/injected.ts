import type { LooseValue } from './types.d';

const TAG = '[PME injected]';

type MoveLookupValue = { name?: string | null; type?: string | null };

let lastBattle: LooseValue | null = null;
const _moveLookupCache: WeakMap<object, Map<number, MoveLookupValue>> = new WeakMap();

function getMoveLookup(session: LooseValue | null): Map<number, MoveLookupValue> {
  if (!session || typeof session !== 'object') return new Map();
  const cached = _moveLookupCache.get(session as object);
  if (cached) return cached;
  const map: Map<number, MoveLookupValue> = new Map();
  try {
    const candidates: Array<LooseValue | LooseValue[]> = [];
    const keys = [
      'moves',
      'moveList',
      'moveDefs',
      'moveDefinitions',
      'allMoves',
      'moveCatalog',
      'gameData',
      'data',
    ];
    for (const k of keys) {
      if ((session as LooseValue)[k]) candidates.push((session as LooseValue)[k] as LooseValue);
      const gd = (session as LooseValue).gameData as LooseValue | undefined;
      if (gd && (gd as LooseValue)[k]) candidates.push((gd as LooseValue)[k] as LooseValue);
    }

    for (const key of Object.keys(session)) {
      const val = (session as LooseValue)[key];
      if (Array.isArray(val)) candidates.push(val as LooseValue[]);
      else if (val && typeof val === 'object' && Object.keys(val).length > 0) candidates.push(val as LooseValue);
    }

    function tryAdd(item: LooseValue | LooseValue[] | null) {
      if (!item) return;
      if (Array.isArray(item)) return item.forEach(tryAdd as (v: LooseValue) => void);
      if (typeof item !== 'object') return;
      const it = item as LooseValue;
      const idRaw = (it.id as number | null) ?? (it.moveId as number | null) ?? (it.move_id as number | null) ?? (it.moveID as number | null) ?? (it._id as number | null);
      const name = (it.name as string | null) || (it.label as string | null) || (it.move as string | null) || (it.title as string | null);
      const type = (it.type as string | null) || (it.moveType as string | null) || ((it.types as string[] | undefined) && (it.types as string[])[0]);
      if (idRaw != null && (name || type)) map.set(Number(idRaw), { name: name ?? null, type: type ?? null });
      for (const k of Object.keys(it)) {
        const v = (it as LooseValue)[k];
        if (v && typeof v === 'object') {
          const vv = v as LooseValue;
          const vid = (vv.id as number | null) ?? (vv.moveId as number | null) ?? (vv.move_id as number | null);
          const vname = (vv.name as string | null) || (vv.move as string | null) || (vv.label as string | null);
          const vtype = (vv.type as string | null) || (vv.moveType as string | null) || ((vv.types as string[] | undefined) && (vv.types as string[])[0]);
          if (vid != null && (vname || vtype)) map.set(Number(vid), { name: vname ?? null, type: vtype ?? null });
        }
      }
    }

    for (const c of candidates) tryAdd(c as LooseValue);
  } catch (e) {
    // swallow
  }

  // also merge any externally-provided move DB (e.g. moves.js loaded on page)
  try {
    const ext = getExternalMoveMap();
    for (const [id, val] of ext.entries()) map.set(id, val);
  } catch (e) {
    // ignore
  }

  _moveLookupCache.set(session as object, map);
  return map;
}

let _externalMoveMap: Map<number, MoveLookupValue> | null = null;
function getExternalMoveMap(): Map<number, MoveLookupValue> {
  if (_externalMoveMap) return _externalMoveMap;
  const map: Map<number, MoveLookupValue> = new Map();
  try {
    const c = window.__PME_MOVES as MoveLookupValue;
    if (Array.isArray(c)) {
      for (const it of c) {
        const id = (it.id as number | undefined) ?? (it.moveId as number | undefined) ?? (it.move_id as number | undefined);
        const name = (it.ename as string | null) || (it.name as string | null);
        const typeRaw = (it.type as string | null) || (it.Type as string | null) || (it.moveType as string | null);
        const type = typeof typeRaw === 'string' ? typeRaw.toLowerCase() : (typeRaw as string | null);
        if (id != null) map.set(Number(id), { name: name ?? null, type: type ?? null });
      }
    }
  } catch (e) {
    // ignore
  }
  _externalMoveMap = map;
  return map;
}

/**
 * Safely extract a numeric move id from a move entry which may be a number
 * or a LooseValue object with various property names.
 */
function getMoveId(m: LooseValue | number | null | undefined): number | undefined {
  if (m == null) return undefined;
  if (typeof m === 'number') return m;
  if (typeof m !== 'object') return undefined;
  if ('moveId' in m && typeof (m as LooseValue).moveId === 'number') return (m as LooseValue).moveId as number;
  if ('id' in m && typeof (m as LooseValue).id === 'number') return (m as LooseValue).id as number;
  if ('move_id' in m && typeof (m as LooseValue).move_id === 'number') return (m as LooseValue).move_id as number;
  if ('moveID' in m && typeof (m as LooseValue).moveID === 'number') return (m as LooseValue).moveID as number;
  if ('_id' in m && typeof (m as LooseValue)._id === 'number') return (m as LooseValue)._id as number;
  return undefined;
}

console.log(`${TAG} initialized`);

function ensureOverlay(): HTMLElement {
  const existing = document.getElementById('pme-overlay');
  if (existing) return existing;
  const s = document.createElement('style');
  s.textContent = `#pme-overlay{position:fixed;top:12px;right:12px;z-index:2147483647;background:rgba(0,0,0,0.8);color:#fff;padding:10px 12px;border-radius:10px;font-size:18px;line-height:1.1;font-family:Arial,Helvetica,sans-serif;max-width:360px;pointer-events:none}#pme-overlay .pme-line{margin:6px 0;display:flex;justify-content:space-between;gap:12px;align-items:center}#pme-overlay .pme-name{opacity:0.95;font-size:18px}#pme-overlay .pme-val{font-weight:900;font-size:20px;padding:2px 8px;border-radius:6px;color:#fff}#pme-overlay .pme-super{background:#27ae60}#pme-overlay .pme-not-very{background:#e67e22}#pme-overlay .pme-immune{background:#c0392b}#pme-overlay .pme-neutral{background:#7f8c8d}`;
  document.head.appendChild(s);
  const d = document.createElement('div');
  d.id = 'pme-overlay';
  d.style.display = 'none';
  document.body.appendChild(d);
  return d;
}

function updateOverlay(movesInfo: Array<{ name?: string | null; text?: string; cls?: string; id?: number }>) {
  const overlay = ensureOverlay();
  if (typeof currentUiMode !== 'string' || currentUiMode !== 'FIGHT') {
    overlay.style.display = 'none';
    return;
  }
  if (!movesInfo || movesInfo.length === 0) {
    overlay.innerHTML = '<div class="pme-line"><div class="pme-name">No moves detected</div><div class="pme-val">-</div></div>';
    overlay.style.display = 'block';
    try {
      console.log(`${TAG} overlay updated: no moves`);
    } catch (e) {}
    return;
  }
  overlay.innerHTML = '';
  for (const mi of movesInfo) {
    const line = document.createElement('div');
    line.className = 'pme-line';
    const name = document.createElement('div');
    name.className = 'pme-name';
    name.textContent = mi.name || '(unknown)';
    const val = document.createElement('div');
    val.className = `pme-val ${mi.cls || ''}`;
    val.textContent = mi.text || '';
    line.appendChild(name);
    line.appendChild(val);
    overlay.appendChild(line);
  }
  overlay.style.display = 'block';
  try {
    console.log(`${TAG} overlay updated with ${movesInfo.length} moves`);
  } catch (e) {}
}

// Intercept fetch responses for savedata: replace window.fetch with a wrapped function
try {
  const origFetch = window.fetch.bind(window);
  const newFetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await origFetch(...args);
    try {
      const url = response && response.url ? response.url : '';
      if (
        url.includes('api.pokerogue.net/savedata/session') ||
        url.includes('api.pokerogue.net/savedata/update') ||
        url.includes('api.pokerogue.net/savedata/updateall')
      ) {
        // clone and attempt to parse JSON; if it contains a `session` field use it
        response.clone().json().then((data: LooseValue) => {
          const hasSession = data && typeof data === 'object' && 'session' in data;
          const session = hasSession ? (data as LooseValue & { session?: LooseValue }).session ?? (data as LooseValue) : (data as LooseValue);
          try {
            processSavedata(session as LooseValue);
          } catch (e) {
            console.error(`${TAG} processSavedata error`, e);
          }
        }).catch(() => { /* ignore non-json responses */ });
      }
    } catch (e) {
      // ignore
    }
    return response;
  };

  Object.defineProperty(window, 'fetch', { value: newFetch, configurable: true, writable: true });
} catch (e) {
  console.warn(`${TAG} could not override fetch`, e);
}

// Intercept XHR
try {
  const XHRProto = XMLHttpRequest.prototype;
  const origOpen = XHRProto.open as (this: XMLHttpRequest, method: string, url: string, async?: boolean, user?: string | null, password?: string | null) => void;
  const origSend = XHRProto.send as (this: XMLHttpRequest, body?: Document | BodyInit | null) => void;

  XHRProto.open = function (this: XMLHttpRequest, method: string, url: string, async?: boolean, user?: string | null, password?: string | null) {
    try {
      this._pme_url = url;
    } catch (e) {
      // noop
    }
    return origOpen.call(this, method, url, async, user, password);
  };

  XHRProto.send = function (this: XMLHttpRequest, body?: Document | BodyInit | null) {
    try {
      this.addEventListener('load', function (this: XMLHttpRequest) {
        try {
          const u = this._pme_url || this.responseURL || '';
          if (
            u &&
            (u.includes('api.pokerogue.net/savedata/session') || u.includes('api.pokerogue.net/savedata/update') || u.includes('api.pokerogue.net/savedata/updateall'))
          ) {
            try {
              const data = JSON.parse(this.responseText || '{}') as LooseValue;
              const hasSession = data && typeof data === 'object' && 'session' in data;
              const session = hasSession ? (data as LooseValue & { session?: LooseValue }).session ?? (data as LooseValue) : (data as LooseValue);
              processSavedata(session);
            } catch (e) {
              // ignore parse errors
            }
          }
        } catch (e) {
          // swallow
        }
      });
    } catch (e) {
      // noop
    }
    return origSend.call(this, body);
  };
} catch (e) {
  console.warn(`${TAG} could not override XHR`, e);
}

function processSavedata(session: LooseValue | null): void {
  console.log(session);
  if (!session) return;
  try {
    lastSavedSession = session;
  } catch (e) {
    // noop
  }
  try {
    console.log(`${TAG} savedata captured`);
  } catch (e) {
    // noop
  }
  const moveLookup = getMoveLookup(session);
  try {
    const summary: LooseValue = {};
    try { summary.keys = Object.keys(session); } catch (e) { summary.keys = null; }

    // Safely extract a small summary of party/enemy shapes
    try {
      let party0: LooseValue | null = null;
      if (Array.isArray((session as LooseValue).party) && ((session as LooseValue).party as LooseValue[]).length > 0) {
        const p0 = ((session as LooseValue).party as LooseValue[])[0] as LooseValue;
        const movesVal = p0.moveset;
        const movesNumberOrType = Array.isArray(movesVal) ? (movesVal as Array<unknown>).length : typeof movesVal;
        party0 = { species: p0.species, moves: movesNumberOrType } as LooseValue;
      }
      summary.party0 = party0;
    } catch (e) { summary.party0 = null; }

    try {
      let enemy0: LooseValue | null = null;
      if (Array.isArray((session as LooseValue).enemyParty) && ((session as LooseValue).enemyParty as LooseValue[]).length > 0) {
        const e0 = ((session as LooseValue).enemyParty as LooseValue[])[0] as LooseValue;
        const types = Array.isArray(e0.types) ? (e0.types as string[]) : (e0.species && Array.isArray((e0.species as LooseValue).types) ? ((e0.species as LooseValue).types as string[]) : null);
        enemy0 = { species: e0.species, types } as LooseValue;
      }
      summary.enemy0 = enemy0;
    } catch (e) { summary.enemy0 = null; }

    try { summary.arena = (session as LooseValue).arena ? Object.keys((session as LooseValue).arena as LooseValue) : null; } catch (e) { summary.arena = null; }
    console.log(`${TAG} savedata summary:`, summary);
  } catch (e) {
    // noop
  }

  try {
  const enemyParty = (Array.isArray((session as LooseValue).enemyParty) ? ((session as LooseValue).enemyParty as LooseValue[]) : []) || [];
  const party = (Array.isArray((session as LooseValue).party) ? ((session as LooseValue).party as LooseValue[]) : []) || [];

    let playerMoves: Array<LooseValue | number> = [];
    if (session.player && Array.isArray((session.player as LooseValue).moveset)) playerMoves = (session.player as LooseValue).moveset as Array<LooseValue | number>;
  else if (party.length > 0) {
  let active = (party.find((p) => (p as LooseValue).isActive || (p as LooseValue).active || (p as LooseValue).position === 0) as LooseValue) || (party[0] as LooseValue);
      if (active && Array.isArray((active as LooseValue).moveset)) playerMoves = (active as LooseValue).moveset as Array<LooseValue | number>;
      else {
        for (const p of party) {
          if (p && Array.isArray((p as LooseValue).moveset)) {
            playerMoves = (p as LooseValue).moveset as Array<LooseValue | number>;
            break;
          }
        }
      }
    }

    let enemyTypes: string[] = [];
    if (Array.isArray(((session as LooseValue).arena as LooseValue | undefined)?.enemies)) {
      const e = (((session as LooseValue).arena as LooseValue).enemies as LooseValue[])[0];
      if (e) {
        if (Array.isArray((e as LooseValue).types)) enemyTypes = (e as LooseValue).types as string[];
        else if ((e as LooseValue).type) enemyTypes = [String((e as LooseValue).type)];
      }
    }
    if (!enemyTypes.length && enemyParty.length) {
      const e = enemyParty[0];
      if (Array.isArray((e as LooseValue).types)) enemyTypes = (e as LooseValue).types as string[];
      else if ((e as LooseValue).species && Array.isArray(((e as LooseValue).species as LooseValue).types)) enemyTypes = (((e as LooseValue).species as LooseValue).types as string[]);
      else if ((e as LooseValue).type) enemyTypes = [String((e as LooseValue).type)];
    }

    if (!Array.isArray(playerMoves) || playerMoves.length === 0) {
      try { updateOverlay([]); } catch (e) {}
    }
    if (Array.isArray(playerMoves) && playerMoves.length > 0) {
      try { console.log(`${TAG} processing ${playerMoves.length} moves vs ${enemyTypes.length} enemy types`); } catch (e) {}
      clearBadges();
      const movesInfo: Array<{ name?: string | null; text?: string; cls?: string; id?: number }> = [];
      for (const m of playerMoves) {
        const id = getMoveId(m);
        let name: string | null | undefined; let mType: string | null | undefined;
        if (id != null) {
          const resolved = moveLookup.get(Number(id));
          if (resolved) { name = resolved.name; mType = resolved.type; }
        }
        const mult = getMultiplier(mType as string | null | undefined, enemyTypes || []);
        const text = formatMultiplier(mult);
        const cls = multiplierClass(mult);
        movesInfo.push({ name, text, cls, id: id as number | undefined });
      }
      updateOverlay(movesInfo);
    }
  } catch (e) {
    console.error(`${TAG} processSavedata error`, e);
  }
}

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, rock: 0.5, bug: 2, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

function getMultiplier(attType: string | null | undefined, targetTypes: string[]): number {
  if (!attType) return 1;
  const attacker = TYPE_CHART[(attType || '').toLowerCase()] || {};
  let mult = 1;
  if (!Array.isArray(targetTypes) || targetTypes.length === 0) return 1;
  for (const t of targetTypes) {
    const key = (t || '').toLowerCase();
    const m = (attacker as Record<string, number | undefined>)[key];
    if (typeof m === 'number') mult *= m;
    else mult *= 1;
  }
  return mult;
}

function formatMultiplier(m: number): string {
  if (m === 0) return 'Immune';
  if (m === 0.25) return 'x0.25';
  if (m === 0.5) return 'x0.5';
  if (m === 1) return 'x1';
  if (m === 2) return 'x2';
  if (m === 4) return 'x4';
  return `x${m}`;
}

function multiplierClass(m: number): string {
  if (m === 0) return 'pme-immune';
  if (m < 1) return 'pme-not-very';
  if (m > 1) return 'pme-super';
  return 'pme-neutral';
}

function clearBadges(): void {
  try { document.querySelectorAll('.pme-effectiveness').forEach((n) => n.remove()); } catch (e) { /* noop */ }
}

function guessEnemyTypes(enemy: LooseValue | null | undefined): string[] {
  if (!enemy) return [];
  if (Array.isArray((enemy as LooseValue).types)) return ((enemy as LooseValue).types as string[]).map((t) => `${t}`);
  if (Array.isArray((enemy as LooseValue).typesRaw)) return ((enemy as LooseValue).typesRaw as string[]).map((t) => `${t}`);
  if ((enemy as LooseValue).type) return [String((enemy as LooseValue).type)];
  if ((enemy as LooseValue).species && Array.isArray(((enemy as LooseValue).species as LooseValue).types))
    return (((enemy as LooseValue).species as LooseValue).types as string[]).map((t) => `${t}`);
  if ((enemy as LooseValue).typesString && typeof (enemy as LooseValue).typesString === 'string') return String((enemy as LooseValue).typesString).split('/').map((s) => s.trim());
  return [];
}

function updateUI(battle: LooseValue): void {
  try {
    clearBadges();
    const enemy = (battle as LooseValue).enemy as LooseValue | undefined;
    const enemyTypes = guessEnemyTypes(enemy);
    if (!enemyTypes || enemyTypes.length === 0) {
      console.log(`${TAG} cannot determine enemy types for battle`);
    }
    const moves = ((battle as LooseValue).player && Array.isArray(((battle as LooseValue).player as LooseValue).moveset)) ? (((battle as LooseValue).player as LooseValue).moveset as Array<LooseValue | number>) : [];
    const movesInfo: Array<{ name?: string | null; text?: string; cls?: string; id?: number }> = [];
    const moveLookup = getMoveLookup(lastSavedSession as LooseValue | null);
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const id = getMoveId(m);
      let name: string | null | undefined; let mType: string | null | undefined;
      if (id != null) {
        const resolved = moveLookup.get(Number(id));
        if (resolved) { name = resolved.name; mType = resolved.type; }
      }
      const mult = getMultiplier(mType as string | null | undefined, enemyTypes);
      const text = formatMultiplier(mult);
      const cls = multiplierClass(mult);
      movesInfo.push({ name, text, cls, id: id as number | undefined });
    }
    updateOverlay(movesInfo);
  } catch (e) {
    console.error(`${TAG} updateUI error`, e);
  }
}

let currentUiMode: string | null = null;
let lastSavedSession: LooseValue | null = null;
let isBattleActive = false;

function handleUiModeChange(newMode: string | null): void {
  try {
    if (newMode === currentUiMode) return;
    currentUiMode = newMode;
    try { console.log(`${TAG} ui-mode -> ${currentUiMode}`); } catch (e) {}
    if (currentUiMode === 'COMMAND' || currentUiMode === 'CONFIRM' || currentUiMode === 'MESSAGE' || currentUiMode === 'FIGHT') {
      if (lastSavedSession) processSavedata(lastSavedSession);
      else console.log(`${TAG} ui-mode ${currentUiMode} entered but no savedata yet`);
    }
    isBattleActive = currentUiMode === 'COMMAND' || currentUiMode === 'MESSAGE' || currentUiMode === 'CONFIRM';
  } catch (e) {
    console.error(`${TAG} handleUiModeChange error`, e);
  }
}

(function observeTouchControls() {
  try {
    const el = document.getElementById('touchControls');
    if (!el) {
      const poll = setInterval(() => {
        const e2 = document.getElementById('touchControls');
        if (e2) {
          clearInterval(poll);
          const initial = e2.getAttribute('data-ui-mode');
          handleUiModeChange(initial);
          const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
              if (m.type === 'attributes' && m.attributeName === 'data-ui-mode') {
                handleUiModeChange(e2.getAttribute('data-ui-mode'));
              }
            }
          });
          observer.observe(e2, { attributes: true });
        }
      }, 300);
    } else {
      const initial = el.getAttribute('data-ui-mode');
      handleUiModeChange(initial);
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'data-ui-mode') {
            handleUiModeChange(el.getAttribute('data-ui-mode'));
          }
        }
      });
      observer.observe(el, { attributes: true });
    }
  } catch (e) {
    console.error(`${TAG} observeTouchControls error`, e);
  }
})();

function findBattle(): void {
  try {
    const candidates = Object.values(window).filter(
      (obj) => obj && typeof obj === 'object' && (obj as LooseValue).player && (obj as LooseValue).enemy && Array.isArray(((obj as LooseValue).player as LooseValue).moveset)
    ) as LooseValue[];
    if (candidates.length > 0) {
      const battle = candidates[0] as LooseValue;
      if (battle !== lastBattle) {
        lastBattle = battle;
        updateUI(battle);
      } else {
        updateUI(battle);
      }
    }
  } catch (err) {
    // swallow
  }
}
setInterval(findBattle, 500);
