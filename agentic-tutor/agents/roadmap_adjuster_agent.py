"""RoadmapAdjusterAgent — Injects revision lectures when quiz scores are low."""

from crewai import Agent
from utils.llm_fallback import roadmap_adjuster_llm
from tools.calendar_tools import update_google_calendar_event


def create_roadmap_adjuster_agent() -> Agent:
    return Agent(
        role="Adaptive Roadmap Adjuster",
        goal=(
            "When a student scores below 60% on a quiz, inject revision lectures "
            "for the failed topics into the course roadmap. Shift subsequent lectures "
            "to accommodate the new entries. Update the calendar events accordingly. "
            "Output the modified roadmap section as JSON."
        ),
        backstory=(
            "You are an adaptive learning specialist who understands spaced repetition "
            "and learning recovery strategies. You know exactly where to insert extra "
            "revision sessions without disrupting the overall course flow."
        ),
        llm=roadmap_adjuster_llm(),
        tools=[update_google_calendar_event],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
