"""
Runs each reference solution against its challenge's tests exactly like the browser harness:
the solution runs first, then the tests run in the same namespace with `output` = captured stdout.
Also confirms the STARTER code fails the tests (so a learner can't pass without doing anything).
Usage: python3 scripts/verify-solutions.py /tmp/py.json
"""
import contextlib, io, json, os, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tests", "solutions"))
from python_solutions import SOLUTIONS  # noqa: E402

blocks = {b["id"]: b for b in json.load(open(sys.argv[1])) if b["kind"] == "challenge"}
os.chdir(tempfile.mkdtemp())


def attempt(code, block):
    ns = {"__name__": "__main__"}
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(code, "main.py", "exec"), ns)
    except Exception as e:  # noqa: BLE001
        return False, f"code raised {type(e).__name__}: {e}"
    if block.get("tests"):
        ns["output"] = buf.getvalue()
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(block["tests"], "tests.py", "exec"), ns)
            return True, ""
        except AssertionError as e:
            return False, f"assertion: {e}"
        except Exception as e:  # noqa: BLE001
            return False, f"tests raised {type(e).__name__}: {e}"
    expected = "\n".join(l.rstrip() for l in (block.get("expected") or block.get("output") or "").strip().split("\n"))
    actual = "\n".join(l.rstrip() for l in buf.getvalue().strip().split("\n"))
    return actual == expected, f"output {actual!r} != {expected!r}"


problems = 0
for cid, block in blocks.items():
    if cid not in SOLUTIONS:
        print("NO SOLUTION:", cid)
        problems += 1
        continue
    ok, why = attempt(SOLUTIONS[cid], block)
    starter_ok, _ = attempt(block["code"], block)
    if not ok:
        print("SOLUTION FAILS:", cid, "→", why)
        problems += 1
    if starter_ok:
        print("STARTER ALREADY PASSES:", cid)
        problems += 1
print(f"checked {len(blocks)} python challenges, {problems} problems")
sys.exit(1 if problems else 0)
