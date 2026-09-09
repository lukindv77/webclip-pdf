# PD7 — current Stable target and execution boundary — 2026-09-09

Date: 2026-09-09  
Repository: `lukindv77/webclip-pdf`  
Canonical `main` checked: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch continued: `research/pd7-single-axis-scroll-stable-2026-09-09`  
Previous branch HEAD before this addendum: `f60ea13141c4f0f54fc998a5ff9c4f7fa0d36037`  
Scope: PD7 Change Impact / research-only. Production runtime, Registry statuses, `manifest.json`, version, build/tag/release/deployment are intentionally unchanged.

## 1. Purpose

The remaining project-wide research-reconciliation blocker is the exact target-browser receipt for PD7 Single-axis scroll containers.

This addendum records a fresh 2026-09-09 attempt to obtain that receipt without changing CI or production code.

It does **not** claim a feature-active or feature-inactive runtime receipt for current Stable. It records the exact Stable test target now available and the external execution boundary that prevented the browser run in the current research environment.

## 2. Fresh GitHub baseline

Fresh check before the attempt:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
commit = fix: resume C44 staged import after restart (#176)
```

`project_docs/RESEARCH_REGISTRY.md` on `main` still has blob:

```text
81e5867c0e0936b9524ece8949c53ad4ed83523c
```

Relevant research branch heads before this addendum were unchanged from the prior checkpoint:

```text
research/pd7-single-axis-scroll-stable-2026-09-09
  = f60ea13141c4f0f54fc998a5ff9c4f7fa0d36037

research/p1-184-yandex-upload-content-receipt-2026-09-06
  = 9efe631c640cec1274340179a815ac33d41021d8

research/current-baseline-synthesis-2026-09-09
  = 4b16ac119eeeabed709270cd0551e12e013eecfc
```

The PD7 branch was `ahead 6 / behind 0` relative to canonical `main` and differed only in:

```text
project_docs/**
project_tools/**
```

No PD7 workflow run or commit-associated workflow run existed for its then-current HEAD.

## 3. Exact current Stable test target identified

Fresh Chrome for Testing availability on 2026-09-09 identified:

```text
Channel: Stable
Version: 153.0.8010.36
Revision: r1681091
Platform selected for this environment: linux64
Asset status: 200 according to Chrome for Testing availability
```

Selected exact target asset:

```text
https://storage.googleapis.com/chrome-for-testing-public/153.0.8010.36/linux64/chrome-linux64.zip
```

This is materially stronger than the previous generic requirement `Chrome 153+`: the target is now an exact current Stable Chrome-for-Testing build.

External source:

```text
https://googlechromelabs.github.io/chrome-for-testing/
```

The source identified the Stable build as current at its 2026-09-08T23:17:11Z refresh.

## 4. Fresh official rollout evidence remains internally mixed

The fresh platform evidence still does not justify classifying Single-axis scroll containers merely from the Chrome major number.

### Chrome 153 release notes

Official Chrome 153 release notes state:

```text
Stable release date: September 8th, 2026
Single-axis scroll containers:
Available in non-stable channels (Beta, Dev, and Canary).
```

Source:

```text
https://developer.chrome.com/release-notes/153
```

### New in Chrome 153

The 2026-09-08 `New in Chrome 153` page highlights Single-axis scroll containers in the release, but its detailed section states the feature is available for testing without a flag in non-stable channels from Chrome 153.

Source:

```text
https://developer.chrome.com/blog/new-in-chrome-153
```

### Dedicated developer-testing article

The 2026-09-04 dedicated article says the feature is available in Chrome 153 Beta, Dev and Canary and asks developers to test before rollout to Stable. It also prescribes the semantic discriminator:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

Source:

```text
https://developer.chrome.com/blog/single-axis-scroll-containers-ready-for-testing
```

### Blink Intent to Ship

The Blink Intent to Ship records estimated milestone 153 and an intended rollout enabled for all users.

Source:

```text
https://groups.google.com/a/chromium.org/g/blink-dev/c/PSiqwsm8f3Q
```

That intent is useful rollout evidence but is not an exact current Stable runtime receipt.

## 5. Why documentation still cannot close PD7

The current official surfaces support two simultaneous facts:

```text
Chrome 153 is current Stable
AND
Single-axis scroll containers is still documented as non-stable-channel testing
```

while other official Chrome surfaces highlight the feature under Chrome 153 and the Intent to Ship targets milestone 153.

Therefore the existing PD7 rule remains correct:

```text
major version alone is not authority
```

The exact runtime discriminator remains:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

If exact current Stable `153.0.8010.36` returns `false`, that is acceptable bounded evidence that the feature is not active in this selected Stable build/rollout.

If it returns `true`, the full PD7 physical schedule must execute.

## 6. Actually executed environment checks

Available browser in the current research container:

```text
/usr/bin/chromium
Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie)
```

No additional Chrome/Chromium/headless-shell executable was found in the checked `/opt`, `/usr/local`, Playwright cache, shared tool and temporary locations.

This is the same old-browser family as the already committed Chromium-144 negative platform control and was therefore not re-used as fake new current-target evidence.

### Direct name resolution

Actual local resolver check:

```text
storage.googleapis.com -> Temporary failure in name resolution
raw.githubusercontent.com -> Temporary failure in name resolution
```

### Independent DNS lookup

An external Google DNS JSON lookup for `storage.googleapis.com` returned valid A records, including:

```text
172.217.29.251
172.217.172.59
172.217.172.187
142.251.134.187
...
```

This proved that the hostname itself was resolvable outside the current container.

### Direct-address transport attempt

A direct TLS connection was then attempted while bypassing local DNS:

```text
curl -I \
  --connect-timeout 10 \
  --max-time 20 \
  --resolve storage.googleapis.com:443:172.217.29.251 \
  https://storage.googleapis.com/chrome-for-testing-public/153.0.8010.36/linux64/chrome-linux64.zip
```

Actual result:

```text
curl: (7) Failed to connect to storage.googleapis.com port 443 ...
Could not connect to server
```

Therefore the current execution boundary is stronger and more precise than a simple DNS failure:

```text
current research container cannot obtain the exact Chrome-for-Testing Stable binary;
outbound transport to the required GCS asset is unavailable even when DNS is bypassed.
```

## 7. GitHub Actions boundary

Fresh GitHub inspection found:

```text
PD7 branch workflow runs = 0
PD7 HEAD commit-associated workflow runs = 0
```

Canonical `.github/workflows/` contains only:

```text
release-gate.yml
repository-integrity.yml
```

No existing dedicated PD7/current-Chrome workflow was available to reuse.

No PR, CI workflow edit, release workflow, or artificial GitHub trigger was created merely to bypass the browser-environment limitation.

## 8. Result of this attempt

What is now proved:

```text
exact selected current Stable target = Chrome for Testing 153.0.8010.36 / r1681091 / linux64
existing PD7 harness remains the correct executable receipt collector
current official documentation remains rollout-sensitive / internally mixed
current research container cannot obtain/run the selected target browser
no GitHub-hosted PD7 execution receipt exists
```

What is **not** proved:

```text
CSS.supports(...) on 153.0.8010.36
feature-active Stable behavior
feature-inactive Stable behavior
per-axis sticky physical behavior on exact target
raw/current-shaped PDF result on exact target
static-normalized PDF result on exact target
PD7 PASS
```

Therefore:

```text
PD7 = REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE
```

No `P1-231` is created.

## 9. Exact next executable receipt

Use the already committed harness:

```text
project_tools/research_pd7_single_axis_scroll.py
```

whose committed Git blob remains:

```text
034dea0a68ee977af7db82dfd99014add50b6019
```

Required invocation on an environment that has the exact selected target browser:

```text
CHROME_BIN=/absolute/path/to/chrome \
python3 project_tools/research_pd7_single_axis_scroll.py
```

The durable receipt must contain at minimum:

```text
browser executable
browser exact version
browser channel/target identity
CSS.supports("named-feature(single-axis-scroll-container)")
computed overflow x/y
programmatic clipped-axis settlement
sticky geometry
raw physical PDF evidence
static-normalized physical PDF evidence
```

Interpretation:

```text
featureSupported == false
  -> bounded current-Stable negative platform receipt;
     do not pretend the feature-active schedule ran.

featureSupported == true
  -> execute/retain full PD7 A-H physical schedule;
     then perform Coverage Reconciliation.
```

## 10. Coverage consequence

C42 is not reopened by this work.

This attempt does not identify a new independent root cause. It only narrows the sole current research-reconciliation blocker to an exact external execution receipt.

Until that receipt exists:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE
```

must not be re-declared unconditionally.

After a valid exact-target PD7 receipt, run a fresh Coverage Reconciliation. Only if no other stale/nonterminal CORE cell remains may research coverage be declared complete.

That would still **not** mean:

```text
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE
RELEASE-READY
```

## 11. Registry / production / release state

Unchanged by this research tranche:

```text
Registry statuses: unchanged
P0-004: ACTIVE
P1-230: ACTIVE
P1-187: ACTIVE
P1-184: ACTIVE
production/runtime: unchanged
manifest.json: unchanged
version/build/tag/release/deployment: unchanged
release readiness: NOT READY
```
