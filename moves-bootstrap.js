// small bootstrap module that imports the packaged moves DB and exposes it
// to the page context as window.__PME_MOVES. Using a module file avoids CSP
// blocking inline scripts.
(async function () {
  try {
    // import the extension-packaged module; relative import resolves to the
    // same extension origin where this file is served from.
    const mod = await import('./moves.js');
    const moves = mod && mod.default ? mod.default : mod;
    try {
      window.__PME_MOVES = moves;
      console.log('[PME] moves DB injected to page as window.__PME_MOVES');
    } catch (e) {
      console.warn('[PME] could not assign moves DB to window', e);
    }
  } catch (e) {
    console.error('[PME] failed to import moves.js', e);
  }
})();
