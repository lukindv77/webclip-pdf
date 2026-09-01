#!/usr/bin/env python3
"""Accepted C05 wrapper correcting one development-only minmax fixture threshold."""
import audit_fresh_c05_geometry_layout as base

_original_validate = base.validate


def validate(name, result):
    if name != "minmax_sizing":
        return _original_validate(name, result)
    source = result["source"]
    prepared = result["preparedScreen"]
    base.assert_rect_stable(result, ["#scope", "#clamp", "#minbox"])
    # 40% resolves against #scope's content box after its 12px + 1px sides,
    # yielding 269.59375 px in the fixed 700px border-box fixture.
    assert 265 < source["#clamp"]["width"] < 275, source["#clamp"]
    assert base.approx(source["#clamp"]["width"], prepared["#clamp"]["width"])
    assert base.pdy(result, "C05_CLAMP", "C05_MINBOX") > 15
    return {"classification": "positive-control"}


base.validate = validate
raise SystemExit(base.main())
