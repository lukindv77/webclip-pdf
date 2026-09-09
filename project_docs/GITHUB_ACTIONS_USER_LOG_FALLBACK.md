# GitHub Actions — user-assisted log fallback

Canonical private repository: `lukindv77/webclip-pdf`.

This document is a mandatory supplement to `project_docs/GITHUB_ACTIONS_LOG_ACCESS.md`. It extends the permanent GitHub Actions diagnostic procedure with an explicit user-assisted fallback when the connected GitHub capability cannot retrieve all evidence required for a trustworthy diagnosis.

The rule is user-approved as of 2026-09-10.

## 1. Principle

The assistant must use available authenticated GitHub capabilities first: exact SHA, workflow run, jobs, steps, full decoded job logs, artifacts, workflow/code at the executed commit and other relevant read paths.

The user must not be asked to manually retrieve logs that the assistant can already obtain through the connected GitHub capability.

If required evidence is unavailable, incomplete, truncated, expired, inaccessible through the connected capability, or exists only in a GitHub UI/download path that the assistant cannot access, the assistant may and should ask the user to upload the required GitHub Actions material.

The assistant must not guess the missing error, assertion, stack trace or command output merely to avoid asking for a log.

## 2. What the assistant must tell the user

When user assistance is needed, the assistant must explicitly state:

```text
repository
exact commit SHA, when known
workflow name / run ID
run attempt, when relevant
job name / job ID, when known
failed or relevant step, when known
what exact material is required
why the material is required
preferred download/copy method
```

The request should be narrow. Ask for the smallest complete evidence package that can resolve the missing information, while preferring a full job/run log over manually selected fragments when practical.

Do not ask the user merely to "send the logs" without identifying which run/job/log is needed.

## 3. Preferred user download path — job or run log

When the full log is needed, instruct the user approximately as follows, adapting the labels to the current GitHub UI:

```text
1. Open the repository on GitHub.
2. Open Actions.
3. Open the workflow run I identified.
4. Verify that the commit SHA/run is the one I specified.
5. Open the required job.
6. Use the job/run menu (usually the "..." menu) and choose the available log download option, such as "Download log archive" / "Download logs".
7. Upload the downloaded .zip/.txt file directly into this chat.
```

If GitHub exposes only a run-level log archive, that archive is acceptable; the assistant must locate the required job/step inside it.

The user should not be required to unpack the archive unless upload limitations make that necessary.

## 4. Preferred user download path — artifact

When the missing evidence is in a workflow artifact:

```text
1. Open Repository -> Actions.
2. Open the exact workflow run I identified.
3. Scroll to the Artifacts section on the run page.
4. Download the artifact name I specified.
5. Upload the downloaded ZIP/archive to this chat without modifying its contents.
```

The assistant must tell the user the exact artifact name when it is known.

## 5. Fallback when GitHub does not offer a downloadable full log

If a full log/archive cannot be downloaded, the assistant may ask the user to copy the relevant failed step output.

Instructions should be specific:

```text
1. Open the exact run and job.
2. Expand the failed/relevant step.
3. Copy the command line plus the complete error/assertion/stack trace and the final exit-code/result lines.
4. Include enough preceding output to identify the test/case/command that failed.
5. Paste that text into the chat or save it as a .txt file and upload it.
```

A manually copied fragment is lower-quality evidence than a full raw job log. The assistant must say when the supplied fragment is insufficient and request the next missing portion rather than inventing it.

## 6. What the user should not upload

The assistant must remind the user not to intentionally provide secrets. In particular, do not request:

```text
PATs
OAuth tokens
GitHub App private keys
GITHUB_TOKEN values
Authorization headers
SSH private keys
cloud credentials
GitHub secrets
database credentials
production user data
raw environment-variable dumps
signed bearer URLs/capabilities
```

If a GitHub-generated log archive already contains GitHub-masked values such as `***`, it can normally be uploaded as generated. The user should still avoid adding separate secret files or credential exports to the upload.

The assistant must never ask the user to paste a token merely to gain log access.

## 7. Evidence binding after upload

After the user uploads a log or artifact, the assistant must:

1. inspect the uploaded material itself;
2. bind it to the known repository/run/job/SHA where the material supports that binding;
3. identify whether the material is complete or partial;
4. extract the exact command/test/error/assertion/stack/exit code required for diagnosis;
5. distinguish expected negative-path output from an actual CI failure;
6. continue the diagnosis without asking the user to interpret the log;
7. request an additional log only when a specific missing fact blocks a trustworthy conclusion.

The uploaded material is execution evidence, not a replacement for the Git repository as the canonical source of project state.

## 8. Trigger conditions for asking the user

A user-assisted log request is appropriate when, for example:

- the dedicated authenticated raw job-log read fails after reasonable retry/finalization checks;
- GitHub returns a transient storage/redirect condition and no usable artifact is available;
- the connected capability truncates output before the relevant failure;
- an artifact exists but cannot be downloaded through the connected capability;
- GitHub UI exposes diagnostic material not available through the connector/API path;
- a historical log/artifact is accessible to the user but no longer retrievable through the assistant's current GitHub capability;
- the exact failure requires a file produced by the workflow that is not otherwise accessible.

The assistant should not request user action when the same evidence can be obtained directly with the connected GitHub tools.

## 9. Required communication behavior

When a user upload is necessary, the assistant must clearly inform the user that progress is blocked or materially limited by a specific missing evidence item. The assistant must then provide direct, step-by-step download/upload instructions tailored to the identified run/job/artifact.

The assistant should use a concrete formulation such as:

```text
Мне нужен полный лог job `repository-integrity` из run `123456789` на SHA `abcdef...`, потому что доступный мне вывод обрывается до failed step `Deterministic JavaScript tests`.

Как выгрузить:
Repository -> Actions -> <нужный run> -> <job> -> ... -> Download log archive.
Загрузите полученный ZIP сюда без распаковки. Секреты/токены отдельно не прикладывайте.
```

The exact UI wording may vary over time; the assistant should adapt the instructions to the current GitHub interface while preserving the same security rules.

## 10. Permanent assistant rule

For future WebClip work:

```text
connected GitHub evidence first
        ↓
raw job log / artifact / exact-SHA source
        ↓
if required evidence is still unavailable
        ↓
explicitly ask the user for the exact missing log/artifact
        ↓
provide precise GitHub download instructions
        ↓
user uploads file/text
        ↓
assistant performs the analysis
```

The purpose of user assistance is to bridge a concrete evidence-access gap, not to transfer CI diagnosis work to the user.
