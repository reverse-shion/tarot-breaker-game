"""Export PR #114's exact audited runtime for an isolated static HTTPS preview.

No checkout/runtime edits, network fetches, deployment or main/Pages operations.
Usage: python scripts/build-pr114-safari-preview.py /absolute/new/output/path
"""
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tarfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = "b093e355f8ba409f8a87de0de5c828604d2bf905"
RUNTIME = "b8cd71755f7eafabf7c23fc3c85c779f345ea948"
REMOTE = 'data-shiopon-base="https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shiopon/"'
LOCAL = 'data-shiopon-base="./assets/sprites/shiopon/"'


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def runtime_file(path):
    return path.startswith("assets/") or (
        "/" not in path and pathlib.PurePosixPath(path).suffix in (".html", ".js", ".css")
    )


VERIFY = r'''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PR #114 独立プレビュー — SHA検証</title>
<style>body{font:16px system-ui;background:#101529;color:#eef;max-width:780px;margin:24px auto;padding:16px}a{color:#9cf}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px;font:inherit}</style>
<h1>PR #114 独立プレビュー</h1>
<p>本番とは別の検証環境です。実機結果は未確認。MAIN MERGE GATE: STOP。</p>
<pre id="sha">読み込み中…</pre>
<p><a href="../index.html?dev=star-gate-full&returnDebug=1">星門イベントを起動</a> · <a href="../index.html">通常タイトル</a></p>
<p>配信された全ゲームファイルのSHA-256を照合します。素材を含む約117MBを取得します。Wi-Fiを推奨します。この照合は実機の映像・音響・操作のPASSを意味しません。</p>
<button id="verify" disabled>配信ファイルを照合</button><pre id="result"></pre>
<script>
'use strict';
const expectedSource='b093e355f8ba409f8a87de0de5c828604d2bf905';
const expectedRuntime='b8cd71755f7eafabf7c23fc3c85c779f345ea948';
const status=document.getElementById('result'),button=document.getElementById('verify');
let manifest;
async function load(){
 const r=await fetch('./manifest.json',{cache:'no-store'});
 if(!r.ok)throw new Error('manifest HTTP '+r.status);
 manifest=await r.json();
 if(manifest.source_sha!==expectedSource||manifest.runtime_sha!==expectedRuntime)throw new Error('対象SHA不一致');
 document.getElementById('sha').textContent='監査HEAD: '+manifest.source_sha+'\nRuntime: '+manifest.runtime_sha+'\n配信: 同一オリジン / '+manifest.files.length+' files\nHTML設定変換: Shioponの素材パスのみ';
 button.disabled=false;
}
button.onclick=async()=>{
 button.disabled=true;
 try{
  if(!crypto.subtle)throw new Error('HTTPSで開いてください');
  let count=0;
  for(const item of manifest.files){
   const r=await fetch('../'+item.path,{cache:'no-store'});
   if(!r.ok)throw new Error(item.path+' HTTP '+r.status);
   const bytes=await r.arrayBuffer();
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==item.bytes||hash!==item.deployed_sha256)throw new Error('配信バイト不一致: '+item.path);
   status.textContent=(++count)+' / '+manifest.files.length+' 照合済み';
  }
  status.textContent='配信SHA照合 PASS: '+count+' files\n実機Device Gate: PENDING / MAIN MERGE GATE: STOP';
 }catch(e){status.textContent='配信SHA照合 FAIL: '+e.message;}
 finally{button.disabled=false;}
};
load().catch(e=>{status.textContent='FAIL: '+e.message;});
</script></html>'''


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    output = pathlib.Path(sys.argv[1]).expanduser().resolve()
    if output == ROOT or ROOT in output.parents:
        raise SystemExit("Export outside the checkout; do not place preview output in production source.")
    if output.exists():
        raise SystemExit("Output already exists; supply a new directory.")
    for sha in (SOURCE, RUNTIME):
        if git("rev-parse", f"{sha}^{{commit}}").decode().strip() != sha:
            raise SystemExit("Pinned source commit unavailable.")
    changed = git("diff", "--name-only", RUNTIME, SOURCE).decode().splitlines()
    if any(runtime_file(path) for path in changed):
        raise SystemExit("Audit HEAD runtime differs from recorded runtime SHA.")
    archive = git("archive", "--format=tar", SOURCE)
    records = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for entry in tar:
            if not entry.isfile() or not runtime_file(entry.name):
                continue
            path = pathlib.PurePosixPath(entry.name)
            if path.is_absolute() or ".." in path.parts:
                raise SystemExit("Unsafe archive path.")
            source = tar.extractfile(entry).read()
            deployed = source
            if entry.name == "index.html":
                text = source.decode()
                if text.count(REMOTE) != 1:
                    raise SystemExit("Shiopon preview configuration anchor changed.")
                deployed = text.replace(REMOTE, LOCAL).encode()
            destination = output / entry.name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(deployed)
            records.append({"path": entry.name, "source_sha256": digest(source),
                            "deployed_sha256": digest(deployed), "bytes": len(deployed)})
    if not any(item["path"] == "index.html" for item in records):
        raise SystemExit("Pinned index not exported.")
    meta = output / "__preview__"
    meta.mkdir()
    manifest = {"source_sha": SOURCE, "runtime_sha": RUNTIME, "main_merge_gate": "STOP",
                "device_result": "PENDING", "production": False,
                "transforms": [{"path": "index.html", "type": "shiopon-asset-base",
                                "from": REMOTE, "to": LOCAL}], "files": records}
    (meta / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (meta / "verify.html").write_text(VERIFY)
    # Static-only deployment configuration. Vercel CLI without --prod creates a
    # Preview deployment; no remote Git integration/build/deploy is performed here.
    (output / "vercel.json").write_text(json.dumps({"version": 2, "framework": None,
        "buildCommand": None, "outputDirectory": ".", "headers": [{"source": "/(.*)",
        "headers": [{"key": "Cache-Control", "value": "no-store"},
                    {"key": "X-Tarot-Source-SHA", "value": SOURCE},
                    {"key": "X-Tarot-Runtime-SHA", "value": RUNTIME}]}]}, indent=2) + "\n")
    for item in records:
        data = (output / item["path"]).read_bytes()
        if digest(data) != item["deployed_sha256"]:
            raise SystemExit("Export verification failed.")
    print(json.dumps({"output": str(output), "source_sha": SOURCE, "runtime_sha": RUNTIME,
        "files": len(records), "bytes": sum(item["bytes"] for item in records),
        "runtime_source_changes": 0, "preview_index_transforms": 1,
        "export_integrity": "PASS", "https_deployment": "NOT_PERFORMED", "device": "PENDING"}, indent=2))


if __name__ == "__main__":
    main()
