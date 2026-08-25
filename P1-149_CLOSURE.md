# P1-149 closure — selected iframe print-flow normalization

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Real diagnostic evidence from `its.1c.ru` showed the only Include was `body` inside a same-origin iframe (`frameDepth=1`, `topDocumentIncludeCount=0`), while the iframe body contained 3324 text chars / 983 px scroll height but the top print document stayed at viewport height. Chromium therefore produced a valid PDF containing only the WebClip header.

`content.js` now snapshots each selected iframe/ancestor-chain inline `style` plus WebClip frame marker attributes, then temporarily normalizes that exact selected chain into normal print flow: frame and ancestors become `position:static`, clipping/contain/transform are neutralized, overflow becomes visible, content-visibility is forced visible, the frame becomes block-level with its measured document height and bounded full width. Ancestor display is preserved from the current screen computed style. After PDF, all inline style and marker attributes are restored exactly. Unrelated page nodes are untouched; Include/Exclude filtering remains unchanged.

Dedicated regression: `project_tools/test_p1_149_iframe_print_flow.js`. Real `its.1c.ru` PDF output remains required browser evidence after a new diagnostic build and is not claimed by deterministic CI.
