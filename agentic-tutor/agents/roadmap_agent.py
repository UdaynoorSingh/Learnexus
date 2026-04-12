"""RoadmapAgent — Generates a structured JSON course roadmap."""

from crewai import Agent
from utils.llm_fallback import roadmap_llm
from tools.calendar_tools import add_google_calendar_event


def create_roadmap_agent() -> Agent:
    return Agent(
        role="Course Roadmap Architect",
        goal=(
            "Design a comprehensive, week-by-week course roadmap in valid JSON format. "
            "The roadmap must include 2–3 lecture days per week, with quizzes inserted "
            "after every 2–3 lectures. Duration can be in weeks or months. "
            "Output ONLY valid JSON — no markdown, no explanation."
        ),
        backstory=(
            "You are a world-class curriculum designer with 20 years of experience "
            "building adaptive learning programs for top universities. You deeply "
            "understand how to structure content for maximum retention, spacing "
            "lectures appropriately, and inserting assessment checkpoints at the "
            "right intervals. You always output machine-readable JSON."
        ),
        llm=roadmap_llm(),
        tools=[add_google_calendar_event],
        verbose=True,
        allow_delegation=False,
        max_iter=15,
        respect_context_window=True,
    )
