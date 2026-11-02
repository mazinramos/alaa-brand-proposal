#!/usr/bin/env python3
"""أداة تحويل Markdown إلى PDF بهوية وشلي (عربي RTL) - راجع build/README.md

الاستعمال:
    python build/build.py             # يبني الملفين الحقيقيين لو كل ملفات docs/ موجودة، وإلا يبني العينة
    python build/build.py --real      # بناء حقيقي فقط (يفشل لو في ملف ناقص)
    python build/build.py --sample    # بناء العينة فقط
"""
import argparse, datetime, html, json, re, sys, tempfile
from pathlib import Path

import markdown
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

BUILD = Path(__file__).resolve().parent
ROOT = BUILD.parent
MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
NOTES_HEADING = re.compile(r"^##\s+ملاحظات\s+للمشرف\s*$", re.M)
PAGEBREAK = re.compile(r"^\s*(?:<!--\s*(?:page-?break|pagebreak|فاصل-?صفحة)\s*-->|\\(?:newpage|pagebreak)|---\s*pagebreak\s*---)\s*$", re.M | re.I)

# أيقونات (SVG مضمّنة بدل الإيموجي لأن الخطوط لا تحتوي إيموجي)
ICONS = {
    "ok": '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 48a208 208 0 1 0 0 416 208 208 0 1 0 0-416zm108.7 150.6-128 160a24 24 0 0 1-35.3 2.3l-72-72a24 24 0 1 1 33.9-33.9l52.9 52.9 111.3-139.3a24 24 0 1 1 37.2 29.9z"/></svg>',
    "warn": '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7.2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8.2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0-64 0 32 32 0 1 0 64 0z"/></svg>',
    "no": '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 48a208 208 0 1 0 0 416 208 208 0 1 0 0-416zm97 111c9.4 9.4 9.4 24.6 0 33.9L289.9 256l63.1 63.1c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L256 289.9 192.9 353c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l63.1-63.1-63.1-63.1c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L256 222.1l63.1-63.1c9.4-9.4 24.6-9.4 33.9 0z"/></svg>',
}
EMOJI = {"✅": "ok", "✔️": "ok", "☑️": "ok", "⚠️": "warn", "⚠": "warn", "❌": "no", "✖️": "no"}


def icon(kind):
    return f'<span class="ico {kind}">{ICONS[kind]}</span>'


def arabic_date(d):
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


# ---------------------------------------------------------------- Markdown

def normalize_lists(text):
    """القوائم المتداخلة بمسافتين (شائعة) تُحوَّل لأربع مسافات كما يتطلب Markdown."""
    lines, in_fence, indents = text.split("\n"), False, []
    item = re.compile(r"^( +)(?:[-*+]|\d+[.)])\s")
    for ln in lines:
        if ln.lstrip().startswith("```"):
            in_fence = not in_fence
        elif not in_fence and (m := item.match(ln)):
            indents.append(len(m.group(1)))
    if not indents or all(i % 4 == 0 for i in indents):
        return text
    out, in_fence = [], False
    for ln in lines:
        if ln.lstrip().startswith("```"):
            in_fence = not in_fence
        m = item.match(ln)
        out.append(" " * (len(m.group(1)) * 2) + ln.lstrip(" ") if (m and not in_fence) else ln)
    return "\n".join(out)


def separate_blockquotes(text):
    """صندوقان متتاليان يفصل بينهما سطر فارغ يبقيان صندوقين (Markdown يدمجهما افتراضياً)."""
    return re.sub(r"(^>.*)\n[ \t]*\n(?=>)", r"\1\n\n<!-- -->\n\n", text, flags=re.M)

def load_markdown(path):
    text = Path(path).read_text(encoding="utf-8").lstrip("\ufeff")
    m = NOTES_HEADING.search(text)  # قص "ملاحظات للمشرف" إلى نهاية الملف
    if m:
        text = text[: m.start()]
    # حاويات ::: card  (تُحوَّل لعلامات مؤقتة ثم تُستبدل بعد تحويل Markdown)
    def container(match):
        title = match.group(1).strip()
        return f"\n\nCARDSTART{{{html.escape(title)}}}\n\n{match.group(2).strip()}\n\nCARDEND\n\n"
    text = re.sub(r"^:::[ \t]*card[ \t]*([^\n]*)\n(.*?)^:::[ \t]*$", container, text, flags=re.S | re.M)
    text = normalize_lists(text)
    text = separate_blockquotes(text)
    text = PAGEBREAK.sub('\n<div class="pagebreak"></div>\n', text)
    return text


