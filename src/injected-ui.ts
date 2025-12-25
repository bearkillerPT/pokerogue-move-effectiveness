const TAG = "[PME injected-ui]";

export function ensureOverlay(): HTMLElement {
  const existing = document.getElementById("pme-overlay");
  if (existing) return existing;
  const d = document.createElement("div");
  d.id = "pme-overlay";
  d.style.display = "none";
  document.body.appendChild(d);
  return d;
}

export function updateOverlay(
  movesInfo: Array<{
    name?: string | null;
    id?: number;
    values: Array<{ text: string; cls: string }>;
  }>,
  enemyNames: string[]
) {
  const overlay = ensureOverlay();
  if (!movesInfo || movesInfo.length === 0) {
    overlay.innerHTML =
      '<div class="pme-line"><div class="pme-name">No moves detected</div><div class="pme-val">-</div></div>';
    overlay.style.display = "block";
    return;
  }
  overlay.innerHTML = "";
  if (Array.isArray(enemyNames) && enemyNames.length > 0) {
    const header = document.createElement("div");
    header.className = "pme-header";
    const moveLabel = document.createElement("div");
    moveLabel.className = "pme-name";
    moveLabel.textContent = "Move";
    const cols = document.createElement("div");
    cols.className = "pme-cols";
    for (const en of enemyNames) {
      const colTitle = document.createElement("div");
      colTitle.className = "pme-col-title";
      colTitle.textContent = en || "Enemy";
      cols.appendChild(colTitle);
    }
    header.appendChild(moveLabel);
    header.appendChild(cols);
    overlay.appendChild(header);
  }
  for (const mi of movesInfo) {
    const line = document.createElement("div");
    line.className = "pme-line";
    const name = document.createElement("div");
    name.className = "pme-name";
    name.textContent = mi.name || "(unknown)";
    const cols = document.createElement("div");
    cols.className = "pme-cols";
    const values = Array.isArray(mi.values) ? mi.values : [];
    for (const v of values) {
      const val = document.createElement("div");
      val.className = `pme-val ${v.cls || ""}`;
      val.textContent = v.text || "";
      cols.appendChild(val);
    }
    line.appendChild(name);
    line.appendChild(cols);
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