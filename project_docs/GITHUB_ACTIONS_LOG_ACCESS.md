# GitHub Actions log access — WebClip

Canonical private repository: `lukindv77/webclip-pdf`.

This document supplements `project_docs/GITHUB_WORKFLOW.md`. It defines the permanent operational procedure for retrieving, validating and using GitHub Actions logs and diagnostic artifacts as project evidence. It does not by itself change `RESEARCH_REGISTRY.md`, P-code ownership/status, runtime, manifest, version, release or deployment policy.

The source instruction for this procedure is the user-approved universal GitHub Actions log-access instruction dated 2026-09-10. The procedure below preserves that instruction and adds project-specific rules where completeness, exact Git identity or evidence quality requires going beyond the minimum path.

## 1. Required permissions

For automated read access through a GitHub App or fine-grained token, the minimum expected permissions are:

- **Actions: Read** — workflow runs, jobs, step metadata, logs and artifacts;
- **Contents: Read** — strongly required for WebClip so the workflow and code can be read at the exact executed commit.

For rerunning a workflow or job:

- **Actions: Write** is required.

For ordinary human viewing through the GitHub web UI, a separate token is not required beyond repository/Actions access.

Never request, paste, persist or expose in chat/project evidence:

- PATs;
- OAuth tokens;
- GitHub App private keys;
- `GITHUB_TOKEN` values;
- Authorization headers;
- other bearer credentials or secrets.

Permission capability must be verified by the narrowest real operation when needed; repository-level `push`/`admin` metadata is not a substitute for testing Actions-specific read/write capability.

## 2. Exact commit SHA first

CI diagnosis is bound to an exact Git commit, not merely a branch name.

Before interpreting logs, identify at least:

```text
repository
commit SHA
workflow run ID
job ID
```

Also record when available:

```text
workflow name/path
run number
run attempt
branch
event
job name
status/conclusion
```

A branch name is navigation only. The exact `head_sha` is the identity anchor for executed code.

For pull-request workflows, distinguish the PR head SHA from a synthetic PR merge SHA when the runner checks out `refs/pull/.../merge`. Claims must identify which SHA was actually executed.

## 3. Human GitHub UI path

For manual diagnosis:

```text
Repository -> Actions -> workflow run -> job -> step
```

Verify at least:

```text
branch
commit SHA
workflow name
run number
status/conclusion
```

Then open the relevant job and inspect the command output of the relevant step. When GitHub offers full-job-log download, it may be used as an additional manual path.

The UI path is useful for humans, but automated project work should prefer exact authenticated API/connector reads so evidence can be bound reproducibly to IDs and SHAs.

## 4. Primary automated REST/API retrieval chain

The normal automated sequence is:

1. Start from exact commit SHA.
2. Find the workflow run for that SHA.
3. Enumerate jobs for the exact run:

   `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`

4. Record the relevant `job_id`, name, status, conclusion and step states.
5. After the job is completed, fetch the full job log:

   `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`

6. Follow GitHub's temporary redirect to log storage and decode the returned text.
7. Read actual stdout/stderr, warnings, errors, assertions and stack traces.
8. Bind every evidence claim to exact `run_id`, `job_id`, `head_sha` and, where relevant, `run_attempt`.

For matrix or multi-job workflows, enumerate and inspect every job relevant to the claim. One successful job does not prove sibling jobs that were not inspected.

## 5. GitHub CLI path

When a local environment with authenticated `gh` is available, the equivalent manual/interactive commands are:

```bash
gh auth login
gh run list
gh run view RUN_ID
gh run view RUN_ID --log
gh run view RUN_ID --log-failed
gh run download RUN_ID
```

This is a convenience path. For ChatGPT/automated-agent work, use the connected authenticated GitHub capability when available rather than asking the user to expose credentials or reproduce logs manually.

## 6. Metadata is navigation, not a substitute for logs

Run metadata, job metadata and step summaries are sufficient for questions such as whether a run/job completed and what its high-level conclusion was.

They are not equivalent to the full job log when a claim depends on:

- exact test output or case count;
- stdout/stderr text;
- warning/error details;
- assertion messages;
- stack traces;
- exact command output;
- runner/browser/runtime versions printed by execution;
- an expected negative/error condition inside a successful test;
- distinguishing fixture failure from product/test assertion failure.

