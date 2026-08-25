# P1-152 closure — top-document mount for flattened iframe print proxy

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Real `its.1c.ru` evidence after P1-151 proved the flattening itself worked: the linked OperationLog recorded `same-origin-body-proxy`, all 118 cloned elements styled, no style-budget truncation, and the full 3321 source text characters were present. The resulting PDF nevertheless remained one page and stopped at the start of the third example. This means the proxy content was preserved but pagination was still constrained by the original site's iframe ancestor shell.

P1-152 mounts the temporary same-origin selected-body proxy directly under the top document `body`, outside the source iframe's flex/grid/fixed-height/break context. The original iframe remains hidden only for the PDF interval and P1-149 rollback still restores its exact inline state. The selected-only stylesheet already treats every flattened proxy element as printable, so hidden original page shells do not affect proxy layout. `print.flattenedFrames[].mount` records `top-document-body` for real-browser evidence.

Dedicated regression: `project_tools/test_p1_152_top_body_flatten_mount.js`. Real `its.1c.ru` output remains required browser evidence and is not claimed by deterministic CI.
