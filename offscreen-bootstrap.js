(() => {
  'use strict';

  // P0-065 fail-closed bootstrap: offscreen.js is loaded only after the
  // pre-Blob admission guard has successfully wrapped the message boundary.
  const result = globalThis.__webclipOffscreenBlobAdmissionInstallResult
    || globalThis.WebClipOffscreenBlobAdmissionGuard?.install?.();
  if (!result?.installed) {
    throw new Error(`P0-065 offscreen Blob admission guard unavailable: ${result?.reason || 'unknown reason'}`);
  }

  const script = document.createElement('script');
  script.src = 'offscreen.js';
  script.async = false;
  script.dataset.webclipOffscreenRuntime = '1';
  (document.head || document.documentElement).appendChild(script);
})();