A returned field such as `logs_url: null` is not proof that logs are unavailable. The dedicated authenticated job-log read must be attempted before declaring log access unavailable.

`Process completed with exit code 1` is never sufficient diagnosis when more specific output can be retrieved.

## 7. Temporary raw-log unavailability

Raw job logs can be temporarily unavailable during execution or immediately after job completion/finalization.

Typical transient symptoms include:

```text
404
BlobNotFound
expired redirect
temporary storage error
```

These are not, by themselves, proof of missing authorization.

Required response:

1. verify the exact run/job identity;
2. verify that the job is completed when the endpoint requires finalization;
3. retry the authenticated log request after the job/log finalizes;
4. verify Actions read capability;
5. use the diagnostic artifact fallback when available;
6. only then classify the raw log as unavailable for the current evidence attempt.

Do not treat unauthenticated/public-web 404s as authoritative for this private repository.

## 8. Diagnostic artifacts are the required fallback path

Raw Actions logs are the primary channel. Diagnostic artifacts are the fallback channel for test evidence.

For important test/diagnostic workflows that we create or materially revise, provide an artifact fallback unless there is a documented reason not to. The preferred pattern is:

```text
command stdout/stderr -> normal Actions log
same diagnostic output -> bounded file
original command/test exit code preserved
artifact upload -> if: always()
artifact name -> includes exact github.sha
short retention -> normally 7 days unless evidence needs justify another value
```

A representative implementation pattern is:

```yaml
- name: Test
  shell: pwsh
  run: |
    New-Item -ItemType Directory -Force -Path artifacts | Out-Null

    & dotnet test MySolution.sln --configuration Release 2>&1 |
      Tee-Object -FilePath artifacts/test-output.txt

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
      exit $exitCode
    }

- name: Upload test diagnostics
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-output-${{ github.sha }}
    path: artifacts/test-output.txt
    retention-days: 7
```

Project-specific supply-chain rules still apply: external actions must be pinned/approved according to the repository's CI hygiene policy rather than copied literally with a floating tag when committed to WebClip.

Artifacts supplement raw logs; they do not silently replace exact run/job/log identity.

If an existing workflow has no diagnostic artifact, report that fact. Do not claim artifact fallback evidence exists when the run contains no artifact.

## 9. Artifact retrieval

List artifacts for the exact run:

`GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts`

Record at least:

```text
artifact id
artifact name
run id
head SHA
expired/not expired state when available
```

Download the exact artifact:

`GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip`

Follow redirects and inspect the bounded diagnostic file inside the ZIP.

Artifact evidence must remain bound to the run/SHA that produced it; never reuse a similarly named artifact from another run as a substitute.

## 10. Minimum failure evidence before code changes

Before changing product/test code in response to CI failure, collect as much of the following as the available evidence supports:

```text
exact commit SHA
workflow run ID / attempt
failed job name / job ID
failed step name
exact command
failed test name, when tests are involved
full error / assertion message
stack trace
exit code
```

When the raw log is available, read it before proposing the fix. When raw log is temporarily unavailable, inspect the diagnostic artifact fallback before editing code.

Do not infer the failed assertion from a step name, job conclusion or generic exit code.

## 11. Recommended diagnosis sequence

```text
exact commit SHA
        ↓
workflow run
        ↓
job
        ↓
failed step
        ↓
raw decoded job log
        ↓
diagnostic artifact if raw log is unavailable/incomplete
        ↓
exact error / assertion / stack trace
        ↓
source/workflow at the same exact SHA
        ↓
root-cause analysis
        ↓
fix
        ↓
new CI run on a new exact SHA
        ↓
read the new job log again
```

This sequence is a normal path, not an artificial ceiling. Use additional authenticated read-only GitHub data when required for completeness.

## 12. Going beyond the basic procedure

When necessary, inspect additional authenticated evidence including:

- workflow-run attempts and previous attempts;
- all jobs in a matrix/multi-job run;
- exact step summaries;
- full decoded per-job logs;
- run artifacts and their contents;
- commit/PR check/status metadata;
- the exact workflow source at the executed SHA;
- code/test source at the same SHA;
- compare/diff metadata between the failing SHA and a candidate fix;
- post-merge run/log evidence on the canonical `main` commit.

