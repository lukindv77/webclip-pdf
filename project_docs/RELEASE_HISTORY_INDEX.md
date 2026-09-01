# Release history index — WebClip

This file is the canonical navigation index for historical GitHub Releases that are intentionally retained as reproducible engineering evidence. It does **not** make a historical pre-release current, and it does not replace `TEST_STATUS.md` or `RESEARCH_REGISTRY.md`.

Inventory checkpoint: 2026-08-29, based on the GitHub Releases API for `lukindv77/webclip-pdf`.

## Retention decision

The seven currently published `0.9.8` pre-releases are retained. They are not repository clutter in the same sense as generated ZIPs committed into the working tree: each Release keeps a binary artifact outside Git, an exact historical source commit, a recorded build gate and an artifact SHA-256. The P1-149…P1-153 sequence is also the reproducible binary trail for the real `its.1c.ru` clipping investigation.

`TEST_EVIDENCE.md` and `RESEARCH_EVIDENCE.md` preserve the durable meaning of those checkpoints, but they do not substitute for the executable ZIP snapshot itself. Therefore deleting these Releases or their assets would reduce historical reproducibility.

| Tag / Release | Source commit | Recorded build gate | ZIP SHA-256 | Evidence role | Disposition |
|---|---|---|---|---|---|
| `v0.9.8-build-20260825-1442` | `a704b2a2ca9977c0515cec3fd7a6b5563be285e5` | 68/68 JS syntax; 55/55 deterministic | `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4` | Earliest retained published 0.9.8 build checkpoint in the current Release set. | RETAIN |
| `v0.9.8-build-20260825-1810-diag` | `286588a18196821428ef31b6f284ff12c3261ac8` | 79/79 JS syntax; 66/66 deterministic | `548765e7fe1d43fc933f8083fe4684fc703389b6c3119dfeb806e93ec0a7fd2e` | P1-147/P1-148 structural OperationLog + linked Journal diagnostic build for the real clipping investigation. | RETAIN |
| `v0.9.8-build-20260825-1825-p1-149-diag` | `2c37e9f4530c49eab222f89891d69271ad2af94b` | 80/80 JS syntax; 67/67 deterministic | `4baf60ac40421455df41cfedaa7ea7d50af46e32df0e636f0d4b43fb6b9c23e5` | P1-149: selected same-origin iframe/ancestor print-flow normalization after the real header-only PDF repro. | RETAIN |
| `v0.9.8-build-20260825-1837-p1-150-diag` | `ab217c56d7ba1d4f0ff58c329a1a70203e25a676` | 81/81 JS syntax; 68/68 deterministic | `bf4450cb8b07fedc3337e095ff0d5bf77667b1cfc89affd2ff0be9a5c8b1766a` | P1-150: post-layout iframe height diagnostic checkpoint. | RETAIN |
| `v0.9.8-build-20260825-1848-p1-151-diag` | `dbcd148b31f09e3788a615230161e75ff353a6e0` | 82/82 JS syntax; 69/69 deterministic | `60eb015b9150566bdc4c5e6853e068d4e89867bd7d961619718930416ee905e4` | P1-151: flattened same-origin iframe-body proxy checkpoint proving iframe replaced-element pagination was still insufficient. | RETAIN |
| `v0.9.8-build-20260825-1912-p1-152-diag` | `ff0f712abb3c9b484312105c61a0bc6068a959f6` | 83/83 JS syntax; 70/70 deterministic | `691b138fd499735ddbe6380796734b320de75922c5786f58a7b78e8bfbfba6b6` | P1-152: top-body flattened-proxy mount checkpoint after proving the ancestor shell still constrained pagination. | RETAIN |
| `v0.9.8-build-20260825-1935-p1-153-diag` | `558618b8ff0ab382008e6bcf800a97aaf07a5053` | 84/84 JS syntax; 71/71 deterministic | `5bea0e810d9d32f3732786d399ef01819db41bf891e571288ef340bc26873586` | P1-153: diagnostic build associated with the real 2-page `its.1c.ru` clipping closure checkpoint. | RETAIN |

All seven are historical pre-releases. None of these rows claims current release QA, current-source test rerun, real Yandex E2E, or that later research findings are closed.

## Cleanup policy for Releases and tags

A historical Release may be deleted only after an explicit retirement comparison proves all of the following:

1. its exact source commit remains permanently reachable through retained Git history/tag policy;
2. its binary artifact has no remaining reproducibility value, or an intentionally retained replacement artifact is recorded;
3. artifact SHA-256, build gate, purpose and unique browser/product observations are preserved in current evidence/history documents;
4. deletion will not erase the only practical artifact for a real-world reproduction sequence;
5. the change is reviewed separately from runtime development and does not silently rewrite current research status.

Until those conditions are proven, the safe default is **retain**.

New user-facing releases must follow `BUILD_AND_RECOVERY_RULES.md` and `GITHUB_WORKFLOW.md`: exact tested source commit, explicit release decision, checksums, and no promotion of deterministic CI to real Chrome/Yandex release QA.

Existing historical tag type/signature state is not reclassified by this index. Do not call a tag signed or verified unless GitHub/Git verification actually proves it.
