#!/usr/bin/env python3
"""Generate crawlable, noindex HTML pages 2+ for the Fix My Diaper test.

Input:  test.html and places-berlin.json in the repository root.
Output: test-page-2.html, test-page-3.html, etc. (same directory).

The existing test.html remains untouched. Its original JavaScript filtering and
infinite scroll continue to work; the static link near the footer points to
page 2, from which Google/browsers can follow ordinary HTML next-page links.

Test pages are deliberately NOINDEX. Do not publish these test files as
indexable production pages without a separate production adaptation.
"""

import html
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
JSON_FILE = ROOT / 'places-berlin.json'
TEMPLATE_FILE = ROOT / 'test.html'
PAGE_SIZE = 24
PAGE_PREFIX = 'test-page-'

# Same neighborhood whitelist as test.html / berlin.html.
NEIGHBORHOODS = [
    'Mitte', 'Neukölln', 'Kreuzberg', 'Friedrichshain', 'Spandau',
    'Lichtenberg', 'Reinickendorf', 'Pankow-Prenzlauerberg',
    'Treptow-Köpenick', 'Tempelhof-Schöneberg',
    'Steglitz-Zehlendorf', 'Charlottenburg-Wilmersdorf',
]


def esc(value):
    return html.escape(str(value if value is not None else ''), quote=True)


def clean_text(value):
    if value is None:
        return ''
    if isinstance(value, list):
        return ', '.join(str(x) for x in value if x is not None).strip()
    return str(value).strip()


def norm_neighborhood(value):
    return re.sub(r'\s+', ' ', re.sub(r'\s*-\s*', '-', clean_text(value))).strip()


def candidates(p):
    result = []
    for key in ('photo_local_url', 'photo_url', 'photo_large_url', 'photo_small_url'):
        url = clean_text(p.get(key))
        if url and url not in result:
            result.append(url)
    legacy = p.get('photo')
    if isinstance(legacy, list) and legacy and isinstance(legacy[0], dict):
        url = clean_text(legacy[0].get('url'))
        if url and url not in result:
            result.append(url)
    return result


def safe_img_url(p):
    # Never place a user-provided javascript: or data: URL into generated HTML.
    for value in candidates(p):
        parts = urlsplit(value)
        if parts.scheme in ('https', 'http') and parts.netloc:
            return value
        if not parts.scheme and not parts.netloc and not value.startswith('//'):
            return value
    return ''


def tags(p):
    items = []
    for key in ('changing_table_location', 'supplies_available', 'changing_table_condition'):
        value = p.get(key)
        if isinstance(value, list):
            items.extend(value)
        elif value:
            items.append(value)
    seen, result = set(), []
    for item in items:
        val = clean_text(item)
        if val and val.casefold() not in seen:
            seen.add(val.casefold())
            result.append(val)
    return result[:12]


def created_timestamp(value):
    try:
        s = clean_text(value)
        if not s:
            return 0.0
        date = datetime.fromisoformat(s.replace('Z', '+00:00'))
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        return date.timestamp()
    except (ValueError, OverflowError):
        return 0.0


def sort_key(p):
    # Same priorities as the original JS: photo first, recent records first,
    # name third. Non-ASCII name tie-breaks can differ from JS localeCompare.
    return (0 if candidates(p) else 1,
            -created_timestamp(p.get('created_at')),
            clean_text(p.get('name')).casefold())


def render_card(p, index):
    name = clean_text(p.get('name')) or 'Unnamed place'
    photo = safe_img_url(p)
    if photo:
        loading = 'eager' if index < 6 else 'lazy'
        media = (
            f'<img src="{esc(photo)}" alt="{esc(name)} changing table" '
            f'loading="{loading}" decoding="async">'
        )
    else:
        media = '<span class="no-photo">No photo yet</span>'

    stars = p.get('stars')
    is_rated = isinstance(stars, (int, float)) and not isinstance(stars, bool) and stars != 0
    stars_value = float(stars) if is_rated else 0.0
    stars_label = f'{stars}/5' if is_rated else 'Not rated yet'
    star_class = 'star-rating' if is_rated else 'star-rating is-empty'
    kind = clean_text(p.get('type')) or 'Not specified'
    address = clean_text(p.get('address'))
    address_html = '<br>' + esc(address) if address else ''
    quote = clean_text(p.get('review'))
    quote_html = f'<div class="place-quote">“{esc(quote)}”</div>' if quote else ''
    tags_html = ''.join(f'<span class="tag">{esc(t)}</span>' for t in tags(p))
    tags_wrap = f'<div class="tags">{tags_html}</div>' if tags_html else ''

    return f'''<article class="place-card">
      <div class="place-media">{media}</div>
      <div><div class="{star_class}" style="--rating:{stars_value:g};"></div><span class="star-note">{esc(stars_label)}</span></div>
      <div class="place-title">{esc(name)}</div>
      <div class="place-meta">{esc(kind)}{address_html}</div>
      {quote_html}
      {tags_wrap}
    </article>'''


