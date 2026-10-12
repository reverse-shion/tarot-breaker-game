"""Make a small upload package; Vercel builds the fixed-SHA static export.

Avoids uploading the 117 MiB game sources through the Hobby CLI 100 MB limit.
No deployment or changes to game/main/Pages are performed.
Usage: python scripts/build-pr114-vercel-bootstrap.py /absolute/new/output/path
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = "b093e355f8ba409f8a87de0de5c828604d2bf905"
RUNTIME = "b8cd71755f7eafabf7c23fc3c85c779f345ea948"


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    output = pathlib.Path(sys.argv[1]).expanduser().resolve()
    if output == ROOT or ROOT in output.parents or output.exists():
        raise SystemExit("Supply a new output directory outside the checkout.")
    exporter = (ROOT / "scripts/build-pr114-safari-preview.py").read_bytes()
    exporter_hash = hashlib.sha256(exporter).hexdigest()
    output.mkdir(parents=True)
    (output / "exporter.py").write_bytes(exporter)
    # All executable build code is bundled in this upload. Git fetches only the
    # two object IDs, never a moving branch. The source worktree stays in /tmp;
    # export/public is ignored by the CLI if this bootstrap was tested locally.
    build = f'''#!/usr/bin/env bash
set -euo pipefail
task_package_dir="$(pwd)"
task_repo_dir="$(mktemp -d /tmp/tarot-pr114-source.XXXXXX)"
trap 'rm -rf "$task_repo_dir"' EXIT
test ! -e "$task_package_dir/public"
printf '%s  %s\\n' '{exporter_hash}' "$task_package_dir/exporter.py" | sha256sum --check --status
git init --quiet "$task_repo_dir"
git -C "$task_repo_dir" remote add origin https://github.com/reverse-shion/tarot-breaker-game.git
GIT_TERMINAL_PROMPT=0 git -C "$task_repo_dir" fetch --no-tags --depth=1 origin {SOURCE} {RUNTIME}
mkdir -p "$task_repo_dir/scripts"
cp "$task_package_dir/exporter.py" "$task_repo_dir/scripts/build-pr114-safari-preview.py"
python3 "$task_repo_dir/scripts/build-pr114-safari-preview.py" "$task_package_dir/public"
'''
    (output / "build-preview.sh").write_text(build)
    (output / "vercel.json").write_text(json.dumps({"version": 2, "framework": None,
        "buildCommand": "bash build-preview.sh", "outputDirectory": "public",
        "headers": [{"source": "/(.*)", "headers": [
            {"key": "Cache-Control", "value": "no-store"},
            {"key": "X-Tarot-Source-SHA", "value": SOURCE},
            {"key": "X-Tarot-Runtime-SHA", "value": RUNTIME}]}]}, indent=2) + "\n")
    (output / ".vercelignore").write_text("public/\n.git/\n")
    total = sum(p.stat().st_size for p in output.iterdir() if p.is_file())
    print(json.dumps({"output": str(output), "upload_bytes": total,
                      "exporter_sha256": exporter_hash, "source_sha": SOURCE,
                      "runtime_sha": RUNTIME, "deployment": "NOT_PERFORMED"}, indent=2))


if __name__ == "__main__":
    main()
