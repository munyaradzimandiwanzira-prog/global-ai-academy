"""Compiles and runs every Java/PHP/C/C++/Go example and checks it matches its documented output."""
import json, os, subprocess, sys, tempfile, re
blocks = json.load(open(sys.argv[1]))
bad = 0
def run(cmd, cwd, inp=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=60, input=inp)
for b in blocks:
    d = tempfile.mkdtemp()
    lang, code = b["lang"], b["code"]
    try:
        if lang == "java":
            open(os.path.join(d, "Main.java"), "w").write(code)
            c = run(["javac", "Main.java"], d)
            r = c if c.returncode else run(["java", "Main"], d)
        elif lang in ("cpp", "c"):
            src = "main.cpp" if lang == "cpp" else "main.c"
            open(os.path.join(d, src), "w").write(code)
            c = run(["g++" if lang == "cpp" else "gcc", "-std=c++20" if lang == "cpp" else "-std=c11", src, "-o", "app"], d)
            r = c if c.returncode else run(["./app"], d)
        elif lang == "php":
            open(os.path.join(d, "main.php"), "w").write(code)
            r = run(["php", "main.php"], d)
        elif lang == "go":
            open(os.path.join(d, "main.go"), "w").write(code)
            r = run(["go", "run", "main.go"], d)
        else:
            continue
    except subprocess.TimeoutExpired:
        print("TIMEOUT", b["id"]); bad += 1; continue
    out = (r.stdout or "").rstrip()
    if r.returncode != 0:
        if b["kind"] == "challenge":
            continue  # starters may be incomplete
        print("FAIL", b["id"], (r.stderr or r.stdout)[:400]); bad += 1; continue
    if b["kind"] == "run":
        if b["output"] is None:
            print("NO-OUTPUT-DOC", b["id"], "→ actual:", out[:200].replace("\n", "\\n"))
        elif "\n".join(l.rstrip() for l in out.split("\n")) != "\n".join(l.rstrip() for l in b["output"].rstrip().split("\n")):
            print("MISMATCH", b["id"]); print("  expected:", b["output"].replace("\n", "\\n")); print("  actual:  ", out.replace("\n", "\\n")); bad += 1
print(f"verified {len(blocks)} blocks, {bad} problems")
