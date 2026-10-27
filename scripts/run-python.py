"""Executes every Python example and challenge starter the way the browser harness does."""
import json, sys, io, traceback, contextlib, os, tempfile
items = json.load(open(sys.argv[1]))
os.chdir(tempfile.mkdtemp())
bad = 0
for it in items:
    ns = {"__name__": "__main__", "input": lambda p="": "Tendai"}
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(it["code"], "main.py", "exec"), ns)
        err = None
    except ModuleNotFoundError as e:
        err = None if it["kind"] == "run" else repr(e)
        if err is None: print("  (skipped, needs package)", it["id"], e)
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
    if it["kind"] == "run":
        if err: print("RUN-ERROR", it["id"], err); bad += 1
        continue
    # challenge: starter must compile and tests must compile
    try:
        compile(it["tests"] or "", "tests.py", "exec")
    except SyntaxError as e:
        print("TEST-SYNTAX", it["id"], e); bad += 1
    if err and "pass" not in it["code"]:
        print("STARTER-ERROR", it["id"], err)
print(f"checked {len(items)} python blocks, {bad} problems")
