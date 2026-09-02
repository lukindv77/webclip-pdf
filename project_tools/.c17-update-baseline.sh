#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from pathlib import Path
p = Path('project_docs/RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md')
text = p.read_text(encoding='utf-8')
old = '| C17 | Cross-origin iframe capture/print boundary | `NOT-TRIAGED / UNKNOWN` |'
new = '| C17 | Cross-origin iframe capture/print boundary | `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)` |'
assert text.count(old) == 1, 'expected exactly one untouched C17 matrix row'
text = text.replace(old, new)
marker = '\n## Delivery rule\n'
assert text.count(marker) == 1, 'expected one Delivery rule marker'
section = '''

## Fresh continuation checkpoint — focused C17 Cross-origin iframe

`RESEARCH_FULL_RESTART_C17_CROSS_ORIGIN_IFRAME_2026-09-02.md` records the accepted C17 exact-source physical tranche on canonical source `f1f5de60d7de901eb8249ae3376b07c29a196961`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, exact `frame-agent.js` blob `ce55145dc7ee1a4abf485b7fad3134ac39b61751`, Google Chrome `151.0.7922.173`, workflow run `33596133152`, job `100139834463`, conclusion SUCCESS and result JSON SHA-256 `e85ec2f6f72e204de597ba5811abe27e7d1dd9db3bca448c7f83ab72948fe896`.

The one-level remote positive control receives one Include plus one nested Exclude and reaches current print preparation. Under the worker-shaped `screen` media cut, all 120 selected rows remain but the physical PDF also contains the explicit Exclude and 159 unselected child rows. The same prepared document under causal `print` media preserves 120/120 selected rows while omitting Exclude and all unselected child rows. Fresh source inspection confirms the cause: the child selected-only stylesheet is scoped to `@media print`, while the worker explicitly sets CDP media to `screen`; remote height is also measured before that selected-only representation becomes effective. This directly revalidates existing **P1-229 ACTIVE**.

A nested `top A -> cross-origin outer B -> same-origin inner B` control shows the outer agent active and selectable while the inner agent self-exits because its immediate parent is same-origin; top recursion cannot cross the outer SOP boundary, so inner selection remains unchanged. This strengthens existing **P1-004 ACTIVE** umbrella rather than allocating a new P-code. A supplementary geometry development run is retained only as rejected-harness provenance: after top had already expanded the iframe, child `scrollHeight` was lower-bounded by that viewport, invalidating a post-hoc shrink assertion; it does not change the accepted primary C17 result.

C17 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)`. Existing permission/session/print-generation/rollback owners remain open and C46 real unpacked permission/debugger UI is not claimed exercised. C18 — Shadow DOM / slots / composed tree — is the next sequential untriaged coordinate.
'''
text = text.replace(marker, section + marker)
p.write_text(text, encoding='utf-8')
PY
git diff --check
git diff -- project_docs/RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md
