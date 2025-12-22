const injectContent = async () => {
  try {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("src/styles.css");
    (document.head || document.documentElement)!.appendChild(link);
  } catch (e) {
    console.error("[PME] error injecting styles", e);
  }

  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("dist/injected.js");
    script.type = "module";
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
    console.log("[PME] injected.js loaded into page context");
  } catch (e) {
    console.error("[PME] error injecting main script", e);
  }
};

injectContent();
