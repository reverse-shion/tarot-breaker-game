"""Build a dev-only, source-pinned Garden preview without CDN script requests."""
import base64
import hashlib
import json
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent.parent
sha = sys.argv[1] if len(sys.argv) > 1 else "a324d10f4711d15c45502510969850bb5e57d6ca"
if not re.fullmatch(r"[0-9a-f]{40}", sha):
    raise ValueError("Provide one exact source commit SHA")
asset_base = f"https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/{sha}/"
records = {}


def source(path):
    text = subprocess.check_output(["git", "show", f"{sha}:{path}"], cwd=root).decode()
    records[path] = hashlib.sha256(text.encode()).hexdigest()
    return text


def inline(path):
    text = source(path)
    if path == "game.js":
        # Preview-only CORS admission for pinned cross-origin image readback.
        old = "const image = new Image();\n    image.src = src;"
        if text.count(old) != 1:
            raise ValueError("Image loader anchor changed; review before rebuilding")
        text = text.replace(old, 'const image = new Image();\n    image.crossOrigin = "anonymous";\n    image.src = src;')
    return text.replace("</script", "<\\/script")


def script(match):
    before, path, after = match.groups()
    if path == "garden-dev-bootstrap.js":
        # This page is specifically for Garden dev checkpoints. Original modules
        # retain their query checks; avoid network document.write dependencies.
        return "\n".join("<script>\n" + inline(p) + "\n</script>" for p in
                         ["dev-checkpoints.js", "progress-resume.js", "garden-resume.js"])
    return "<script" + before + after + ">\n" + inline(path) + "\n</script>"


def stylesheet(match):
    href, path = match.groups()
    text = source(path).replace("./assets/", asset_base + "assets/")
    # Preserve link/data markers consulted by existing layer guards.
    return match.group(0).replace(href, "data:text/css;base64," + base64.b64encode(text.encode()).decode())


html = source("index.html")
html = re.sub(r'<script([^>]*) src="\./([^"?]+)(?:\?[^" ]*)?"([^>]*)></script>', script, html)
html = re.sub(r'<link rel="stylesheet" href="(\./([^"?]+)(?:\?[^" ]*)?)"[^>]*>', stylesheet, html)
html = html.replace("<head>", f'<head>\n    <base href="{asset_base}" />')
html = html.replace('data-shiopon-base="https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shiopon/"',
                    f'data-shiopon-base="{asset_base}assets/sprites/shiopon/"')
html = re.sub(r"<img(?![^>]*crossorigin)", '<img crossorigin="anonymous"', html)
html = html.replace('rel="preload" as="image"', 'rel="preload" as="image" crossorigin="anonymous"')
html = html.replace("<!doctype html>", f"<!doctype html>\n<!-- DEV ONLY. Runtime source: {sha}. No Production deployment. -->")
metadata = {"source_sha": sha, "files": records, "preview_transforms": [
    "inline_scripts_and_styles", "inline_garden_dev_dependencies", "pin_asset_base",
    "anonymous_image_cors", "preserve_stylesheet_guard_markers"]}
html = html.replace("</head>", '<script type="application/json" id="lumiere-preview-source">' +
                    json.dumps(metadata, ensure_ascii=False) + "</script>\n</head>")
output = root / f"lumiere-dev-{sha[:7]}.html"
output.write_text(html)
print(f"Built {output.name}: {len(html.encode())} bytes, source {sha}")
