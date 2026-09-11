#!/usr/bin/env python3
"""Dedup corpus builder for Mock Exam 6 batch authoring.

Reusable across batches A-D. Builds a normalized corpus of all existing
question stems from js/data/questions.json (BOM-aware) and checks a batch
file (JSON array of question objects) for:
  - exact/near-duplicate stems vs the existing corpus,
  - high token-overlap vs existing stems (Jaccard),
  - identical option phrasing vs existing questions,
  - internal duplicates within the batch.

Usage:
    python3 dedup_corpus.py <batch.json> [<batch.json> ...]
Returns non-zero exit code if any duplicate/near-dup is found.
"""
import json
import re
import sys
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
QUESTIONS = os.path.join(REPO_ROOT, "js", "data", "questions.json")

# Jaccard token-overlap threshold above which two stems are flagged as near-dupes
JACCARD_NEAR_DUP = 0.75


def normalize(text):
    """Lowercase, strip punctuation, collapse whitespace."""
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokens(text):
    return set(normalize(text).split())


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def load_json_bom_aware(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def build_corpus():
    """Return list of dicts describing every existing question."""
    data = load_json_bom_aware(QUESTIONS)
    corpus = []
    for s in data:
        for q in s.get("questions", []):
            stem = q.get("question", "")
            corpus.append({
                "set": s.get("categoryId"),
                "id": q.get("id"),
                "stem": stem,
                "norm": normalize(stem),
                "tokens": tokens(stem),
                "opts": {normalize(v) for v in (q.get("choices") or {}).values()},
            })
    return corpus


def check_batch(batch_items, corpus):
    issues = []
    existing_norms = {c["norm"] for c in corpus}

    # internal duplicates
    seen = {}
    for item in batch_items:
        n = normalize(item.get("question", ""))
        if n in seen:
            issues.append(f"INTERNAL DUP: batch id {item.get('id')} stem matches batch id {seen[n]}")
        else:
            seen[n] = item.get("id")

    # vs existing corpus
    for item in batch_items:
        stem = item.get("question", "")
        n = normalize(stem)
        tk = tokens(stem)
        opts = {normalize(v) for v in (item.get("choices") or {}).values()}
        if n in existing_norms:
            issues.append(f"EXACT DUP: batch id {item.get('id')} matches an existing stem")
        for c in corpus:
            jac = jaccard(tk, c["tokens"])
            if jac >= JACCARD_NEAR_DUP:
                issues.append(
                    f"NEAR DUP (jaccard={jac:.2f}): batch id {item.get('id')} ~ {c['set']} id {c['id']}"
                )
            # identical full option set phrasing
            if opts and opts == c["opts"]:
                issues.append(
                    f"IDENTICAL OPTIONS: batch id {item.get('id')} options == {c['set']} id {c['id']}"
                )
    return issues


def main(argv):
    corpus = build_corpus()
    print(f"Corpus built: {len(corpus)} existing question stems from {QUESTIONS}")
    total_issues = 0
    for path in argv[1:]:
        batch = load_json_bom_aware(path)
        print(f"\nChecking {path}: {len(batch)} items")
        issues = check_batch(batch, corpus)
        if issues:
            total_issues += len(issues)
            for i in issues:
                print("  " + i)
        else:
            print("  0 duplicates (external + internal). PASS")
    if total_issues:
        print(f"\nFAIL: {total_issues} issue(s) found.")
        return 1
    print("\nALL CLEAN: 0 duplicates across all batches checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
