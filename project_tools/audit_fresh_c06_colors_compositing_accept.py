#!/usr/bin/env python3
"""Acceptance wrapper for focused C06: render-cut screenshots and exact screen-blend color model."""
import audit_fresh_c06_colors_compositing as base


_original_specs = base.static_specs


def static_specs():
    specs = _original_specs()
    for spec in specs:
        spec["targets"]["screen_mix"] = ([240, 93, 240], 32)
        if spec["name"] == "mix_blend_internal":
            def validate_internal(result):
                assert result["pdf"]["counts"]["screen_mix"] > 1000, result["pdf"]
                assert base.approx_rgb(result["source"]["centerRgb"], result["prepared"]["centerRgb"], 20), result
            spec["validate"] = validate_internal
        elif spec["name"] == "blend_unselected_backdrop":
            def validate_external(result):
                assert base.approx_rgb(result["source"]["centerRgb"], [240, 93, 240], 35), result
                assert base.approx_rgb(result["prepared"]["centerRgb"], [238, 34, 34], 35), result
                assert result["pdf"]["counts"]["red"] > 1500, result["pdf"]
                assert result["pdf"]["counts"]["screen_mix"] < 500, result["pdf"]
            spec["validate"] = validate_external
    return specs


def run_static_case(ctx, out, spec):
    page = ctx.new_page()
    base.load(page, spec["html"], spec.get("style", ""))
    source_png = out / f"{spec['name']}-source.png"
    source = base.capture_element(page, spec.get("sample", "#scope"), source_png)
    base.select(page, spec.get("include", "#scope"))
    request = base.begin_prepare(page)

    hidden = base.command(page, {"type": "WEBCLIP_PRINT_RENDER_STATE", "hidden": True})
    assert hidden.get("ok") is True, hidden
    prepared_png = out / f"{spec['name']}-prepared.png"
    prepared = base.capture_element(page, spec.get("sample", "#scope"), prepared_png)

    pdf = base.pdf_info(page, out / f"{spec['name']}.pdf", spec["targets"])
    result = {
        "source": source,
        "prepared": prepared,
        "pdf": pdf,
        "resourceReport": request.get("meta", {}).get("resourceReport", {}),
    }
    spec["validate"](result)
    base.resolve_prepare(page)
    page.close()
    return result


base.static_specs = static_specs
base.run_static_case = run_static_case
raise SystemExit(base.main())
