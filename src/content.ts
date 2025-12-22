const injectContent = async () => {
  try {
    const boot = document.createElement("script");
    boot.type = "module";
    boot.src = chrome.runtime.getURL("dist/moves-bootstrap.js");
    (document.head || document.documentElement)!.appendChild(boot);
    boot.addEventListener("load", () => {
      try {
        boot.remove();
      } catch (e) {
        console.warn("[PME] could not remove moves bootstrap module script", e);
      }
    });
  } catch (e) {
    console.error("[PME] could not inject moves bootstrap module", e);
  }

  try {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/styles.css");
    (document.head || document.documentElement)!.appendChild(link);
  } catch (e) {
    console.error("[PME] error injecting styles", e);
  }

  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("dist/injected.js");
  // load as an ES module because the compiled file contains module markers
  // (e.g. `export {}`) which cause a syntax error when loaded as a plain script.
  script.type = "module";
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
    // eslint-disable-next-line no-console
    console.log("[PME] injected.js loaded into page context");
  } catch (e) {
    console.error("[PME] error injecting main script", e);
  }
};

injectContent();
