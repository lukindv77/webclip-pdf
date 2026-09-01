#!/usr/bin/env python3
"""Accepted C05 wrapper correcting development-only fixture/measurement defects."""
import audit_fresh_c05_geometry_layout as base

_original_validate = base.validate
_original_specs = base.specs


def specs():
    rows = _original_specs()
    for row in rows:
        if row["name"] == "body_width_context":
            # Put physical anchors on different baselines so PDF text extraction
            # cannot merge them into one synthetic word/span.
            row["html"] = "<section id='scope' class='scope'><div id='inner' style='width:100%;height:54px;position:relative'><span style='position:absolute;left:0;top:0'>C05_BODY_LEFT</span><span style='position:absolute;right:0;top:28px'>C05_BODY_RIGHT</span></div></section>"
        elif row["name"] == "body_transform_context":
            row["html"] = "<section id='scope' class='scope'><div id='inner' style='width:420px;height:54px;position:relative'><span style='position:absolute;left:0;top:0'>C05_BODY_TRANSFORM_LEFT</span><span style='position:absolute;right:0;top:28px'>C05_BODY_TRANSFORM_RIGHT</span></div></section>"
    return rows


def validate(name, result):
    source = result["source"]
    prepared = result["preparedScreen"]
    if name == "minmax_sizing":
        base.assert_rect_stable(result, ["#scope", "#clamp", "#minbox"])
        # 40% resolves against #scope's content box after its 12px + 1px sides,
        # yielding 269.59375 px in the fixed 700px border-box fixture.
        assert 265 < source["#clamp"]["width"] < 275, source["#clamp"]
        assert base.approx(source["#clamp"]["width"], prepared["#clamp"]["width"])
        assert base.pdy(result, "C05_CLAMP", "C05_MINBOX") > 15
        return {"classification": "positive-control"}
    if name == "body_width_context":
        assert 695 < source["__root"]["body"]["width"] < 705, source["__root"]
        assert prepared["__root"]["body"]["width"] - source["__root"]["body"]["width"] > 150, (source["__root"], prepared["__root"])
        assert prepared["#scope"]["width"] - source["#scope"]["width"] > 100, (source["#scope"], prepared["#scope"])
        assert prepared["#inner"]["width"] - source["#inner"]["width"] > 100, (source["#inner"], prepared["#inner"])
        assert base.pdx(result, "C05_BODY_LEFT", "C05_BODY_RIGHT") > 150, base.pdx(result, "C05_BODY_LEFT", "C05_BODY_RIGHT")
        assert base.pdy(result, "C05_BODY_LEFT", "C05_BODY_RIGHT") > 10
        return {"classification": "P0-004 finding"}
    if name == "body_transform_context":
        assert source["__root"]["body"]["style"]["transform"] != "none", source["__root"]
        assert prepared["__root"]["body"]["style"]["transform"] == "none", prepared["__root"]
        assert abs(prepared["#scope"]["x"] - source["#scope"]["x"]) > 100, (source["#scope"], prepared["#scope"])
        assert prepared["#scope"]["width"] - source["#scope"]["width"] > 90, (source["#scope"], prepared["#scope"])
        assert base.first_box(result, "C05_BODY_TRANSFORM_LEFT")["x0"] < 100, base.first_box(result, "C05_BODY_TRANSFORM_LEFT")
        assert base.pdy(result, "C05_BODY_TRANSFORM_LEFT", "C05_BODY_TRANSFORM_RIGHT") > 10
        return {"classification": "P0-004 finding"}
    return _original_validate(name, result)


base.specs = specs
base.validate = validate
raise SystemExit(base.main())
