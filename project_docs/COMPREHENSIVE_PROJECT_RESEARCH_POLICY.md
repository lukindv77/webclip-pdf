# Comprehensive Project Research, Assessment and Architecture Development Policy

Status: **CANONICAL / PERMANENT**

## Canonical concept

The canonical Russian name of the project-wide engineering activity is:

**«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

Allowed concise forms are:

- «Комплексное исследование проекта»;
- «Глубокое комплексное исследование проекта»;
- «Полное комплексное исследование проекта».

In repository paths, machine-readable fields, CI identifiers and English operational prose, the word **Research** denotes this full canonical concept unless a narrower meaning is explicitly stated.

## Objective

The activity is not limited to defect discovery or compliance checking. Its objective is to understand the project as an engineered system, evaluate whether its architecture and implementation serve the product mission, identify weaknesses and opportunities, and develop concrete architecture and implementation improvements with reproducible evidence.

## Mandatory non-exhaustive scope

Every full or deep comprehensive project research campaign MUST consider, where material to the project:

1. requirements and technical conditions;
2. project architecture;
3. implemented technical solutions;
4. implementation conformity with requirements and product contracts;
5. relevant industry standards and formats;
6. architectural weak points and boundary failures;
7. technical debt;
8. redundant, duplicated or inefficient solutions;
9. performance and scalability;
10. reliability, resilience and failure recovery;
11. security as defensive security / defensive architectural analysis;
12. maintainability;
13. source-code structure and code quality;
14. dependencies and external integrations;
15. discovered problems, limitations and risks;
16. improvement alternatives and trade-offs;
17. recommended architecture changes;
18. comparable solutions from other authors and vendors;
19. user wishes, complaints and expectations around comparable products;
20. usage trends in comparable products;
21. user stories and real-world usage patterns associated with comparable products;
22. adjacent mechanisms discovered during research when they can materially affect correctness, fidelity, safety, reliability, maintainability or future architecture.

The list is a minimum, not a maximum.

## Evidence and reasoning model

Research conclusions MUST distinguish:

- canonical project requirements and contracts;
- current source and architecture inspection;
- deterministic test evidence;
- physical/browser/external evidence;
- external industry/vendor/community research;
- inference and architecture recommendations.

Historical results may accelerate discovery and duplicate reconciliation, but current campaign advancement requires fresh evidence appropriate to the claim. Existing P-code ownership remains the root-cause/status authority unless canonical project policy explicitly changes it.

## Comparative and user-context research

Where an architecture or product decision would benefit from outside context, the research MUST actively examine comparable products, vendor approaches, standards, user feedback, usage trends and user stories. External observations are evidence inputs, not automatic requirements: recommendations must explain applicability, trade-offs and fit with the WebClip product mission.

## Defensive security boundary

Security work under this policy is defensive: threat modeling, trust-boundary review, permission minimization, confidentiality/integrity/availability analysis, abuse resistance, failure containment, recovery, privacy and secure architecture. It does not authorize offensive exploitation outside controlled validation needed to protect this project and its users.

## Architecture-development requirement

A finding is not the end state of comprehensive research. Material findings SHOULD be followed by one or more of:

- root-cause model;
- architectural alternatives;
- recommended target state;
- migration or remediation sequence;
- regression/evidence strategy;
- explicit residual risk or accepted limitation.

## Repository terminology contract

Current mutable repository documents, templates, project tools, workflow definitions, active branch names and current GitHub work items MUST use the Research terminology defined here. Immutable historical Git objects and externally stored execution history remain unchanged for provenance, but current documents SHOULD reference them by stable commit/blob/run identifiers rather than reproducing deprecated historical wording.

Repository Integrity enforces this terminology contract on the current tracked tree.
