# P1-159 Closure — large-result extension-page rendering

Status: REGRESSION

OperationLog search is debounced 120 ms; list DOM is appended in 80-row animation-frame batches using fragments; multi-MiB pretty JSON is cached/materialized only on explicit Show/Copy; linked Journal OperationLog avoids duplicate stringify; domain filter construction is detached before a single append. Permanent diagnostic fields are unchanged. Dedicated regression: `project_tools/test_p1_159_large_result_render.js`.