If one convenience wrapper is unavailable, use an equivalent authenticated GitHub REST read path rather than silently downgrading to status-only evidence.

Do not use raw-log success to upgrade a WebClip evidence class beyond what the execution environment actually proves.

## 13. Security and retention

Never place the following into diagnostic artifacts or durable evidence:

```text
environment-variable dumps
tokens
PATs
OAuth credentials
GitHub App private keys
GITHUB_TOKEN values
Authorization headers
SSH keys
signing certificates
database dumps
production user data
cloud credentials
GitHub secrets
signed Yandex transfer URLs or equivalent bearer capabilities
```

Treat artifacts as accessible to users who have the corresponding repository/Actions permissions.

Use short retention for temporary diagnostics; `7 days` is the default target for newly created diagnostic artifacts unless a project-specific evidence requirement justifies another value.

Do not commit complete raw Actions logs merely because they can be retrieved. Persist only bounded, sanitized evidence receipts/summaries when durable evidence is necessary.

Do not rely solely on GitHub masking. Inspect and sanitize any excerpt before persisting it.

## 14. Permanent automated-agent strategy

For future WebClip work the assistant/agent must:

1. obtain the exact SHA first;
2. find the workflow run for that SHA;
3. enumerate jobs;
4. identify failed/relevant jobs and steps;
5. attempt the full decoded raw job log;
6. if raw log is unavailable/incomplete, enumerate and inspect the exact run's diagnostic artifact;
7. extract the precise test/error/assertion/stack information;
8. read the exact workflow/code at the same SHA when necessary;
9. only then modify code;
10. validate the candidate fix with a new CI run on the new exact SHA;
11. inspect the new log rather than relying only on a green status.

If a claim depends only on high-level run/job conclusion, authenticated metadata may be sufficient. If a claim depends on what a command/test/browser actually reported, full log/artifact evidence is required when available.

## 15. Access verification — 2026-09-10

The connected GitHub capability has been physically verified against the private repository.

### Contents: Read — PASS

The assistant successfully read the exact workflow source at canonical commit:

```text
repository  lukindv77/webclip-pdf
head_sha    c94251b6a0cfcaf3d2e5afa702f7c6689005e36b
path        .github/workflows/repository-integrity.yml
```

This confirms exact-commit content access rather than only repository metadata.

### Actions: Read — PASS

On the same canonical SHA, the assistant successfully performed:

```text
workflow-run discovery
job enumeration
step-summary read
full decoded job-log read
artifact-list read
```

Exact identity:

```text
run_id      34384920966
job_id      102578664088
head_sha    c94251b6a0cfcaf3d2e5afa702f7c6689005e36b
job         repository-integrity
conclusion  success
```

The full log contained real stdout/stderr and exact test output, including:

```text
Repository consistency PASS: 0 errors, 0 warning(s).
Repository hygiene PASS: temporary evidence/workflow growth is bounded.
CI/supply-chain hygiene PASS: 2 workflow(s), external actions immutable, permissions read-only, Dependabot low-noise.
Executed 85 deterministic test files; failures=0.
Recovery archive self-test PASS
```

Artifact enumeration on that run succeeded and returned an empty artifact list. Therefore Actions artifact-read capability is available, while this specific run has no diagnostic artifact to fall back to.

### Actions: Write — PASS

The assistant physically tested rerun permission by rerunning the already completed research job:

```text
run_id        34383441967
original job  102573666736
head_sha      1cb89f2fd33182ee09e3612848c8a0b40ce06df4
```

The rerun request was accepted by GitHub and the workflow advanced to:

```text
run_attempt 2
```

This confirms Actions write permission for job rerun; it is not inferred merely from generic repository permissions.

### Previous read verification retained

The earlier research job log was also decoded successfully and contained:

```text
C0/C1 remote-save admission delta model: PASS; cases=40
C0/C1 controlled HTTP verification fixture: PASS; cases=7
```

## Verified capability result

```text
private repository read        PASS
Contents: Read                 PASS
Actions: Read                  PASS
workflow-run discovery         PASS
job enumeration                PASS
step-summary read              PASS
full decoded job-log read      PASS
stdout/stderr evidence access  PASS
artifact-list read             PASS
Actions: Write / job rerun     PASS
```

This is an operational GitHub-access verification. It is not a WebClip product L3/L4/L5 closure or release-readiness approval by itself.
