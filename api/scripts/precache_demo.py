import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
DEMO_SESSION_ID = "demo-session-hackathon-2026"
ROOT_DIR = Path(__file__).resolve().parents[2]
PDF_PATH = ROOT_DIR / "api" / "tests" / "fixtures" / "ET_Mock_Brand_Guide.pdf"
CACHE_PATH = ROOT_DIR / "api" / "scripts" / "demo_cache.json"

SCENARIOS: list[dict[str, Any]] = [
    {
        "name": "Product launch sprint",
        "brief": {
            "topic": "ET Money App Launch",
            "description": "ET Money launches an AI-powered mutual fund app with zero-commission SIP. Target: retail investors 25-40.",
            "session_id": DEMO_SESSION_ID,
            "content_category": "mutual_fund",
        },
    },
    {
        "name": "Compliance violation",
        "brief": {
            "topic": "High-Yield Investment Opportunity",
            "description": "New scheme offers guaranteed 18% annual returns with zero risk of principal loss.",
            "session_id": DEMO_SESSION_ID,
            "content_category": "mutual_fund",
        },
    },
    {
        "name": "Performance pivot with engagement data",
        "brief": {
            "topic": "Content Strategy Review",
            "description": "Monthly content planning brief for ET Markets audience.",
            "session_id": DEMO_SESSION_ID,
            "content_category": "general",
        },
        "engagement_data": {
            "video": {"avg_views": 4200, "engagement_rate": 0.082},
            "text_article": {"avg_views": 980, "engagement_rate": 0.019},
        },
    },
]


def upload_brand_guide() -> int:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"Brand guide PDF not found at: {PDF_PATH}")

    with PDF_PATH.open("rb") as f:
        response = requests.post(
            f"{BASE_URL}/api/upload-guide",
            files={"file": ("ET_Mock_Brand_Guide.pdf", f, "application/pdf")},
            data={"session_id": DEMO_SESSION_ID},
            timeout=60,
        )

    response.raise_for_status()
    payload = response.json()
    rules_extracted = int(payload.get("rules_extracted", 0))
    print(f"Brand guide uploaded: {rules_extracted} rules extracted")
    return rules_extracted


def start_scenario(index: int, scenario: dict[str, Any]) -> str:
    body: dict[str, Any] = {"brief": scenario["brief"]}
    if "engagement_data" in scenario:
        body["engagement_data"] = scenario["engagement_data"]

    response = requests.post(f"{BASE_URL}/api/pipeline/run", json=body, timeout=30)
    response.raise_for_status()
    run_id = str(response.json()["run_id"])
    print(f"Scenario {index} started: run_id = {run_id}")
    return run_id


def extract_status(payload: Any) -> str:
    if not isinstance(payload, dict):
        return "unknown"

    for key in ("status", "pipeline_status", "run_status"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value

    nested = payload.get("run")
    if isinstance(nested, dict):
        for key in ("status", "pipeline_status"):
            value = nested.get(key)
            if isinstance(value, str) and value.strip():
                return value

    return "unknown"


def wait_for_completion(run_id: str) -> str:
    while True:
        response = requests.get(f"{BASE_URL}/api/pipeline/{run_id}/status", timeout=30)

        if response.status_code == 404:
            raise RuntimeError(
                "Status endpoint returned 404. Ensure /api/pipeline/{id}/status exists before precaching."
            )

        response.raise_for_status()
        payload = response.json()
        status = extract_status(payload)
        print(f"run_id={run_id} status={status}")

        if status in {"awaiting_approval", "completed"}:
            return run_id

        if status in {"failed", "error", "rejected"}:
            raise RuntimeError(f"Pipeline run failed for run_id={run_id} with status={status}")

        time.sleep(3)


def save_cache(rules_extracted: int, run_ids: list[str]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "session_id": DEMO_SESSION_ID,
        "rules_extracted": rules_extracted,
        "scenario_1_run_id": run_ids[0],
        "scenario_2_run_id": run_ids[1],
        "scenario_3_run_id": run_ids[2],
        "cached_at": datetime.now().isoformat(),
    }
    CACHE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> None:
    rules_extracted = upload_brand_guide()

    run_ids: list[str] = []
    for index, scenario in enumerate(SCENARIOS, start=1):
        run_id = start_scenario(index, scenario)
        completed_run_id = wait_for_completion(run_id)
        run_ids.append(completed_run_id)

        if index < len(SCENARIOS):
            time.sleep(5)

    save_cache(rules_extracted, run_ids)

    id1, id2, id3 = run_ids
    print(
        "All scenarios cached. Copy these run_ids to your demo notes:\n"
        f" Scenario 1 (product launch):  {id1}\n"
        f" Scenario 2 (compliance):      {id2}\n"
        f" Scenario 3 (pivot):           {id3}"
    )


if __name__ == "__main__":
    main()
