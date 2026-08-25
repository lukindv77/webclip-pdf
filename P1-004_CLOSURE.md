# P1-004 closure — cross-origin iframe with granted host permissions

Status: **REGRESSION**

## Problem

Top-frame JavaScript cannot read a cross-origin iframe DOM because of Same-Origin Policy. A host permission does not magically make `iframe.contentDocument` readable from page code, so the feature requires code executing inside the permitted frame.

## Implemented

- Manifest V3 `optional_host_permissions`: `http://*/*`, `https://*/*`; no install-time grant and version remains `0.9.8`.
- Popup action `Разрешить доступ к cross-origin iframe`; discovers bounded distinct inaccessible HTTP(S) frame origins and requests at most 16 host patterns per user action.
- `frame-agent.js` runs only in child frames whose parent DOM is SOP-blocked; same-origin children exit immediately.
- Service worker frame registry is bounded to 64 frames/tab and validates `frameId`, host permission and current `documentId`; tab navigation/removal clears registry.
- Top content maps a remote browser frame to an inaccessible DOM iframe by exact URL, with unique-origin fallback; ambiguity fails closed.
- Remote Include/Exclude counts participate in UI and `SelectionSnapshot v3`; persisted locators contain the outer `framePath`, not transient frameId/documentId.
- Restore resolves the outer frame fail-closed and delegates the remaining locator to the registered agent.
- PDF prepare delegates to selected agents, temporarily expands the outer iframe using bounded reported document height, adds print-only selection CSS in the frame, and rolls changes back after print.
- Re-injecting an already loaded agent re-registers it, covering MV3 service-worker restart.

## Verification

- 57/57 JavaScript `node --check` PASS.
- 46/46 deterministic `project_tools/test_*.js` PASS.
- `browser_p1_004_cross_origin_iframe.py` PASS on Chromium 144.0.7559.96 with an opaque-origin sandbox frame that is unreadable from top DOM: remote Include, v3 framePath, restore and print preparation PASS; long frame expanded to 944 px.
- P1-001 browser regression PASS.
- P1-003 browser regression PASS.
- P1-007 managed integration PASS; selected-only PDF 37,499 bytes; Journal/Yandex mocks PASS.

## Remaining release QA

Enterprise policy in the audit environment blocks normal unpacked-extension/local HTTP navigation, so actual Chrome permission prompt + unpacked MV3 + real HTTP(S) cross-origin iframe must still be checked during release QA, including permission deny/revoke, navigation and frame reload. No policy bypass was used.
