"""Re-encode owner-reuploaded Lumiere poses from exact Asset Studio Git blobs.
Main is never modified; the four source PRs are not merged.
"""
from PIL import Image
import hashlib, io, json, pathlib, subprocess, numpy as np
from scipy.ndimage import label

ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/"assets/sprites/lumiere"
REPORT=ROOT/"docs/lumiere-reupload-20261010"
REPORT.mkdir(parents=True, exist_ok=True)
# Source refs captured 2026-10-10 from the last owner reuploads.
SOURCES=[
 ("down","lumiere_idle.webp","4a47918fc54c796f29627e08df711bea73d07a72","2e5f2e81e58c3ce5558b1047128605e427dd12b3",.9616055846422339,26.60408809564194,37.03664921465969),
 ("up","lumiere_hover-back.webp","ef5e3b7aa98f97378771294042faaf13b7accaff","dbe5c51f7950fa525ddaf6b62bdf6ec5d301eb55",.971375807940905,21.60858915026074,31.259464450600184),
 ("left","lumiere_hover_left.webp","8ae0e8cd06fde76c954ad9c3d323b2212fae8a7c","77bba1638863703c999c52482b777d810e1f2f36",.9886148007590133,12.355517031032434,38.705882352941174),
 ("right","lumiere_hover_right.webp","d1b9603cab503c181f28fd42abb538ee286dfe2b","31aff26e8e94a72a079d608864af65bec84c0993",.9963536918869644,-32.09010575038019,3.2114858705560607),
]
manifest_path=DEST/"lumiere_sprite_manifest.json"
manifest=json.loads(manifest_path.read_text())
before_manifest=json.loads(manifest_path.read_text())
records=[]
for direction, filename, commit, blob, scale, tx, ty in SOURCES:
    path=f"assets/sprites/lumiere/{filename}"
    data=subprocess.check_output(["git","show",f"{commit}:{path}"],cwd=ROOT)
    actual=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
    if actual!=blob: raise RuntimeError(f"STOP: uploaded input SHA changed for {filename}")
    original=Image.open(io.BytesIO(data))
    original.load()
    if original.format!="PNG" or original.mode!="RGBA" or original.size!=(1254,1254):
        raise RuntimeError(f"STOP: unexpected source format/dimensions for {filename}: {original.format} {original.mode} {original.size}")
    transform=(1/scale,0,-tx/scale,0,1/scale,-ty/scale)
    rendered=original.transform((1254,1254),Image.Transform.AFFINE,transform,Image.Resampling.BICUBIC)
    pixels=np.array(rendered)
    components,_=label(pixels[:,:,3]>0,np.ones((3,3)))
    sizes=np.bincount(components.ravel())
    removed=0
    for component in np.where((sizes>0)&(sizes<=10))[0]:
        if component==0: continue
        selected=components==component
        if pixels[:,:,3][selected].max()<=2:
            removed+=int(selected.sum())
            pixels[selected]=0
    output=Image.fromarray(pixels,mode="RGBA")
    output.save(DEST/filename,format="WEBP",lossless=True,exact=True,method=6)
    encoded=(DEST/filename).read_bytes()
    if encoded[:4]!=b"RIFF" or encoded[8:12]!=b"WEBP":
        raise RuntimeError("STOP: wrong WebP container")
    decoded=Image.open(io.BytesIO(encoded)).convert("RGBA")
    if decoded.tobytes()!=output.tobytes():
        raise RuntimeError("STOP: lossless conversion changed RGBA")
    pose=manifest["poses"][direction]
    pose["sha256"]=hashlib.sha256(encoded).hexdigest()
    pose["source_sha256"]=hashlib.sha256(data).hexdigest()
    pose["decoded_rgba_sha256"]=hashlib.sha256(decoded.tobytes()).hexdigest()
    records.append({"direction":direction,"file":filename,"source_commit":commit,"source_blob":blob,"upload_detected_as":"PNG RGBA, despite .webp filename","input_sha256":hashlib.sha256(data).hexdigest(),"output_sha256":pose["sha256"],"output_git_blob_sha":hashlib.sha1(b"blob "+str(len(encoded)).encode()+b"\0"+encoded).hexdigest(),"scale":scale,"translate":[tx,ty],"tiny_isolated_interpolation_alpha_pixels_removed":removed,"roundtrip_exact":True})
manifest["provenance"]={"main":"aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac","policy":"Latest owner Asset Studio reuploads only. Uniform image-side registration with same coefficients as documented PR135. RGBA-exact lossless WebP; no character rerender. Verify iPhone before main merge.","sources":{x["direction"]:{"commit":x["source_commit"],"blob":x["source_blob"]} for x in records}}
# Preserve all pre-existing game behavior and fixed manifest fields other than hashes/provenance.
for key in ["character","format","layout","movement_type","phase","files","render","localized_sway","notes"]:
    if manifest[key]!=before_manifest[key]: raise RuntimeError(f"STOP: game contract changed {key}")
for direction in ("down","up","left","right"):
    for key in ["width","height","body_top","baseline_y","center_x","actual_direction"]:
        if manifest["poses"][direction][key]!=before_manifest["poses"][direction][key]:
            raise RuntimeError(f"STOP: anchor changed {direction}.{key}")
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
(REPORT/"source-and-conversion.json").write_text(json.dumps(records,indent=2)+"\n")
print("Four newest owner-uploaded PNGs re-encoded and registered as true RGBA lossless WebP; main untouched.")
