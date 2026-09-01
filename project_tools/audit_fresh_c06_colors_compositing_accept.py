#!/usr/bin/env python3
"""Acceptance wrapper: capture prepared C06 screenshots with WebClip UI hidden as at the physical render cut."""
import audit_fresh_c06_colors_compositing as base


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


base.run_static_case = run_static_case
raise SystemExit(base.main())
