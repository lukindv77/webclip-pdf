# P1-231 package topology census — execution receipt — 2026-09-10

Mode: **RESEARCH-ONLY / COMMITTED-SOURCE EXECUTION RECEIPT**

This receipt records exact execution provenance for `project_tools/test_p1_231_package_topology_census_model.js`. It does not authorize a release, promote release readiness, perform real Chrome/Yandex QA, or define a production RPF.

## Source identity

```text
repository = lukindv77/webclip-pdf
research branch = research/p1-231-package-topology-census-2026-09-10
canonical baseline main = ca2f5edc9626575a0e78ca7a988b5fc328e1fcaf
execution SHA = aa659303daf8394b60ddc296adb74cdedf0c223f
workflow = .github/workflows/p1-231-package-topology-census-research.yml
run = 34429632520
attempt = 1
job = research
job id = 102722190102
```

The temporary workflow existed only to obtain committed-source research evidence and is removed from the final branch tree after this receipt is recorded.

## Exact model result

Full decoded job log was read directly through authenticated GitHub Actions access.

Exact terminal model line:

```text
P1-231 package topology census model: PASS; cases=179; package_files=33; package_bytes=1384280; research_rpf=b876ec406361b50640886b08e66a6af3ddebd35134e662fc6094ec072f149146; psl_regen=match
```

Meaning:

- 179 deterministic assertions passed;
- current proposed package projection contains exactly 33 root members;
- summed exact member bytes at this execution SHA are 1,384,280;
- every current tracked path was classified by the research model;
- every package member was tracked as Git mode `100644`, stage 0, and a regular filesystem file;
- current top-level directories were exactly `.github`, `project_docs`, `project_tools`;
- no current `assets/` or `icons/` package directories were assumed;
- `public_suffix_list.dat` regenerated `public-suffix.js` byte-identically in a temporary directory;
- docs/source/control paths were outside the research package RPF projection;
- package-byte/topology changes changed the research RPF;
- whole tracked-tree membership differed from the proposed staged package membership.

The printed `research_rpf` is an evidence value from the research model's proposed encoding. It is **not** canonical production release identity until S0 is separately implemented/reviewed.

## Artifact fallback

The workflow uploaded one bounded diagnostic artifact:

```text
artifact id = 10133966897
artifact name = p1-231-package-topology-census-aa659303daf8394b60ddc296adb74cdedf0c223f
retention = 7 days
GitHub artifact ZIP digest = sha256:cc55aa558c01dbef9948d60fc16459df7d91f5c77b3c81bd13be5d31d3b26fbe
```

The artifact ZIP was independently downloaded through the authenticated GitHub connector.

Independent local SHA-256 of the downloaded ZIP:

```text
cc55aa558c01dbef9948d60fc16459df7d91f5c77b3c81bd13be5d31d3b26fbe
```

It exactly matched GitHub artifact metadata.

The ZIP contained exactly one file:

```text
p1-231-package-topology-census-output.txt
```

Its content independently matched the raw-log result:

```text
P1-231 package topology census model: PASS; cases=179; package_files=33; package_bytes=1384280; research_rpf=b876ec406361b50640886b08e66a6af3ddebd35134e662fc6094ec072f149146; psl_regen=match
```

Thus both evidence-access paths agree.

## Important interpretation

This proves the deterministic research model against committed source at the exact execution SHA. It does **not** prove:

```text
real unpacked Chrome release QA
real Yandex OAuth/API/L5
release readiness
official RPF implementation
official staged ZIP builder implementation
artifact publication authority
```

Those boundaries remain separate and pending.

## External/platform comparison used by the tranche

The research evidence document also compared the project topology with official Chrome guidance:

- unpacked extensions are loaded from an extension directory with `manifest.json` at its root;
- Chrome Web Store upload uses a ZIP containing extension files with `manifest.json` at the ZIP root.

Historical GitHub evidence additionally showed the old diagnostic P1-153 workflow used whole-tree `git archive --format=zip ... HEAD`. That history is comparison/provenance evidence only and is not future official release policy.

## Result

```text
COMMITTED-SOURCE RESEARCH MODEL: PASS
RAW LOG: READ / CONSISTENT
ARTIFACT FALLBACK: DOWNLOADED / DIGEST MATCH / CONTENT MATCH
PRODUCTION/RELEASE AUTHORITY: NOT ACTIVATED
```