def md_to_html(text, src_dir):
    h = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists", "md_in_html"], output_format="html")
    h = re.sub(r"<p>CARDSTART\{(.*?)\}</p>", lambda m: '<div class="card">' + (f'<p class="card-title">{m.group(1)}</p>' if m.group(1) else ""), h)
    h = h.replace("<p>CARDEND</p>", "</div>")
    # جداول داخل إطار بحواف دائرية
    h = re.sub(r"<table>", '<div class="table-wrap"><table>', h)
    h = h.replace("</table>", "</table></div>")
    # صناديق الملاحظة: نوعها من أول رمز
    def bq(m):
        inner = m.group(1)
        cls = ""
        first = strip_tags(inner)[:3]
        if any(first.startswith(e) for e in ("⚠",)):
            cls = ' class="warn"'
        elif any(first.startswith(e) for e in ("✅", "✔", "☑")):
            cls = ' class="ok"'
        return f"<blockquote{cls}>{inner}</blockquote>"
    h = re.sub(r"<blockquote>(.*?)</blockquote>", bq, h, flags=re.S)
    # إيموجي -> أيقونات SVG
    for e, k in sorted(EMOJI.items(), key=lambda kv: -len(kv[0])):
        h = h.replace(e, icon(k))
    h = h.replace("\ufe0f", "")
    # شارات: [[نص]] و [[~نص]] (شفافة)
    h = re.sub(r"\[\[~(.+?)\]\]", r'<span class="badge outline">\1</span>', h)
    h = re.sub(r"\[\[(.+?)\]\]", r'<span class="badge">\1</span>', h)
    # الصور النسبية
    def img(m):
        src = m.group(2)
        if re.match(r"^(https?:|file:|data:|/)", src):
            return m.group(0)
        return f'{m.group(1)}{(Path(src_dir) / src).resolve().as_uri()}{m.group(3)}'
    h = re.sub(r'(<img[^>]*src=")([^"]+)(")', img, h)
    return h


def add_heading_ids(h, used):
    def sub(m):
        lvl, attrs, inner = m.group(1), m.group(2), m.group(3)
        base = re.sub(r"[^\w\u0600-\u06FF]+", "-", strip_tags(inner)).strip("-") or "sec"
        slug, i = base, 2
        while slug in used:
            slug, i = f"{base}-{i}", i + 1
        used.add(slug)
        return f'<h{lvl} id="{slug}"{attrs}>{inner}</h{lvl}>'
    return re.sub(r"<h([1-6])([^>]*)>(.*?)</h\1>", sub, h, flags=re.S)


def lead_after_h1(h):
    """أول فقرة بعد h1 (السطر الذي يشرح الملف ويخدم من) تُعرض كنص تمهيدي."""
    return re.sub(r"(</h1>\s*)<p>(.*?)</p>", r'\1<p class="lead">\2</p>', h, count=1, flags=re.S)


# ---------------------------------------------------------------- بناء HTML
def build_html(book, sources, title, date_str):
    used, body_parts = set(), []
    for src in sources:
        text = load_markdown(src["path"])
        h = md_to_html(text, Path(src["path"]).parent)
        h = add_heading_ids(h, used)
        h = lead_after_h1(h)
        kicker = src.get("kicker")
        if kicker:
            h = re.sub(r"<h1", f'<div class="part-kicker"><span class="badge">{html.escape(kicker)}</span></div>\n<h1', h, count=1)
        body_parts.append(h)
    body = "\n".join(body_parts)
    heads = [(int(m.group(1)), m.group(2), strip_tags(m.group(3))) for m in re.finditer(r'<h([1-6]) id="([^"]+)"[^>]*>(.*?)</h\1>', body, flags=re.S)]
    return body, heads


def toc_html(heads, pages):
    rows = []
    for idx, (lvl, hid, txt) in enumerate(heads):
        if lvl > 3:
            continue
        n = pages.get(idx, "00")
        rows.append(f'<div class="toc-row l{lvl}"><span class="t">{html.escape(txt)}</span><span class="dots"></span><span class="n">{n}</span></div>')
    return '<section class="toc"><div class="toc-title">الفهرس</div>' + "\n".join(rows) + "</section>"


