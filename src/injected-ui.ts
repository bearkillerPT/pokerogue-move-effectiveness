const TAG = "[PME injected-ui]";

export function ensureOverlay(): HTMLElement {
  const existing = document.getElementById("pme-overlay");
  if (existing) return existing;
  const s = document.createElement("style");
  s.textContent = `#pme-overlay{position:fixed;top:12px;right:12px;z-index:2147483647;background:rgba(0,0,0,0.8);color:#fff;padding:10px 12px;border-radius:10px;font-size:18px;line-height:1.1;font-family:Arial,Helvetica,sans-serif;max-width:360px;pointer-events:none}#pme-overlay .pme-line{margin:6px 0;display:flex;justify-content:space-between;gap:12px;align-items:center}#pme-overlay .pme-name{opacity:0.95;font-size:18px}#pme-overlay .pme-val{font-weight:900;font-size:20px;padding:2px 8px;border-radius:6px;color:#fff}#pme-overlay .pme-super{background:#27ae60}#pme-overlay .pme-not-very{background:#e67e22}#pme-overlay .pme-immune{background:#c0392b}#pme-overlay .pme-neutral{background:#7f8c8d}`;
  document.head.appendChild(s);
  const d = document.createElement("div");
  d.id = "pme-overlay";
  d.style.display = "none";
  document.body.appendChild(d);
  return d;
}

export function updateOverlay(
  movesInfo: Array<{
    name?: string | null;
    text?: string;
    cls?: string;
    id?: number;
  }>
) {
  const overlay = ensureOverlay();
  // currentUiMode is managed by the orchestrator; overlay only shows in FIGHT mode
  // Caller should decide when to call updateOverlay based on UI mode.
  if (!movesInfo || movesInfo.length === 0) {
    overlay.innerHTML =
      '<div class="pme-line"><div class="pme-name">No moves detected</div><div class="pme-val">-</div></div>';
    overlay.style.display = "block";
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
}

export function clearBadges(): void {
  try {
    document.querySelectorAll(".pme-effectiveness").forEach((n) => n.remove());
  } catch (e) {
    /* noop */
  }
}

export function hideOverlay(): void {
  try {
    const o = document.getElementById("pme-overlay");
    if (o) o.style.display = "none";
  } catch (e) {
    /* noop */
  }
}

export function showOverlay(): void {
  try {
    const o = document.getElementById("pme-overlay");
    if (o) o.style.display = "block";
  } catch (e) {
    /* noop */
  }
}

export function observeTouchControls(
  onUiModeChange: (mode: string | null) => void
): void {
  try {
    const el = document.getElementById("touchControls");
    if (!el) {
      const poll = setInterval(() => {
        const e2 = document.getElementById("touchControls");
        if (e2) {
          clearInterval(poll);
          const initial = e2.getAttribute("data-ui-mode");
          onUiModeChange(initial);
          const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
              if (
                m.type === "attributes" &&
                m.attributeName === "data-ui-mode"
              ) {
                onUiModeChange(e2.getAttribute("data-ui-mode"));
              }
            }
          });
          observer.observe(e2, { attributes: true });
        }
      }, 300);
    } else {
      const initial = el.getAttribute("data-ui-mode");
      onUiModeChange(initial);
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && m.attributeName === "data-ui-mode") {
            onUiModeChange(el.getAttribute("data-ui-mode"));
          }
        }
      });
      observer.observe(el, { attributes: true });
    }
  } catch (e) {
    console.error(`${TAG} observeTouchControls error`, e);
  }
}
