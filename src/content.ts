const injectContent = async () => {
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
