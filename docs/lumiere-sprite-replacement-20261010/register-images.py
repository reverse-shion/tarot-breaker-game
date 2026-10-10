"""Reproduce only the authorized Lumiere image registration (Pillow 12.3.0).

Run from the repository root with the four source Git objects available.
No source branch is merged or cherry-picked. No artwork is generated.
"""
import hashlib
import io
import json
import pathlib
import subprocess
from PIL import Image
import numpy as np
from scipy.ndimage import label

ROOT = pathlib.Path(__file__).resolve().parents[2]
DEST = ROOT / "assets/sprites/lumiere"
SOURCES = [
    ("down", "lumiere_idle.webp", "925cf3a297874b15384fec86a2bdc8c38c536318", "99579abeca9a2673b5785902f6fea27985d7b8e9", .9616055846422339, 26.60408809564194, 37.03664921465969, [(663, 992)]),
    ("up", "lumiere_hover-back.webp", "f980b92706da9361f25e0195083f768b941ffcb8", "d052a34cab6179e5dbb9dd5273cb5dc0190d0395", .971375807940905, 21.60858915026074, 31.259464450600184, [(729, 77), (729, 78)]),
    ("left", "lumiere_hover_left.webp", "ab3fc22d8128ff28432871f3a2fa00887bb88e21", "378a91e0dbaa10b5226442f78fee0c0d6ead2b1c", .9886148007590133, 12.355517031032434, 38.705882352941174, []),
    ("right", "lumiere_hover_right.webp", "559eba6d64b0fffb3cb0d7e28938bf0f62389ee3", "7e83bd65bdb13405d0ba226db9a92a05ecc3a41d", .9963536918869644, -32.09010575038019, 3.2114858705560607, [(302, 1005)]),
]
manifest = json.loads((DEST / "lumiere_sprite_manifest.json").read_text())
records = []
for direction, filename, commit, blob, scale, tx, ty, isolated in SOURCES:
    path = "assets/sprites/lumiere/" + filename
    data = subprocess.check_output(["git", "show", commit + ":" + path], cwd=ROOT)
    actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if actual != blob:
        raise ValueError("STOP: source Git Blob mismatch for " + filename)
    source = Image.open(io.BytesIO(data))
    source.load()
    if source.mode != "RGBA" or source.size != (1254, 1254):
        raise ValueError("STOP: unexpected source format/dimensions")
    original_rgba = hashlib.sha256(source.tobytes()).hexdigest()
    # Exactly four documented disconnected, low-alpha source speckles;
    # no hair, decoration, wing or clothing edge is selected for cleanup.
    for x, y in isolated:
        if not 0 < source.getpixel((x, y))[3] <= 69:
            raise ValueError("STOP: isolated source artifact changed")
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dx or dy) and (x+dx, y+dy) not in isolated and source.getpixel((x+dx, y+dy))[3]:
                    raise ValueError("STOP: cleanup pixel is attached to artwork")
    for x, y in isolated:
        source.putpixel((x, y), (0, 0, 0, 0))
    # RGBA affine sampling internally uses premultiplied alpha in Pillow.
    # One uniform scale and translation preserves anatomical proportions.
    inverse = (1/scale, 0, -tx/scale, 0, 1/scale, -ty/scale)
    output = source.transform((1254, 1254), Image.Transform.AFFINE, inverse,
                              Image.Resampling.BICUBIC)
    # Bicubic filtering can leave disconnected 1/255 or 2/255 alpha lobes.
    # Remove only tiny isolated lobes, never any component attached to art.
    pixels = np.array(output)
    components, count = label(pixels[:, :, 3] > 0, np.ones((3, 3)))
    sizes = np.bincount(components.ravel())
    interpolation_speckles = []
    for component in np.where((sizes > 0) & (sizes <= 10))[0]:
        if component == 0:
            continue
        selected = components == component
        if pixels[:, :, 3][selected].max() <= 2:
            ys, xs = np.where(selected)
            interpolation_speckles.extend([[int(x), int(y)] for x, y in zip(xs, ys)])
            pixels[selected] = 0
    output = Image.fromarray(pixels)
    output.save(DEST / filename, format="WEBP", lossless=True, exact=True, method=6)
    decoded = Image.open(DEST / filename).convert("RGBA")
    if output.tobytes() != decoded.tobytes():
        raise ValueError("STOP: WebP encoding changed registered RGBA")
    encoded = (DEST / filename).read_bytes()
    pose = manifest["poses"][direction]
    pose.update(sha256=hashlib.sha256(encoded).hexdigest(),
                source_sha256=hashlib.sha256(data).hexdigest(),
                decoded_rgba_sha256=hashlib.sha256(decoded.tobytes()).hexdigest())
    records.append(dict(direction=direction, file=filename, source_commit=commit,
                        source_blob_sha=blob, source_format="RGBA PNG (uploaded with .webp extension)",
                        output_blob_sha=hashlib.sha1(b"blob " + str(len(encoded)).encode() + b"\0" + encoded).hexdigest(),
                        source_sha256=pose["source_sha256"], source_decoded_rgba_sha256=original_rgba,
                        uniform_scale=scale, translate_x=tx, translate_y=ty,
                        removed_isolated_source_pixels=isolated,
                        removed_isolated_interpolation_pixels=interpolation_speckles,
                        sha256=pose["sha256"], decoded_rgba_sha256=pose["decoded_rgba_sha256"],
                        webp_roundtrip_rgba_identical=True))
manifest["provenance"] = {
    "main": "aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac",
    "policy": "Only the four specified Git Blob inputs. Uniform image-side registration to existing anatomical landmarks, four isolated low-alpha source speckles and tiny disconnected interpolation lobes (alpha at most 2/255) removed, then RGBA-exact lossless WebP encoding. source_sha256 hashes uploaded PNG bytes; sha256 hashes deployed WebP bytes; decoded_rgba_sha256 hashes deployed row-major RGBA bytes. Full processing ledger in docs/lumiere-sprite-replacement-20261010/registration.json.",
    "sources": {r["direction"]: {k: r[k] for k in ["source_commit", "source_blob_sha", "source_decoded_rgba_sha256", "uniform_scale", "translate_x", "translate_y", "removed_isolated_source_pixels"]} for r in records},
}
manifest["notes"][1] = "PR122 anchors and 63.984375px body reference retained. Registered crown/foot/face landmarks are documented in docs/lumiere-sprite-replacement-20261010; iPhone device validation pending."
(DEST / "lumiere_sprite_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(pathlib.Path(__file__).parent / "registration.json").write_text(json.dumps(records, indent=2) + "\n")
print("Four registered RGBA-exact lossless WebPs; render, anchors and source file mapping unchanged.")
