# P1-188 — imported locator selector grammar — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: imported `SelectionSnapshot` locator `cssPath` must use a versioned WebClip grammar or be ignored; arbitrary native selector semantics must not be executed from a backup.

## 1. Current source proof

The current worker-side `sanitizeSelectionSnapshot()` treats `cssPath` as a bounded string only:

```js
cssPath: String(locator.cssPath || '').slice(0, 4000)
```

It does not prove that the text was emitted by WebClip, does not attach a selector grammar version, and does not parse it into WebClip-owned structural steps.

The current content restore path later performs:

```js
if (locator.cssPath) {
  try { cssCandidate = ownerDoc.querySelector(locator.cssPath); } catch (_) {}
}
```

Therefore a portable/imported record can supply the complete native CSS selector language accepted by the browser. Length-bounding the string is not equivalent to bounding selector semantics.

Current live `buildStructuralCssPath()` uses a much smaller practical language:

- `body`;
- a unique id selector produced from the current element id;
- a tag name;
- optional `:nth-of-type(N)`;
- child-combinator `>` between segments;
- bounded path depth.

The imported contract is therefore strictly wider than the producer contract.

## 2. Why native `querySelector(importedText)` is the wrong trust boundary

`querySelector()` accepts a CSS selector string, not a WebClip locator token. Modern CSS includes functional/relational selector syntax that WebClip never emits for its structural locator. Backup data must not gain those semantics merely because the browser CSS parser knows them.

External platform references:

- MDN `Document.querySelector()` documents that the input is a CSS selector string and that invalid syntax throws `SyntaxError`: <https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector>
- MDN documents functional pseudo-classes including relational `:has()`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-classes>

This owner is defensive data-contract hardening. It does not require exploit discovery and does not assume a particular browser-selector complexity vulnerability.

## 3. Target contract: structured selector path, version 1

A newly produced durable locator should carry a structured selector receipt, conceptually:

```js
{
  selectorGrammarVersion: 1,
  selectorPath: [
    { kind: 'body' },
    { kind: 'tag', tag: 'main', nthOfType: 1 },
    { kind: 'tag', tag: 'article', nthOfType: 0 }
  ]
}
```

Allowed segment kinds are deliberately finite:

1. `{ kind: 'body' }`;
2. `{ kind: 'id', value: <bounded raw id> }`;
3. `{ kind: 'tag', tag: <bounded lower-case tag>, nthOfType: <bounded integer or 0> }`.

`nthOfType = 0` means the resolver requires a unique same-tag child at that step; it is not a wildcard selector.

The grammar has explicit bounds for:

- version;
- segment count;
- id length;
- tag grammar/length;
- numeric nth value.

Unknown versions or malformed paths are ignored fail-closed.

## 4. Resolution contract

Imported structured selector data is resolved by WebClip-owned traversal primitives, not by passing imported text to a native selector parser.

Examples:

- `body` -> exact document body;
- `id` -> bounded exact `getElementById()` lookup followed by ordinary locator tag/admission checks;
- `tag+nthOfType` -> bounded child/sibling traversal under the current resolved parent.

The output is merely one structural candidate. It still passes ordinary P1-001 rendered-target admission and the existing P1-168 bounded locator/scoring rules.

A selector receipt does **not** become exact DOM identity.

## 5. Legacy/import behavior

Legacy `cssPath` without a recognized structured grammar is **ignored**, not executed.

Ignoring legacy `cssPath` does not invalidate the entire locator. Existing bounded fallback evidence remains available:

- `domPath`;
- id/tag/role/classes as permitted by their own sanitizer/privacy owners;
- sibling positions;
- bounded candidate scoring.

This is important for migration: old backups may restore with lower confidence, but they do not acquire native selector authority.

There must be no compatibility branch of the form:

```js
if (!selectorPath) ownerDoc.querySelector(importedCssPath)
```

Such a fallback would recreate P1-188.

## 6. Live vs imported data

The clean long-term design is to make the live producer emit the same structured V1 grammar and stop treating CSS text as the durable selector representation at all.

P1-168 owns bounded work while constructing/scoring the live locator. P1-188 owns the **language accepted from durable/imported data**.

A volatile internally-generated selector string, if retained temporarily during migration, is not evidence that imported text may be executed.

## 7. Frame paths

`framePath` contains nested locator objects and therefore inherits the same P1-188 rule recursively. A nested imported frame locator cannot carry arbitrary executable CSS text merely because the top-level locator was sanitized.

The worker sanitizer must validate/normalize the structured selector representation for every nested simple locator before persistence/use.

## 8. Composition with neighboring owners

- **P1-168** — bounds live locator creation/scoring work and page-controlled selector inputs.
- **P1-182** — removes sensitive plaintext/raw URL context from durable locator data.
- **P1-001** — validates that the resolved element is a truthful current rendered target.
- **P0-080** — requires current SPA/application generation and live selected DOM authority.
- **P1-154** — owns aggregate locator count/byte admission.

P1-188 must not introduce a second selection-generation or privacy authority.

## 9. Deterministic model

`project_tools/test_p1_188_imported_selector_grammar_model.js` proves:

- a recognized structured V1 path resolves without native CSS parsing;
- legacy/native selector strings such as `:has()`, selector lists, attribute selectors, `:not()`, `:scope` and wildcard forms are ignored;
- unknown grammar versions fail closed;
- oversized/out-of-envelope tokens fail closed;
- ignoring imported CSS preserves ordinary structural fallback fields.

Expected output:

```text
P1-188 imported selector grammar model: PASS
```

## 10. Source-bound acceptance gate

The RED source gate should require all of the following before implementation can be claimed:

1. a named/versioned imported selector grammar;
2. structured selector sanitization in the worker, including nested frame locators;
3. imported legacy `cssPath` stripped/ignored rather than preserved as executable text;
4. content restore resolves recognized structured tokens without native parsing of imported selector text;
5. no fallback from missing/invalid structured grammar to `querySelector(locator.cssPath)`;
6. existing `domPath`/bounded tag candidate fallback remains available;
7. P1-168 early-work bounds and P1-001 rendered admission remain separate positive controls.

## 11. Closure evidence still required

Architecture/model PASS does not close P1-188.

Closure requires at minimum:

- production implementation;
- committed-source gate PASS;
- deterministic migration/regression tests;
- real Chrome test proving an imported arbitrary native selector is ignored while a recognized V1 path and a legacy structural fallback behave as intended.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
