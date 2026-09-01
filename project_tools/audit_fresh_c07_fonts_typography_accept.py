#!/usr/bin/env python3
"""Acceptance wrapper for focused C07 typography probe.

Run #1 physically rendered the letter-spaced row correctly, but PyMuPDF split
that row into individual characters. This wrapper replaces only the brittle
span-aggregation assumption with a physical row-extent discriminator and keeps
the rest of the focused C07 acceptance fail-closed.
"""
import audit_fresh_c07_fonts_typography as base


def run_top_typography(ctx, out):
    html = r"""
    <article id='scope'>
      <div id='small' style='font-size:12px'>C07_SMALL_MARKER</div>
      <div id='big' style='font-size:30px'>C07_BIG_MARKER</div>
      <div id='regular' style='font-size:24px;font-weight:400;font-style:normal'>C07_REGULAR_MARKER</div>
      <div id='bold' style='font-size:24px;font-weight:700'>C07_BOLD_MARKER</div>
      <div id='italic' style='font-size:24px;font-style:italic'>C07_ITALIC_MARKER</div>
      <div id='ls0' style='font-size:22px;letter-spacing:0'>C07LETTERTEST</div>
      <div id='ls8' style='font-size:22px;letter-spacing:8px'>C07LETTERTEST</div>
      <div id='lh18' style='font-size:16px;line-height:18px'>C07LINE_A<br>C07LINE_B</div>
      <div id='lh48' style='font-size:16px;line-height:48px'>C07LINE_C<br>C07LINE_D</div>
      <div id='decor' style='font-size:30px;text-decoration-line:underline;text-decoration-color:#ee2222;text-decoration-thickness:5px'>C07_DECORATION</div>
      <div id='paint' style='font-size:42px;font-weight:700;color:#111;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee'>C07_PAINT</div>
      <div id='serif' style='display:inline-block;font:24px serif'>C07WIDTHMMMMMMMM</div><br>
      <div id='mono' style='display:inline-block;font:24px monospace'>C07WIDTHMMMMMMMM</div>
      <div id='unicode' style='font-size:22px'>Кириллица C07_CYRILLIC · Ελληνικά C07_GREEK · العربية</div>
      <div id='balance' style='width:320px;text-wrap:balance'>C07_BALANCE one two three four five six seven eight nine ten</div>
    </article>
    """
    page = ctx.new_page()
    base.load_runtime(page, html)
    supports = page.evaluate("()=>({balance:CSS.supports('text-wrap','balance'),textBoxTrim:CSS.supports('text-box-trim','trim-both')})")
    base.select_top(page)
    request = base.begin_prepare(page)
    path = out / 'top_typography.pdf'
    art = base.print_pdf(page, path, {"red": ((238, 34, 34), 45), "blue": ((34, 68, 238), 45)})
    spans = art['spans']
    words = art['words']

    small = base.find_spans(spans, 'C07_SMALL_MARKER')
    big = base.find_spans(spans, 'C07_BIG_MARKER')
    regular = base.find_spans(spans, 'C07_REGULAR_MARKER')
    bold = base.find_spans(spans, 'C07_BOLD_MARKER')
    italic = base.find_spans(spans, 'C07_ITALIC_MARKER')
    assert small and big and max(s['size'] for s in big) > min(s['size'] for s in small) * 2, (small, big)
    assert regular and bold and italic, (regular, bold, italic)
    assert any(s['flags'] & 16 for s in bold), bold
    assert any(s['flags'] & 2 for s in italic), italic

    normal = base.find_word(words, 'C07LETTERTEST')
    line_a = base.find_word(words, 'C07LINE_A')
    line_b = base.find_word(words, 'C07LINE_B')
    line_c = base.find_word(words, 'C07LINE_C')
    line_d = base.find_word(words, 'C07LINE_D')
    assert normal and line_a and line_b and line_c and line_d, (normal, line_a, line_b, line_c, line_d)

    # The 8px letter-spaced row is physically extracted as one-character words.
    # Bound it strictly between the normal row and the following line-height
    # control, then compare the full physical x extent.
    spaced_words = [
        w for w in words
        if w['page'] == normal['page']
        and w['y0'] > normal['y0'] + 8
        and w['y0'] < line_a['y0'] - 4
    ]
    assert len(spaced_words) >= 10, spaced_words
    normal_width = normal['x1'] - normal['x0']
    spaced_width = max(w['x1'] for w in spaced_words) - min(w['x0'] for w in spaced_words)
    assert spaced_width > normal_width + 35, (normal_width, spaced_width, spaced_words)

    gap_small = abs(line_b['y0'] - line_a['y0'])
    gap_large = abs(line_d['y0'] - line_c['y0'])
    assert gap_large > gap_small + 15, (gap_small, gap_large)

    # Underline + text-shadow/stroke are physical paint controls, not computed-style-only claims.
    assert art['colors']['red'] > 250 and art['colors']['blue'] > 250, art['colors']

    family = base.find_spans(spans, 'C07WIDTHMMMMMMMM')
    assert len(family) >= 2, family
    family_widths = [s['bbox'][2] - s['bbox'][0] for s in family]
    assert max(family_widths) - min(family_widths) > 5, family_widths

    text = ' '.join(s['text'] for s in spans)
    assert 'Кириллица' in text and 'C07_CYRILLIC' in text and 'C07_GREEK' in text, text[-1200:]

    result = {
        'supports': supports,
        'artifact': {k: v for k, v in art.items() if k not in ('spans', 'words')},
        'fontSpans': {
            'small': small,
            'big': big,
            'regular': regular,
            'bold': bold,
            'italic': italic,
            'letterSpacing': {
                'normalWidth': normal_width,
                'spacedWidth': spaced_width,
                'spacedWordCount': len(spaced_words),
            },
            'familyWidths': family_widths,
        },
        'lineGaps': {'small': gap_small, 'large': gap_large},
        'resourceReport': request.get('meta', {}).get('resourceReport', {}),
    }
    base.resolve_prepare(page)
    page.close()
    return result


base.run_top_typography = run_top_typography
raise SystemExit(base.main())
