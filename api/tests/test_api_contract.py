"""
Contract tests: verify API endpoint shapes match what the frontend expects.
These run against the FastAPI app using TestClient.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch("api.database.get_supabase_client", return_value=None):
        with patch("api.data.seed_default_rules.seed_default_rules"):
            from api.main import app

            yield TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestPipelineRunEndpoint:
    def test_run_returns_run_id(self, client: TestClient):
        with patch("api.main.database.create_run"), patch("threading.Thread") as mock_thread:
            mock_thread.return_value.start.return_value = None
            response = client.post(
                "/api/pipeline/run",
                json={
                    "brief": {"topic": "test topic", "description": "test description"},
                    "engagement_data": None,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data
        assert "status" in data
        assert data["status"] == "started"


class TestMetricsEndpointShape:
    def test_metrics_response_has_required_fields(self, client: TestClient):
        mock_metrics = {
            "run_id": "test-id",
            "total_duration_ms": 90000,
            "actual_duration_ms": 90000,
            "baseline_manual_hours": 8.0,
            "estimated_hours_saved": 7.975,
            "estimated_cost_saved_inr": 11962.5,
            "compliance_iterations": 1,
            "corrections_applied": 0,
            "rules_checked": 12,
            "trend_sources_used": 3,
            "rules_source": "default",
        }
        with patch("api.database.get_pipeline_metrics", return_value=mock_metrics):
            response = client.get("/api/pipeline/test-id/metrics")

        assert response.status_code == 200
        data = response.json()

        required_fields = [
            "run_id",
            "total_duration_ms",
            "actual_duration_ms",
            "actual_duration_display",
            "baseline_manual_hours",
            "estimated_hours_saved",
            "time_saved_display",
            "estimated_cost_saved_inr",
            "cost_saved_display",
            "compliance_iterations",
            "rules_checked",
            "trend_sources_used",
            "brand_rules_used",
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"


class TestStrategyEndpoint:
    def test_strategy_endpoint_returns_engagement_data(self, client: TestClient):
        """The /strategy endpoint returns engagement strategy fields used by frontend."""
        with patch("api.graph.pipeline.get_pipeline") as mock_pipeline:
            mock_state = MagicMock()
            mock_state.values = {
                "engagement_strategy": {
                    "pivot_recommended": True,
                    "performance_ratio": 4.3,
                    "pivot_reason": "video 4.3x better than text",
                    "content_calendar": [{"week": 1, "items": []}],
                },
                "strategy": {"strategy_recommendation": "Pivot to video"},
            }
            mock_pipeline.return_value.get_state.return_value = mock_state

            response = client.get("/api/pipeline/test-id/strategy")

        assert response.status_code == 200
        data = response.json()
        assert "engagement_strategy" in data
        assert "content_calendar" in data
        assert data["pivot_recommended"] is True
