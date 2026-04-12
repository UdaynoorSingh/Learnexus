"""PerformanceTrackerAgent — Analyzes cumulative quiz performance and identifies weak spots."""

from crewai import Agent
from utils.llm_fallback import performance_tracker_llm


def create_performance_tracker_agent() -> Agent:
    return Agent(
        role="Learning Performance Analyst",
        goal=(
            "Analyze the student's full quiz history and performance log. Identify "
            "weak topics, calculate overall progress percentage, and generate a "
            "human-readable performance summary with actionable recommendations. "
            "Return the analysis as structured JSON."
        ),
        backstory=(
            "You are a data-driven learning analytics expert who has helped thousands "
            "of students improve their grades. You can spot patterns in assessment data "
            "to identify exactly which concepts need more attention and which ones "
            "the student has mastered."
        ),
        llm=performance_tracker_llm(),
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
