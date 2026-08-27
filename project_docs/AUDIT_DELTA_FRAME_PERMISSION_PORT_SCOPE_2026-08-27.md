# Audit delta — optional frame host-permission port scope — 2026-08-27

Source-of-truth `main` immediately before this write: `c8e5d6b83cef8c67a526f963c001ac18d3f0723f`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines:

- **P1-193** — gesture-safe, bounded, source-document-bound optional host-permission request must request the intended candidate capability, not a broader host scope;
- **P1-201** — revoke/re-grant lifecycle must preserve exact permission scope/generation;
- **P1-004** — cross-origin iframe feature-level permission boundary;
- **P1-171/P1-200** remain separate document/control-generation requirements after permission exists.

The defect is a least-privilege mismatch between exact iframe origin discovery and the Chrome match pattern actually requested/checked.

## Chrome platform contract

Chrome match patterns support an optional explicit port component.

Chrome's current match-pattern documentation states that when port is omitted it is treated as a wildcard equivalent to `:*`; it also explicitly notes that match patterns match all ports unless an explicit port is specified.

Therefore these are materially different capability scopes:

- `https://example.test:8443/*` — one explicit port;
- `https://example.test/*` — all HTTPS ports on that host.

This is platform behavior, not merely a string-formatting preference inside WebClip.

## Fresh source proof — popup drops the discovered port

### 1. Candidate discovery retains exact origin

`collectCrossOriginFrameOrigins(tabId)` receives candidate frame URLs/origins and normalizes each through:

`new URL(...).origin`.

For a non-default port this preserves the port, e.g.:

`https://frames.example.test:8443`.

Candidates are de-duplicated as exact origins and bounded to at most 16.

This is the correct discovery granularity.

### 2. `frameHostPermissionPattern()` discards `url.port`

The popup then converts each discovered origin into a permission pattern using approximately:

- parse URL;
- require HTTP/HTTPS + hostname;
- return `${url.protocol}//${url.hostname}/*`.

`url.port` is omitted.

Thus discovered candidate:

`https://frames.example.test:8443`

becomes requested permission:

`https://frames.example.test/*`.

Under Chrome match-pattern semantics, that request authorizes every HTTPS port on `frames.example.test`, not only 8443.

### 3. Multiple exact-port candidates collapse into one broader permission

Candidate discovery de-duplicates by exact origin, so:

- `https://frames.example.test:8443`;
- `https://frames.example.test:9443`

are two distinct discovered origins.

But after port-dropping conversion both become:

`https://frames.example.test/*`.

The subsequent `Set` collapses them to one host-wide all-port permission.

The browser therefore receives less precise capability information than WebClip discovered.

## Fresh source proof — worker repeats the same broadening

### 4. `frameAgentPermissionPattern()` also discards port

Service worker permission validation parses a frame URL and similarly constructs:

`${url.protocol}//${url.hostname}/*`.

`frameAgentHasGrantedHostPermission(value)` passes that pattern to:

`chrome.permissions.contains({ origins:[pattern] })`.

So runtime admission does not preserve exact origin/port either.

### 5. Broad permission can authorize another same-host port frame

A valid schedule:

1. page contains cross-origin iframe `https://frames.example.test:8443/app`;
2. discovery reports exact origin `https://frames.example.test:8443`;
3. WebClip requests host-wide `https://frames.example.test/*`;
4. user grants the browser prompt;
5. the same or later exact document contains iframe `https://frames.example.test:9443/other`;
6. worker's permission check derives the same host-wide pattern and considers the permission present;
7. frame-agent injection/control can therefore be admitted for port 9443 even though the original candidate that motivated the grant was 8443.

Navigation/document fencing from P1-171/P1-200 is still necessary, but it cannot repair an overbroad permission scope once the browser grant itself is wider than the discovered origin.

### 6. Future popup-only fix would break worker admission for exact-port grants

If popup is changed to request:

`https://frames.example.test:8443/*`

but worker keeps checking:

`https://frames.example.test/*`,

then `permissions.contains()` is being asked whether the extension has the broader all-port capability. An exact-port grant is not equivalent to that broader scope.

Therefore permission request, `contains` checks, revoke/remove logic and any cached permission receipts must migrate together to one canonical scope representation.

## Why this belongs to existing P1-193 rather than a new number

P1-193 already requires a two-phase permission UX where the candidate set is:

- discovered before the gesture-sensitive request;
- bounded;
- tied to exact source tab/document generation;
- invalidated when stale.

A candidate receipt that says `origin=https://host:8443` but then requests `https://host/*` is not an exact implementation of that same permission-admission contract.

This is therefore a scope refinement of P1-193, not an independent new subsystem.

P1-201 must compose because revoke/re-grant has to operate on the same exact scope representation once permissions can be port-specific.

## Required canonical permission-scope helper

