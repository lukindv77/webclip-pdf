# P0-072 — scope-token primitive selection / random salt contract — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ aeaf68e15f20d0c1013a36007e3e21ffc6d92786`  
Owner: **P0-072 ACTIVE**; confidentiality owner **P0-066 ACTIVE**.

This is a narrow implementation-readiness addendum for the already selected installation-local salted scope-token architecture. Runtime is unchanged.

## 1. Existing bundled digest primitive is usable, but byte encoding must be explicit

`service-worker.js` already imports `journal-import-digest.js`, which exposes:

```text
WebClipSha256.create().update(Uint8Array|ArrayBuffer).digestHex()
```

The helper does not accept JavaScript strings directly.

Therefore the scope-token helper must explicitly encode its versioned input as UTF-8 bytes, for example with `TextEncoder`, before passing it to the bundled incremental SHA-256 implementation.

Do not rely on implicit string-to-byte conversion, platform locale, UTF-16 code-unit truncation or ad-hoc `charCodeAt` loops. Scope matching must be deterministic across worker restarts.

Current MDN documentation confirms `TextEncoder` is available in Web Workers and always encodes UTF-8:

- https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder

## 2. Salt generation must not reuse non-cryptographic fallback patterns

Current WebClip code has several benign identity helpers that fall back from `crypto.randomUUID()` to timestamp + `Math.random()` when a UUID is unavailable.

That fallback style is acceptable only where the identifier is ordinary correlation uniqueness and the existing owner allows it.

The P0-072 scope salt has a different purpose: it exists specifically to prevent trivial deterministic cross-install correlation/dictionary matching of persisted scope tokens.

Therefore salt generation must use a cryptographically strong worker source and fail closed if unavailable.

Preferred primitive:

```text
crypto.getRandomValues(new Uint8Array(N))
```

Current MDN documentation states that `Crypto.getRandomValues()` produces cryptographically strong random values and is available in Web Workers:

- https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/crypto

Do not fall back to `Math.random()` for the installation salt.

This is data-minimization/pseudonymization hygiene, not a new authentication or secret-key protocol.

## 3. Salt representation should be fixed and bounded

Use one fixed-size random byte array and persist a bounded canonical textual representation, for example lowercase hex.

Required properties:

- one representation only;
- exact length validation on read;
- invalid/corrupt value is treated as unavailable;
- no silent coercion/truncation;
- salt never appears in OperationLog or exported Journal JSON.

The exact byte length is an implementation constant. A small modern random salt such as 16 or 32 bytes is sufficient for this local pseudonymous namespace; P0-072 does not require a password-derived secret or user-managed key.

## 4. Token input framing must be unambiguous

Do not concatenate variable strings without separators.

Use an explicitly framed versioned input such as conceptually:

```text
webclip-scope-token\0v1\0<salt-hex>\0url\0<normalized-scope>
```

and separately:

```text
webclip-scope-token\0v1\0<salt-hex>\0site\0<normalized-scope>
```

The namespace separation is necessary even if two normalized strings happen to be textually equal.

Because the salt is local and the digest result is only an internal equality token, HMAC/key-management machinery is not required by P0-072. Broader confidentiality semantics remain with P0-066.

## 5. Persist token, not digest input

Receipt rows persist only:

- `scopeTokenVersion`;
- `urlScopeToken` when URL scope is known;
- `siteScopeToken` when site scope is known.

They do not persist:

- the framed digest input;
- another plaintext URL/site copy;
- the salt inside each receipt.

The salt lives once under its dedicated exact `meta` key.

## 6. Salt read/corruption semantics remain fail-closed

The preceding scope-token lifecycle checkpoint remains authoritative:

```text
missing/corrupt salt + tokenized receipts exist -> indeterminate/fail closed
```

Do not regenerate and then compare under a new salt.

With no tokenized receipts, creation of a new salt may proceed transactionally.

For whole-generation clear/import-replace, receipt detachment does not require token equality and can still proceed by namespace scan; URL/site scoped reset requires a valid supported salt/token version.

## 7. No dependency on Web Crypto digest API is required

The repository already carries its own incremental SHA-256 implementation for import integrity. Reusing that implementation avoids adding asynchronous `crypto.subtle.digest()` control flow to the reset transaction preparation path.

The only new platform primitive needed for the selected design is strong random salt generation (`crypto.getRandomValues`) plus deterministic UTF-8 encoding (`TextEncoder`).

This keeps the implementation small and testable and does not add a network/service dependency.

## 8. Direct acceptance additions

Runtime/unit tests should prove:

1. scope-token helper hashes UTF-8 bytes, including non-ASCII URLs, deterministically;
2. URL and site namespaces produce different tokens for the same text;
3. two different salts produce different tokens;
4. salt parser rejects wrong type/length/encoding;
5. salt creation never falls back to `Math.random()`;
6. missing/corrupt salt with existing receipts fails closed;
7. receipt serialization contains neither salt nor plaintext scope key;
8. imported Journal content cannot set/replace the local salt;
9. token computation remains bounded by the existing URL/site normalization input limits.

## 9. Owner boundaries

No new P-code is allocated.

- **P0-072** owns only the stable local scope-matching primitive needed by its reset receipts.
- **P0-066** remains owner for canonical durable/display URL confidentiality and sanitization.
- **P1-216** remains owner for unified legacy/modern Journal URL identity semantics.
- **P2-019** may later centralize meta/schema ownership.

## 10. Status

The scope-token design is implementation-ready at the primitive level:

- deterministic UTF-8 input;
- existing bundled SHA-256;
- worker `crypto.getRandomValues()` salt;
- one exact bounded salt record;
- no plaintext scope duplication;
- no non-cryptographic fallback.

**P0-072 remains ACTIVE.** Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/Release is claimed by this checkpoint.
