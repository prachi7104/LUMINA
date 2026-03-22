"""Database helpers for Supabase persistence operations."""

from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from api.config import settings

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a cached Supabase client instance."""
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


def write_pipeline_outputs(run_id: str, outputs: dict[str, Any]) -> None:
    """Persist channel-specific pipeline outputs for a run."""
    if not run_id:
        raise ValueError("run_id is required to write pipeline outputs")

    payload = {"run_id": run_id, **outputs}
    get_supabase_client().table("pipeline_outputs").upsert(
        payload,
        on_conflict="run_id",
    ).execute()


def write_audit_log(run_id: str, audit_log: list[dict[str, Any]]) -> None:
    """Persist full audit log for a run."""
    if not run_id:
        raise ValueError("run_id is required to write audit log")

    payload = {"run_id": run_id, "audit_log": audit_log}
    get_supabase_client().table("pipeline_audit_logs").upsert(
        payload,
        on_conflict="run_id",
    ).execute()


def update_run_status(run_id: str, status: str) -> None:
    """Persist the latest pipeline status for a run."""
    if not run_id:
        raise ValueError("run_id is required to update pipeline status")

    payload = {"run_id": run_id, "pipeline_status": status}
    get_supabase_client().table("pipeline_runs").upsert(
        payload,
        on_conflict="run_id",
    ).execute()
