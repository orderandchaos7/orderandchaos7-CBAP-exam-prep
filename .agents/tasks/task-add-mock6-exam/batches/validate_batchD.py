#!/usr/bin/env python3
"""Validate batchD.json: schema, difficulty tally, answer tally; plus compiled A-D tally."""
import json, os, collections

HERE = os.path.dirname(__file__)
path = os.path.join(HERE, "batchD.json")
with open(path, encoding="utf-8-sig") as f:
    items = json.load(f)

assert isinstance(items, list), "not a list"
print(f"length == {len(items)} (expect 30)")
assert len(items) == 30

ids = [it["id"] for it in items]
assert ids == list(range(91, 121)), f"ids not 91..120: {ids}"
assert len(set(ids)) == 30

for it in items:
    for k in ("answer", "choices", "explanation", "id", "question"):
        assert k in it, f"id {it['id']} missing {k}"
    ch = it["choices"]
    assert set(ch.keys()) == {"A", "B", "C", "D"}, f"id {it['id']} choice keys {set(ch.keys())}"
    for L in "ABCD":
        assert ch[L].strip(), f"id {it['id']} empty choice {L}"
    vals = [v.strip() for v in ch.values()]
    assert len(set(vals)) == 4, f"id {it['id']} duplicate choices"
    assert it["answer"] in {"A", "B", "C", "D"}, f"id {it['id']} bad answer"
    assert it["question"].strip(), f"id {it['id']} empty question"
    assert it["explanation"].strip(), f"id {it['id']} empty explanation"

print("SCHEMA: PASS (30 items, ids 91-120 unique, 4 non-empty distinct choices, answer ABCD, non-empty q/expl)")

diff = collections.Counter(it["difficulty"] for it in items)
tot = len(items)
print("DIFFICULTY:", dict(diff))
print(f"  medium={diff['medium']} ({diff['medium']/tot:.0%}), difficult={diff['difficult']} ({diff['difficult']/tot:.0%}), very difficult={diff['very difficult']} ({diff['very difficult']/tot:.0%})")

ansD = collections.Counter(it["answer"] for it in items)
print("BATCH D ANSWER TALLY:", dict(sorted(ansD.items())))

# compiled A-D tally
compiled = collections.Counter()
for bf in ("batchA.json", "batchB.json", "batchC.json", "batchD.json"):
    with open(os.path.join(HERE, bf), encoding="utf-8-sig") as f:
        for it in json.load(f):
            compiled[it["answer"]] += 1
print("COMPILED A-D ANSWER TALLY (120 items):", dict(sorted(compiled.items())))
print("VALIDATION COMPLETE.")
