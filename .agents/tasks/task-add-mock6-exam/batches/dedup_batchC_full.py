#!/usr/bin/env python3
"""Full dedup for batch C: corpus = 1650 existing stems + Batch A + Batch B stems.
Checks batch C for exact/near-dup vs corpus, identical option sets, and internal dups."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import dedup_corpus as dc

HERE = os.path.dirname(__file__)

corpus = dc.build_corpus()
print(f"Existing corpus: {len(corpus)} stems")

# extend with batch A and B stems
for bf in ("batchA.json", "batchB.json"):
    batch = dc.load_json_bom_aware(os.path.join(HERE, bf))
    for q in batch:
        stem = q.get("question", "")
        corpus.append({
            "set": bf.replace(".json", ""),
            "id": q.get("id"),
            "stem": stem,
            "norm": dc.normalize(stem),
            "tokens": dc.tokens(stem),
            "opts": {dc.normalize(v) for v in (q.get("choices") or {}).values()},
        })
print(f"Corpus + A + B: {len(corpus)} stems")

batchC = dc.load_json_bom_aware(os.path.join(HERE, "batchC.json"))
print(f"Batch C: {len(batchC)} items")

issues = dc.check_batch(batchC, corpus)
if issues:
    for i in issues:
        print("  " + i)
    print(f"\nFAIL: {len(issues)} issue(s).")
    sys.exit(1)
print("  0 duplicates vs (existing 1650 + Batch A + Batch B) + 0 internal. PASS")

# supplementary: report max jaccard for visibility
maxj = 0.0; where = None
for item in batchC:
    tk = dc.tokens(item.get("question",""))
    for c in corpus:
        j = dc.jaccard(tk, c["tokens"])
        if j > maxj:
            maxj = j; where = (item["id"], c["set"], c["id"])
print(f"  max jaccard = {maxj:.2f} (batchC id {where[0]} ~ {where[1]} id {where[2]})")
