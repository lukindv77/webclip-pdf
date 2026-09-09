# C0/C1 remote-save admission delta — execution receipt — 2026-09-10

Canonical production baseline checked immediately before research writes:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
Registry blob = 81e5867c0e0936b9524ece8949c53ad4ed83523c
```

Research branch:

```text
research/c0-c1-remote-save-admission-delta-2026-09-10
```

Evidence execution commit (temporary workflow present only for this run):

```text
1cb89f2fd33182ee09e3612848c8a0b40ce06df4
```

GitHub Actions:

```text
run = 34383441967
job = 102573666736
runner = ubuntu-24.04
status = completed
conclusion = success
```

Steps:

```text
Deterministic model                    SUCCESS
Controlled HTTP verification fixture  SUCCESS
```

Committed research tools executed:

```text
project_tools/test_c0_c1_remote_save_admission_delta_model.js
project_tools/run_c0_c1_remote_verification_http_fixture.js
```

Expected tool outputs, also reproduced locally before commit:

```text
C0/C1 remote-save admission delta model: PASS; cases=40
C0/C1 controlled HTTP verification fixture: PASS; cases=7
```

Evidence classification:

```text
L2 = deterministic model PASS
controlled HTTP generic I/O fixture = controlled environment evidence for bounded stream/hash behavior
real Yandex provider semantics = NOT PROVEN
real Yandex L5 = NOT RUN / intentionally deferred
production implementation = NOT STARTED
Registry status changes = NONE
new owner = NONE
P1-231 = UNALLOCATED
```

The temporary workflow `.github/workflows/c0-c1-remote-save-delta-research.yml` was deleted after the successful evidence run and is not part of the final research diff.

The controlled HTTP fixture must not be described as Yandex proof. It proves the provider-independent streaming identity contract (N/H comparison, same-size wrong-byte rejection, over-bound stop, short-body rejection) against a local HTTP simulator only.
