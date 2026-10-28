#!/usr/bin/env python3
"""Baut e46-jira-cluster.js: ein einzelnes Skript ohne Abhängigkeiten, das <e46-jira-cluster> registriert (Jira-Variante).

Setzt aus ../cluster.js (Darstellung), ../sim.js (Demo-Fahrt), ../grain.js (Körnung), den Schriften aus ../fonts.css und dem
Kombi-CSS aus ../style.css sowie element.src.js (das Element) zusammen. Aufruf:  python3 build.py
"""
import json, pathlib, re

here = pathlib.Path(__file__).resolve().parent
web = here.parent

def read(p): return (web / p).read_text(encoding='utf-8')

css = read('style.css')
a, b = css.index('/* ---------- Kombi (SVG) ---------- */'), css.index('/* ---------- Bedienfeld')
cluster_css = ':host { display: block; line-height: 0; }\n.box { width: 100%; }\nsvg.cluster { display: block; width: 100%; height: auto; }\n' + css[a:b]

def strip_module(js):  # Node-Export-Zeilen entfernen, damit nichts mit einem vorhandenen "module" kollidiert
    return re.sub(r"^\s*if \(typeof module !== 'undefined'\).*\n", '', js, flags=re.M)

element = (here / 'element.src.js').read_text(encoding='utf-8')
element = element.replace("'__CSS__'", json.dumps(cluster_css)).replace("'__FONTS__'", json.dumps(read('fonts.css')))

out = (
    "/* <e46-jira-cluster> – digitales BMW-E46-Kombiinstrument, Jira-Variante, als Web Component. Erzeugt von web/widget/build.py, nicht von Hand ändern.\n"
    " * Schriften: Oswald und Barlow (SIL Open Font License 1.1), siehe web/fonts.css. */\n"
    "(function () {\n'use strict';\nconst window = {};   // cluster.js, sim.js und grain.js hängen ihre Klassen an dieses lokale Objekt\n"
    + read('grain.js') + '\n' + strip_module(read('cluster.js')) + '\n' + strip_module(read('sim.js')) + '\n'
    + "const { E46Cluster, DriveSim, TicketSim } = window;\n" + element + "\n})();\n"
)
(here / 'e46-jira-cluster.js').write_text(out, encoding='utf-8')
print('e46-jira-cluster.js', len(out) // 1024, 'KB')