def extract(pattern, source, field):
    match = re.search(pattern, source, flags=re.DOTALL | re.IGNORECASE)
    if not match:
        raise ValueError(f'Cannot extract {field} from test.html')
    return match.group(0)


def pager(page, count):
    # Each URL is a *real* HTML page. Links can be followed without JavaScript.
    links = []
    if page == 2:
        links.append('<a href="/test.html">← Page 1</a>')
    else:
        links.append(f'<a href="/test-page-{page - 1}.html">← Page {page - 1}</a>')
    links.append('<a href="/test.html">Page 1</a>')
    if page > 2:
        links.append(f'<span aria-current="page">Page {page}</span>')
    else:
        links.append('<span aria-current="page">Page 2</span>')
    if page < count:
        links.append(f'<a href="/test-page-{page + 1}.html">Page {page + 1} →</a>')

    return (
        '<div aria-label="Berlin places pagination" style="margin:2rem auto; '
        'text-align:center;line-height:2;font-size:0.9rem;">'
        ' · '.join(links) + '</div>'
    )


def render_page(page, total_pages, entries, style, header_nav, footer):
    cards = '\n'.join(render_card(p, i) for i, p in enumerate(entries))
    start = (page - 1) * PAGE_SIZE + 1
    end = (page - 1) * PAGE_SIZE + len(entries)
    return f'''<!DOCTYPE html>
<!-- Generated by generate_test_pages.py; do not edit manually. -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Changing Tables in Berlin – Page {page} | Fix My Diaper (Test)</title>
  <meta name="description" content="Browse more changing table locations in Berlin, page {page}. Community-submitted places and baby changing facilities." />
  <meta name="robots" content="noindex, follow" />
  <link rel="icon" href="/images/favicon.ico" sizes="any" />
  <link rel="stylesheet" href="/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
  {style}
</head>
<body>
  <div class="page">
    {header_nav}
    <h1>Changing Tables in Berlin</h1>
    <p class="intro">Find baby-friendly places with changing tables across Berlin. Page {page} of {total_pages}.</p>
    <section class="cards-grid" aria-label="Berlin places {start} to {end}">
{cards}
    </section>
    <div class="results-bottom">Places {start}–{end} · Page {page} of {total_pages}</div>
    {pager(page, total_pages)}
    {footer}
  </div>
</body>
</html>
'''


def main():
    if not JSON_FILE.is_file():
        raise SystemExit(f'Missing {JSON_FILE.name}. Commit or generate it before running this script.')
    if not TEMPLATE_FILE.is_file():
        raise SystemExit('Missing test.html in the repository root.')

    source = TEMPLATE_FILE.read_text(encoding='utf-8')
    if 'noindex' not in source.lower():
        raise SystemExit('Safety check: test.html must be noindex during testing.')
    if '/test-page-2.html' not in source:
        raise SystemExit('Add the static /test-page-2.html link to test.html first.')

    style = extract(r'<style\b[^>]*>.*?</style>', source, 'inline CSS')
    header_nav = extract(r'<nav\b[^>]*>.*?</nav>', source, 'site navigation')
    footer = extract(r'<footer\b[^>]*>.*?</footer>', source, 'footer')

    data = json.loads(JSON_FILE.read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise SystemExit(f'{JSON_FILE.name} must contain a JSON list.')
    valid = set(NEIGHBORHOODS)
    entries = [p for p in data if isinstance(p, dict)
               and norm_neighborhood(p.get('neighborhood')) in valid]
    entries.sort(key=sort_key)
    total_pages = math.ceil(len(entries) / PAGE_SIZE)
    if total_pages < 2:
        raise SystemExit(f'Only {len(entries)} Berlin places: no second page to link to. '
                         'Remove the test-page-2 link or wait for more places.')

    written = set()
    for number in range(2, total_pages + 1):
        page_entries = entries[(number - 1) * PAGE_SIZE:number * PAGE_SIZE]
        path = ROOT / f'{PAGE_PREFIX}{number}.html'
        path.write_text(
            render_page(number, total_pages, page_entries, style, header_nav, footer),
            encoding='utf-8'
        )
        written.add(path)
        print(f'Created {path.name}: {len(page_entries)} places')

    # Remove obsolete pages left from an earlier larger JSON snapshot.
    for path in ROOT.glob('test-page-*.html'):
        if re.fullmatch(r'test-page-\d+\.html', path.name) and path not in written:
            if '<!-- Generated by generate_test_pages.py; do not edit manually. -->' in path.read_text(encoding='utf-8'):
                path.unlink()
                print(f'Removed obsolete {path.name}')

    print(f'Done: {len(entries)} Berlin places, {total_pages} pages, '
          f'{total_pages - 1} static pages generated. No production files changed.')


if __name__ == '__main__':
    main()
