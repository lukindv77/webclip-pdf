const manifest = chrome.runtime.getManifest();
const versionEl = document.getElementById('extensionVersion');
if (versionEl) versionEl.textContent = `WebClip PDF Prototype ${manifest.version}`;
