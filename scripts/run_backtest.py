from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signalos.backtest.harness import midnight_hammer_replay, run_loo_cv


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--loo", action="store_true")
    args = parser.parse_args()
    payload = run_loo_cv() if args.loo else midnight_hammer_replay()
    print(json.dumps(payload, indent=2))
