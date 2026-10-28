"""Executes every Python example and challenge starter the way the browser harness does."""
import json, sys, io, traceback, contextlib, os, tempfile
items = json.load(open(sys.argv[1]))
# Examples that demonstrate an error on purpose.
EXPECTED_ERRORS = {"python:syntax:run2"}
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
        if err and it["id"] not in EXPECTED_ERRORS: print("RUN-ERROR", it["id"], err); bad += 1
        elif it.get("output") is not None:
            norm = lambda s: "\n".join(l.rstrip() for l in s.strip().split("\n"))
            if norm(buf.getvalue()) != norm(it["output"]):
                print("OUTPUT-MISMATCH", it["id"], "\n--- expected\n" + norm(it["output"]) + "\n--- actual\n" + norm(buf.getvalue())); bad += 1
        continue
    # challenge: starter must compile and tests must compile
    try:
        compile(it["tests"] or "", "tests.py", "exec")
    except SyntaxError as e:
        print("TEST-SYNTAX", it["id"], e); bad += 1
    if err and "pass" not in it["code"]:
        print("STARTER-ERROR", it["id"], err)
print(f"checked {len(items)} python blocks, {bad} problems")
sys.exit(1 if bad else 0)
