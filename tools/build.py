#!/usr/bin/env python3
"""Build the static pages from src/ templates.

Usage:  python3 tools/build.py
Edit content in src/data.json or the templates in src/, then run this script.
It writes index.html, resume.html and assets/js/data.js at the repo root.
"""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
data = json.loads((SRC / "data.json").read_text(encoding="utf-8"))

ARROW = ('<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.5 11.5l7-7M5.5 4.5h6v6" '
         'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
STAR = ('<svg viewBox="0 0 36 36" fill="currentColor" aria-hidden="true"><path d="M18 0c1.2 9.6 8.4 16.8 18 18'
        '-9.6 1.2-16.8 8.4-18 18-1.2-9.6-8.4-16.8-18-18C9.6 16.8 16.8 9.6 18 0z"/></svg>')
CHECK = ('<svg class="check" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M4 11.5l4.5 4.5L18 6" '
         'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def e(s):
    return escape(s, quote=True)


def services_list():
    out = []
    for i, s in enumerate(data["services"]):
        n = f"{i + 1:02d}"
        out.append(
            f'<li class="svc" data-i="{i}"><button class="svc__btn" type="button" aria-controls="svc-card">'
            f'<span class="svc__content"><span class="svc__meta">{n}<i></i></span>'
            f'<span class="svc__title">{e(s["title"])}</span><span class="svc__desc">{e(s["desc"])}</span></span>'
            f'<span class="svc__arrow">{ARROW}</span></button></li>')
    return "\n".join(out)


def works():
    out = []
    total = len(data["works"])
    for i, w in enumerate(data["works"]):
        btns = (f'<a class="btn btn--primary" href="{e(w["figma"])}" target="_blank" rel="noopener">'
                f'Figma preview {ARROW}</a>')
        if w.get("live"):
            btns += (f'<a class="btn btn--ghost-dark" href="{e(w["live"])}" target="_blank" rel="noopener">'
                     f'Live site {ARROW}</a>')
        ticks = "".join(f'<i class="{"on" if k == i else ""}"></i>' for k in range(total))
        out.append(f'''<article class="work" style="--i:{i}">
            <div class="work__cover">
              <div class="glow" aria-hidden="true" style="{"right:-10%" if i % 2 == 0 else "left:-12%"};bottom:-20%"></div>
              <div class="work__pills"><span class="pill pill--dark">FRAME {i + 1:02d}A</span><span class="pill pill--orange">{e(w["tag"].upper())}</span></div>
              <img class="mock water" src="assets/img/work/{w["img"]}.webp" alt="{e(w["alt"])}" loading="lazy">
            </div>
            <div class="work__info">
              <div class="work__num"><b class="grad-text">{i + 1:02d}</b><small>/ {total:02d}</small></div>
              <h3 class="work__name">{e(w["name"])}</h3>
              <p class="t-label work__meta">{e(w["meta"])}</p>
              <p class="work__desc">{e(w["desc"])}</p>
              <div class="btn-row">{btns}</div>
            </div>
            <div class="work__ticks" aria-hidden="true">{ticks}</div>
          </article>''')
    return "\n".join(out)


def steps():
    out = []
    for i, s in enumerate(data["steps"]):
        out.append(
            f'<button class="step" type="button" data-i="{i}">'
            f'<span class="step__name">{CHECK}<span class="no">{i + 1:02d}</span><strong>{e(s["name"])}</strong></span>'
            f'<span><span class="when">{e(s["when"])}</span></span>'
            f'<span class="step__desc">{e(s["desc"])}</span></button>')
    return "\n".join(out)


def jobs():
    out = []
    for j in data["jobs"]:
        now = '<span class="now">CURRENT</span>' if j.get("now") else ""
        items = "".join(f"<li>{e(x)}</li>" for x in j["items"])
        link = (f'<a class="job__link" href="https://{e(j["link"])}" target="_blank" rel="noopener">'
                f'Live product: {e(j["link"])} ↗</a>') if j.get("link") else ""
        out.append(
            f'<div class="job"><div class="job__when">{e(j["when"].upper())}{now}</div>'
            f'<div><h3>{e(j["role"])}</h3><p class="job__co"><b>{e(j["co"])}</b> <span>· {e(j["loc"])}</span></p>'
            f'<ul>{items}</ul>{link}</div></div>')
    return "\n".join(out)


phrases = "".join(f"<span>{p}</span>{STAR}" for p in
                  ["Let's build together", "Let's make together", "Let's design together"] * 2)
contact = (SRC / "partials/contact.html").read_text(encoding="utf-8")
footer = (SRC / "partials/footer.html").read_text(encoding="utf-8").replace("@@PHRASES@@", phrases)


def page(name, home):
    html = (SRC / name).read_text(encoding="utf-8")
    html = html.replace("<!-- @@CONTACT@@ -->", contact).replace("<!-- @@FOOTER@@ -->", footer)
    html = html.replace("@@HOME@@", home).replace("@@ROOT@@", "")
    html = html.replace('<ul class="svc-list" id="svc-list"></ul>', f'<ul class="svc-list" id="svc-list">{services_list()}</ul>')
    html = html.replace('<div class="works__list" id="works-list"></div>', f'<div class="works__list" id="works-list">{works()}</div>')
    html = html.replace('<div id="steps"></div>', f'<div id="steps">{steps()}</div>')
    html = html.replace('<div id="jobs"></div>', f'<div id="jobs">{jobs()}</div>')
    header = "<!-- Generated by tools/build.py from src/ — edit src/ and rebuild. -->\n"
    (ROOT / name).write_text(html.replace("<!doctype html>", "<!doctype html>\n" + header, 1), encoding="utf-8")


page("index.html", "")
page("resume.html", "index.html")
js = {"services": data["services"], "steps": data["steps"]}
(ROOT / "assets/js/data.js").write_text(
    "/* Generated by tools/build.py from src/data.json */\nwindow.SITE = " + json.dumps(js, ensure_ascii=False) + ";\n",
    encoding="utf-8")
print("built index.html, resume.html, assets/js/data.js")
