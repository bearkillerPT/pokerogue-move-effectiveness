(() => {
  // Load the bundled moves DB, expose it as window.__PME_MOVES, then inject injected.js
  (async function () {
    try {
      // Inject a module-based bootstrapper that imports the packaged
      // `moves.js` and assigns it to window.__PME_MOVES. Using an external
      // module file avoids CSP blocks on inline scripts.
      const boot = document.createElement('script');
      boot.type = 'module';
      boot.src = chrome.runtime.getURL('moves-bootstrap.js');
      (document.head || document.documentElement).appendChild(boot);
      // keep it in DOM briefly; page will load it and it will run
      boot.addEventListener('load', () => {
        try {
          boot.remove();
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[PME] could not inject moves bootstrap module', e);
    }
    // inject stylesheet into the page so injected elements get styled
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('styles.css');
      (document.head || document.documentElement).appendChild(link);
    } catch (e) {
      // fail silently
    }
    // finally inject the main script into the page context
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.type = 'text/javascript';
      script.onload = () => script.remove();
      document.documentElement.appendChild(script);
      console.log('[PME] injected.js loaded into page context');
    } catch (e) {
      console.warn('[PME] error injecting main script', e);
    }
  })();
})();