Use one shared normalization contract for popup discovery/request, worker `contains`, frame-agent admission and revoke/re-grant.

For each candidate preserve at minimum:

- scheme (`http` or `https`);
- canonical hostname;
- explicit port when the source origin has a non-default explicit/effective port and Chrome match-pattern semantics require it for exact scope;
- normalized exact origin used for document/frame identity;
- corresponding Chrome host permission pattern.

Do not independently reconstruct permission strings in popup and service worker.

### Default ports

Canonicalize default-port semantics deliberately:

- `https://host` and `https://host:443` represent the same web origin in URL canonicalization;
- `http://host` and `http://host:80` likewise.

The permission helper should produce one stable canonical representation so contains/remove/request do not disagree on syntactic forms.

### Non-default ports

For non-default ports, preserve explicit port scope in the permission pattern when Chrome supports it.

Do not broaden to all ports merely for implementation convenience.

If a product decision intentionally wants host-wide permission, that must be a deliberate/disclosed permission model rather than an accidental consequence of dropping `url.port` after exact-origin discovery.

## Gesture-safe two-phase UX composition

P1-193 still requires discovery to happen before a separate immediate user-gesture grant action.

The prepared candidate receipt shown/used by that second action should contain the exact canonical permission patterns, including non-default ports.

Immediately before request:

- prove candidate document generation still current;
- request exactly the prepared patterns;
- do not recompute a broader pattern from hostname only.

After the browser prompt settles:

- fresh-check source document generation;
- fresh-check exact granted permission scope;
- inject only frames whose exact origin is covered by the granted prepared receipt.

## Revocation / permission lifecycle composition

P1-201 revoke/re-grant must use the same exact patterns.

Required properties:

- revoking `https://host:8443/*` does not unintentionally remove an independent legitimately granted `https://host:9443/*` capability;
- an old host-wide legacy grant is detected as broader legacy state and handled explicitly during migration rather than silently represented as an exact-port grant;
- permission-added/removed events invalidate cached frame capability state by exact canonical scope and document/session generation;
- already injected agents lose authority promptly according to P1-201 when their exact required permission is no longer granted.

## Legacy broad grants / migration

Existing users may already have host-wide optional grants created by the current port-dropping implementation.

A fix must not falsely claim those grants are exact-port scoped.

Choose an explicit migration policy, for example:

- treat a broad legacy grant as broad and disclose/offer revoke + re-request exact candidates;
- or retain it as a consciously legacy broader permission until user revokes it.

Do not silently rewrite browser permission reality only in WebClip metadata.

## Deterministic regression matrix

1. Candidate `https://host.test:8443` -> prepared/requested match pattern retains `:8443`.
2. Candidate default HTTPS port -> canonical pattern remains stable and does not create duplicate `host` vs `host:443` grants.
3. Candidates `:8443` + `:9443` remain two exact permission scopes rather than collapsing to host-wide all-port permission.
4. Grant only `:8443`; frame at `:9443` fails worker permission admission before injection.
5. Grant `:8443`; `frameAgentHasGrantedHostPermission()` for `:8443` succeeds using the same exact canonical pattern.
6. Popup exact-port request + worker exact-port contains agree; popup-only migration cannot leave worker querying a broader scope.
7. Revoke `:8443`; `:9443` independent grant remains present.
8. Host-wide legacy permission is recognized as broad legacy state; UI/diagnostics do not label it as exact-port.
9. Navigation from document with `:8443` candidate to a different document/port before second grant action invalidates prepared receipt per P1-193/P1-171.
10. Permission grant settles after navigation: no frame agents are enabled in the replacement document from stale candidate receipt.
11. Permission removal while exact-port frame agent is registered causes authority invalidation under P1-201.
12. Subdomains remain exact-host unless the product explicitly requests wildcard subdomains; this port fix must not accidentally introduce `*.` scope.
13. IPv4/IPv6/localhost non-default ports use valid Chrome match patterns and preserve exact intended scope.
14. Incognito P0-045 boundary remains stricter: no persistent optional grant is derived from an Incognito source regardless of port precision.

## Positive controls retained

- candidate origins are already bounded to 16;
- only HTTP/HTTPS candidates are accepted;
- hostnames are exact rather than wildcard subdomains;
- worker rechecks actual granted permission before frame-agent authority;
- permission/document lifecycle remains separately tracked by P1-171/P1-200/P1-201.

The audit does not recommend weakening these controls.

## Duplicate check / numbering

No new number is created.

- **P1-193** owns candidate/request admission and least-privilege exact scope.
- **P1-201** owns revoke/re-grant and permission-change lifecycle.
- **P1-004** remains the feature-level cross-origin iframe umbrella.
- **P1-171/P1-200** own exact frame/document/control generations after permission exists.
- **P0-045** remains the separate Incognito persistent-permission prohibition.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Real Chrome optional-permission prompt/contains/remove behavior with explicit non-default ports remains required release QA.