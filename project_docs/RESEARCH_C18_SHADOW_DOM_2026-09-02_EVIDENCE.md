# Research evidence receipt — C18 Shadow DOM / slots / composed tree — 2026-09-02

Canonical source baseline: `3082da345ad49f10969211d20ad45d04bbb1238f`.

Focused coordinate: **C18 — Shadow DOM / slots / composed tree**.

Canonical owner reconciliation: **P2-006 BACKLOG — Shadow DOM as explicit selection scope.** No new P-code and no P0/P1 status transition.

Accepted exact-source physical gate:

- Google Chrome `151.0.7922.173`;
- workflow run `33599090493`;
- job `100148598093`;
- exact evidence head `2db00d627ca72b2281e8ac89e29a970e2629a49c`;
- conclusion `SUCCESS`;
- exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- preceding raw-observation result SHA-256 `306235c864a52225f5de85f93c6728e362be5db2d4affca9880e920d8834fb53`.

Fresh evidence proves:

1. a composed click on an open-shadow internal node is observed by current WebClip selection as the light-DOM host;
2. an attempted internal Shadow Exclude cannot create an internal Exclude and leaves the host Include intact;
3. a slotted light-DOM node remains independently selectable;
4. a closed-shadow internal click likewise resolves to the host;
5. selecting the open-shadow host physically prints both shadow descendants and the slotted node while excluding an outside light-DOM sibling.

Therefore C18 advances to `L4-REVALIDATED / FINDING + POSITIVE PHYSICAL CONTROL (P2-006)`. The finding is explicit-selection scope, not a blanket Chromium/PDF inability to render Shadow DOM.

Detailed evidence and non-claims: `RESEARCH_FULL_RESTART_C18_SHADOW_DOM_2026-09-02.md`.

Production runtime, `manifest.json`, version and release readiness are unchanged.