def page_html(book, title, date_str, body, toc):
    fonts = (BUILD / "template" / "fonts.css").read_text(encoding="utf-8")
    css = (BUILD / "template" / "style.css").read_text(encoding="utf-8")
    run = book.get("running_title") or title
    run = run.replace("\\", "\\\\").replace('"', '\\"')
    extra = f'@page{{ @top-right{{ content:"{run}"; font-family:Cairo; font-size:10.5pt; font-weight:600; color:#7A4455; direction:rtl; vertical-align:bottom; padding-bottom:6mm; }} }}'
    subtitle = book.get("subtitle", "")
    sub = f'<div class="doc-sub">{html.escape(subtitle)}</div>' if subtitle else ""
    cover = f'''<section class="cover">
  <div class="top"><span class="pill">{html.escape(book.get("kicker", "عرض مشروع"))}</span></div>
  <div class="brand">Alaa Mahjob</div>
  <div class="rule"></div>
  <div class="doc-title">{html.escape(title)}</div>{sub}
  <div class="foot"><div class="for">مُعدّ لـ: ألاء محجوب | <bdi>Alaa Mahjob</bdi></div><div class="date">{html.escape(date_str)}</div></div>
</section>'''
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>{fonts.replace("../fonts/", (BUILD / "fonts").as_uri() + "/")}</style><style>{css}</style><style>{extra}</style></head>
<body>{cover}{toc}<main>{body}</main></body></html>'''


# ---------------------------------------------------------------- PDF
def render_pdf(browser, html_text, out_path):
    tmp = BUILD / "_tmp"
    tmp.mkdir(exist_ok=True)
    f = tmp / (Path(out_path).stem.encode("ascii", "ignore").decode() or "doc")
    f = f.with_suffix(".html")
    f.write_text(html_text, encoding="utf-8")
    page = browser.new_page()
    page.goto(f.as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(300)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    page.pdf(path=str(out_path), format="A4", print_background=True, prefer_css_page_size=True, outline=True, tagged=True)
    page.close()


def outline_pages(pdf_path):
    r = PdfReader(str(pdf_path))
    res = []
    def walk(items):
        for it in items:
            if isinstance(it, list):
                walk(it)
            else:
                res.append((str(it.title), r.get_destination_page_number(it) + 1))
    walk(r.outline)
    return res, len(r.pages)


def build_book(browser, book, base, out_dir, date_str):
    sources = []
    for s in book["sources"]:
        s = dict(s) if isinstance(s, dict) else {"path": s}
        s["path"] = (base / s["path"]).resolve()
        if not s["path"].exists():
            raise FileNotFoundError(f"الملف غير موجود: {s['path']}")
        sources.append(s)
    title = book["title"]
    if not title:
        m = re.search(r"^#\s+(.+)$", sources[0]["path"].read_text(encoding="utf-8"), re.M)
        title = m.group(1).strip() if m else sources[0]["path"].stem
    body, heads = build_html(book, sources, title, date_str)
    out = out_dir / book["output"]
    pages = {}
    for attempt in range(3):  # تمريرة أولى بأرقام مؤقتة، ثم تصحيح الأرقام من مخطط الـ PDF
        render_pdf(browser, page_html(book, title, date_str, body, toc_html(heads, pages)), out)
        ol, total = outline_pages(out)
        if len(ol) != len(heads):
            raise RuntimeError(f"عدد العناوين في الـ PDF ({len(ol)}) لا يطابق عناوين الملفات ({len(heads)})")
        new = {i: str(p) for i, (_, p) in enumerate(ol)}
        if new == pages:
            break
        pages = new
    print(f"  ✔ {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}  ({total} صفحة)")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--real", action="store_true", help="بناء حقيقي فقط")
    g.add_argument("--sample", action="store_true", help="بناء العينة فقط")
    ap.add_argument("--date", help="تاريخ الغلاف (مثال: 2026-11-02). الافتراضي: تاريخ اليوم أو \"date\" في books.json")
    a = ap.parse_args()

    real_cfg = json.loads((BUILD / "books.json").read_text(encoding="utf-8"))
    sample_cfg = json.loads((BUILD / "sample" / "books.json").read_text(encoding="utf-8"))

    def missing(cfg, base):
        return [str((base / (s["path"] if isinstance(s, dict) else s))) for b in cfg["books"] for s in b["sources"] if not (base / (s["path"] if isinstance(s, dict) else s)).exists()]

    miss = missing(real_cfg, ROOT)
    if a.real:
        if miss:
            sys.exit("✘ ملفات ناقصة للبناء الحقيقي (ينتظر تسليم الحسابات 1-4):\n  " + "\n  ".join(miss))
        mode = "real"
    elif a.sample:
        mode = "sample"
    else:
        mode = "sample" if miss else "real"
        if miss:
            print("⚠ ملفات الحسابات 1-4 غير مكتملة، سيتم بناء العينة بدل الحقيقي:\n  " + "\n  ".join(miss))

    if mode == "real":
        cfg, base, out_dir = real_cfg, ROOT, ROOT / real_cfg.get("output_dir", "final")
    else:
        cfg, base, out_dir = sample_cfg, BUILD / "sample", BUILD / "sample" / "out"
    d = a.date or cfg.get("date")
    date_str = arabic_date(datetime.date.fromisoformat(d) if d else datetime.date.today())

    print(f"البناء ({'حقيقي' if mode == 'real' else 'عينة'}) - التاريخ: {date_str}")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for book in cfg["books"]:
            build_book(browser, book, base, out_dir, date_str)
        browser.close()


if __name__ == "__main__":
    main()
