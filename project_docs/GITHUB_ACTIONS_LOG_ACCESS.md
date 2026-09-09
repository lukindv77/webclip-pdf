# GitHub Actions log access — WebClip

Canonical private repository: `lukindv77/webclip-pdf`.

This document supplements `project_docs/GITHUB_WORKFLOW.md`. It defines the operational procedure for retrieving and using GitHub Actions logs as project evidence. It does not change `RESEARCH_REGISTRY.md`, P-code ownership/status, runtime, manifest, version, release or deployment policy.

## Mandatory retrieval chain

When a conclusion depends on what a GitHub Actions job actually printed or executed, use the authenticated GitHub Actions API/connected GitHub capability and follow this chain:

1. Identify the exact workflow run and bind it to:
   - `run_id`;
   - workflow name/path;
   - exact `head_sha`;
   - branch/event;
   - run attempt where applicable.
2. Enumerate the jobs for that exact run and record each relevant:
   - `job_id`;
   - job name;
   - status/conclusion;
   - step list/status.
3. Fetch the **full decoded job log** for every job whose stdout/stderr matters. The canonical REST shape is:

   `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`

   The GitHub service may answer with a temporary redirect; the connected GitHub log reader may follow that redirect and return decoded text directly.
4. Read the actual stdout/stderr, warnings, errors and exact PASS/FAIL output from the full log. Bind every evidence claim to the exact `run_id`, `job_id` and `head_sha`.
5. For matrix or multi-job workflows, enumerate and inspect every job relevant to the claim. One successful job is not proof for uninspected sibling jobs.

## Metadata is navigation, not a substitute for logs

Run metadata, job metadata and step summaries are sufficient for questions such as whether a run/job completed and what its high-level conclusion was.

They are **not** equivalent to the full job log when a claim depends on:

- exact test output or case count;
- stdout/stderr text;
- warnings or stack traces;
- exact browser/runtime versions printed by the runner;
- exact command output;
- an expected negative/error condition inside a successful test;
- distinguishing a fixture defect from a product/test assertion failure.

A returned job field such as `logs_url: null` is not proof that logs are unavailable. The dedicated job-log endpoint/read operation must be attempted before declaring log access unavailable.

## Private-repository rule

`lukindv77/webclip-pdf` is private. Repository/run/job/log reads must use the connected authenticated GitHub capability/API.

A failure or 404 from unauthenticated/public web access is not authoritative evidence that a private run, job or log does not exist.

## Going beyond the basic procedure

The retrieval sequence above is the normal path, not an artificial limit. When completeness requires it, use additional authenticated read-only GitHub Actions data, including:

- workflow-run metadata and attempts;
- complete job enumeration;
- job step summaries;
- full decoded per-job logs;
- workflow artifacts and their exact run association;
- commit/PR status/check metadata;
- exact workflow source at the executed commit;
- comparison with the exact commit tree or deterministic test source.

Artifacts supplement logs when they contain required physical evidence; they do not replace logs for stdout/stderr claims. Conversely, a successful log line does not upgrade an evidence class beyond what the executed environment actually proves.

If one convenience wrapper is unavailable, use the equivalent authenticated GitHub REST read path rather than silently downgrading to run-status-only evidence.

## Security and retention

Do not commit raw complete Actions logs into the repository merely because they can be retrieved.

Rules:

- treat raw logs as transient evidence input;
- commit only bounded, necessary evidence receipts/summaries when durable evidence is required;
- never persist OAuth/session tokens, Authorization headers, PKCE secrets, signed Yandex transfer URLs or other bearer capabilities;
- do not rely solely on GitHub masking: inspect/sanitize any excerpt before persisting it;
- preserve exact `run_id`, `job_id`, `head_sha` and relevant PASS/FAIL facts so the original GitHub log remains recoverable while available.

The Git tree remains the canonical source of project state; Actions logs are execution evidence bound to exact Git identities.

## Permanent assistant operating rule

For future WebClip work:

- if a claim depends only on run/job conclusion, authenticated metadata may be enough;
- if a claim depends on what a command/test/browser actually reported, fetch the full decoded job log before making the claim;
- do not infer missing stdout/stderr from step names;
- do not claim logs are inaccessible until the dedicated authenticated job-log read has been attempted;
- use additional authenticated read-only GitHub endpoints when necessary for completeness and truthful evidence.

## Access verification — 2026-09-10

The connected GitHub capability was physically checked against two jobs in the private repository.

### Research job

```text
run_id   34383441967
job_id   102573666736
head_sha 1cb89f2fd33182ee09e3612848c8a0b40ce06df4
job      research
```

The full decoded job log was retrieved successfully and contained actual stdout including:

```text
C0/C1 remote-save admission delta model: PASS; cases=40
C0/C1 controlled HTTP verification fixture: PASS; cases=7
```

It also exposed the seven individual fixture PASS lines, proving access to full job output rather than only step metadata.

### Permanent `main` integrity job

```text
run_id   33825994857
job_id   100878666130
head_sha d4f5b268fa3f7ced5a7bc68da52784863d614138
job      repository-integrity
```

The full decoded job log was also retrieved successfully. Among other real outputs it contained:

```text
Repository consistency PASS: 0 errors, 0 warning(s).
Repository hygiene PASS: temporary evidence/workflow growth is bounded.
CI/supply-chain hygiene PASS: 2 workflow(s), external actions immutable, permissions read-only, Dependabot low-noise.
Executed 85 deterministic test files; failures=0.
Recovery archive self-test PASS
```

This second check confirms that log access is not limited to the temporary research workflow.

## Verified capability result

```text
private repository read        PASS
workflow-run discovery         PASS
job enumeration                PASS
step-summary read              PASS
full decoded job-log read      PASS
stdout/stderr evidence access  PASS
```

This is an operational GitHub-access verification. It is not a WebClip product L3/L4/L5 closure by itself.
