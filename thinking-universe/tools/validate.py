#!/usr/bin/env python3
"""Thinking Unit validator — Tushar Thinking Universe.

Checks every worlds/**.md unit against thinking-unit.schema.json.
Resolves body-backed fields from '## ' headings. Prints a report and exits non-zero
on violations, so it can gate a build or a commit hook.

Usage:
    python3 tools/validate.py            # validate all units
    python3 tools/validate.py --strict   # also fail on NEEDS_AUTHOR_INPUT
Requires: pip install pyyaml jsonschema
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "thinking-unit.schema.json"
UNIT_GLOB = "worlds/**/*.md"
INDEX_NAMES = {"INDEX.md"}

BODY_HEADINGS = {
    "deep_article": (r"^##\s+(Deep Article|বিস্তারিত)\s*$",),
    "linkedin_caption": (r"^##\s+(LinkedIn Caption)\s*$",),
    "real_life_example": (r"^##\s+(Real-life Example|Real World Example)\s*$",),
    "business_example": (r"^##\s+(Business Application|Business Example)\s*$",),
}


def load():
    try:
        import yaml  # type: ignore
    except ImportError:
        sys.exit("pyyaml required: pip install pyyaml")
    return yaml


def parse(text: str):
    m = re.match(r"^---\n(.*?\n)---\n?(.*)$", text, re.S)
    if not m:
        return None, text
    return m.group(1), m.group(2)


def body_has(body: str, key: str) -> bool:
    for pat in BODY_HEADINGS.get(key, ()):
        for line in body.splitlines():
            if re.match(pat, line.strip()):
                return True
    return False


def main() -> int:
    yaml = load()
    import json

    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    required, allowed = set(schema["required"]), set(schema["properties"])
    min_visuals = schema["properties"]["visual_concepts"].get("minItems", 4)
    max_tags = schema["properties"]["hashtags"].get("maxItems", 5)
    strict = "--strict" in sys.argv
    files = [f for f in sorted(ROOT.glob(UNIT_GLOB)) if f.name not in INDEX_NAMES]

    if not files:
        print("no units found")
        return 1

    problems = 0
    for f in files:
        errs: list[str] = []
        raw = f.read_text(encoding="utf-8")
        fm_raw, body = parse(raw)
        if fm_raw is None:
            errs.append("missing YAML front matter")
            data = {}
        else:
            data = yaml.safe_load(fm_raw) or {}
            extra = set(data) - allowed
            if extra:
                errs.append(f"unknown keys: {sorted(extra)}")
        for key in sorted(required):
            if key not in data or data.get(key) in (None, "", []):
                errs.append(f"missing required: {key}")
        for key in BODY_HEADINGS:
            if not data.get(key) and not body_has(body, key):
                errs.append(f"missing body field: {key}")
        vc = data.get("visual_concepts") or []
        if len(vc) < min_visuals:
            errs.append(f"visual_concepts {len(vc)} < {min_visuals}")
        for i, v in enumerate(vc, 1):
            for need in ("purpose", "prompt"):
                if not (v or {}).get(need):
                    errs.append(f"visual_concepts[{i}].{need} empty")
        tags = data.get("hashtags") or []
        if not 3 <= len(tags) <= max_tags:
            errs.append(f"hashtags {len(tags)} (must be 3-{max_tags})")
        art = body or ""
        if len(art.split()) < 400:
            errs.append(f"article too thin ({len(art.split())} words in body)")
        if "related_concepts" not in data:
            errs.append("no cross-links (related_concepts)")
        if str(data.get("status")) not in {"approved", "published"}:
            errs.append(f"status={data.get('status')} (not approved)")
        gaps = re.findall(r"NEEDS_AUTHOR_INPUT", raw)
        if gaps and not strict:
            print(f"note {f.relative_to(ROOT)}: {len(gaps)}x NEEDS_AUTHOR_INPUT")
        if gaps and strict:
            errs.append(f"{len(gaps)}x NEEDS_AUTHOR_INPUT")
        rel = f.relative_to(ROOT)
        if errs:
            problems += len(errs)
            print(f"FAIL {rel}")
            for e in errs:
                print(f"      - {e}")
        else:
            print(f"ok   {rel}")

    print(f"\n{len(files)} unit(s), {problems} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
