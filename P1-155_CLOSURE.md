# P1-155 Closure — bounded DOM candidate enumeration

Status: REGRESSION

Existing 5000-element restore limits no longer allocate an unbounded Array before slicing. Top-document and frame-agent locator restore use indexed bounded tag collections; cross-origin candidate enumeration and link-density work also avoid the previous spread-before-limit pattern. Dedicated regression: `project_tools/test_p1_155_bounded_dom_enumeration.js`.
