# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `RESTORE_PROMPT.md` — правила восстановления контекста из свежего GitHub `main`.
2. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
3. `AUDIT_DELTA_INDEX.md` — карта root-cause семейств к оставшимся detailed audit deltas.
4. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
5. `DOCUMENTATION_CONSISTENCY_AUDIT.md` — обязательные current-authority overrides для stale sections больших исторических документов.
6. `PROJECT_OVERVIEW.md` — что это за проект и его инварианты.
7. `USER_REQUIREMENTS.md` — нормализованная история требований; superseded recovery/implementation wording читать с consistency override.
8. `ARCHITECTURE.md` — компоненты и потоки; open-owner guarantees не выводить из stale historical paragraphs.
9. `DECISIONS_AND_RATIONALE.md` — история решений и причин; superseded decisions помечены/переопределены current policy.
10. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
11. `TEST_PLAN.md` — исторически накопленный regression plan; stale nested-recovery check заменён Git-first recovery self-test policy.
12. `BUILD_AND_RECOVERY_RULES.md` — Git-first release/recovery/provenance architecture.
13. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
14. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

Дополнительные evidence/history документы:

- `AUDIT_HISTORY_INDEX.md` — retractions/dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — losslessly retired audit-delta proof;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md` — consolidated P0-045 Incognito and P0-033 signed-link evidence;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints;
- remaining `AUDIT_DELTA_*.md` — detailed source proof/acceptance, пока конкретная family не прошла lossless retirement.

`PRIORITIES_P0_P1_P2.md` оставлен только как compatibility pointer на `AUDIT_REGISTRY.md`; он не является вторым реестром.

`GITHUB_WORKFLOW.md` — canonical private remote, automated integrity gate and release provenance rules.
