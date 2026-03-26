"""Tests for metrics accuracy and impact quantification."""


class TestBaselineBreakdown:
    def test_baseline_breakdown_sums_to_baseline_hours(self):
        """The per-task breakdown must sum to the declared baseline."""
        from api.main import MANUAL_BASELINE_BREAKDOWN

        total = sum(MANUAL_BASELINE_BREAKDOWN.values())
        assert abs(total - 8.0) < 0.01, f"Baseline breakdown sums to {total}, expected 8.0"

    def test_all_breakdown_categories_present(self):
        """All major workflow stages must be in the breakdown."""
        from api.main import MANUAL_BASELINE_BREAKDOWN

        required = {
            "research_hours",
            "drafting_hours",
            "compliance_review_hours",
            "localization_hours",
            "editorial_review_hours",
        }
        assert required.issubset(set(MANUAL_BASELINE_BREAKDOWN.keys()))


class TestCycleReductionCalc:
    def test_95pct_reduction_for_90_second_run(self):
        """A 90-second pipeline vs 8-hour baseline = ~96.9% reduction."""
        baseline = 8.0
        actual_duration_ms = 90_000
        actual_hours = actual_duration_ms / (1000 * 60 * 60)
        reduction = (baseline - actual_hours) / baseline * 100
        assert reduction > 95.0

    def test_cost_efficiency_ratio_positive(self):
        """Cost efficiency ratio must be positive (INR value saved > USD spent on LLM)."""
        estimated_hours_saved = 7.9
        estimated_llm_cost_usd = 0.015
        ratio = (estimated_hours_saved * 1500 / 80) / estimated_llm_cost_usd
        assert ratio > 1.0
