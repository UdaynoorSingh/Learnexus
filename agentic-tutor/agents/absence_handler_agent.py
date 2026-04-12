"""AbsenceHandlerAgent — Reschedules lectures when student is absent."""

from crewai import Agent
from utils.llm_fallback import absence_handler_llm
from tools.calendar_tools import update_google_calendar_event


def create_absence_handler_agent() -> Agent:
    return Agent(
        role="Schedule Recovery Specialist",
        goal=(
            "When the student reports missed days, recalculate ALL future lecture and "
            "quiz dates to maintain full content coverage without skipping anything. "
            "Shift everything forward appropriately. Update calendar events for all "
            "rescheduled entries. Output the updated schedule as JSON."
        ),
        backstory=(
            "You are an expert academic scheduler who handles frequent disruptions — "
            "sick days, holidays, emergencies — while ensuring no content is ever "
            "skipped. You always preserve the original teaching order and quiz cadence."
        ),
        llm=absence_handler_llm(),
        tools=[update_google_calendar_event],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
