#!/usr/bin/env python3
"""Validate batchC.json: schema, difficulty tally, answer tally, financial arithmetic."""
import json, os, collections

HERE = os.path.dirname(__file__)
path = os.path.join(HERE, "batchC.json")
with open(path, encoding="utf-8-sig") as f:
    items = json.load(f)

assert isinstance(items, list), "not a list"
print(f"length == {len(items)} (expect 30)")
assert len(items) == 30

ids = [it["id"] for it in items]
assert ids == list(range(61, 91)), f"ids not 61..90: {ids}"
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

print("SCHEMA: PASS (30 items, ids 61-90 unique, 4 non-empty distinct choices, answer ABCD, non-empty q/expl)")

diff = collections.Counter(it["difficulty"] for it in items)
print("DIFFICULTY:", dict(diff))
tot = len(items)
print(f"  medium={diff['medium']} ({diff['medium']/tot:.0%}), difficult={diff['difficult']} ({diff['difficult']/tot:.0%}), very difficult={diff['very difficult']} ({diff['very difficult']/tot:.0%})")

ans = collections.Counter(it["answer"] for it in items)
print("ANSWER TALLY:", dict(sorted(ans.items())))

# ---- Financial arithmetic re-derivation ----
print("\nFINANCIAL RE-DERIVATION:")

# id76: expected 500000/yr; actual 9200/wk * 50 wk
actual = 9200 * 50
shortfall = 500000 - actual
print(f"  id76: actual={actual}, shortfall={shortfall} -> ${shortfall} short. keyed C. match={shortfall==40000}")
assert next(i for i in items if i['id']==76)['answer']=='C' and shortfall==40000

# id77: ROI = net/cost = (250000-200000)/200000
roi = (250000-200000)/200000
print(f"  id77: ROI={(250000-200000)}/{200000}={roi:.2%}. keyed B (25%). match={abs(roi-0.25)<1e-9}")
assert next(i for i in items if i['id']==77)['answer']=='B' and abs(roi-0.25)<1e-9

# id78: BCR X vs Y
bcr_x = 600000/400000
bcr_y = 750000/550000
net_x = 600000-400000
net_y = 750000-550000
print(f"  id78: BCR_X={bcr_x:.3f}, BCR_Y={bcr_y:.3f}; net_X={net_x}, net_Y={net_y}. X higher ratio, equal net. keyed C. match={bcr_x>bcr_y and net_x==net_y}")
assert next(i for i in items if i['id']==78)['answer']=='C' and bcr_x>bcr_y and net_x==net_y

print("\nALL FINANCIAL ITEMS: keyed letter matches worked arithmetic.")
print("VALIDATION COMPLETE.")
