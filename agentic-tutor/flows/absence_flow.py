"""
AbsenceFlow — Reschedules lectures when a student misses days.

Trigger: POST /report-absence
Steps:
  1. @start() reschedule → AbsenceHandlerAgent shifts all future dates
"""

import json
import logging

from crewai import Crew, Task
from crewai.flow.flow import Flow, start

from state.tutor_state import TutorState, DayEntry, CalendarEvent
from tools.calendar_tools import update_google_calendar_event
from agents.absence_handler_agent import create_absence_handler_agent

logger = logging.getLogger("agentic_tutor.flows.absence")


class AbsenceFlow(Flow[TutorState]):
    """Handles student absences and reschedules the roadmap accordingly."""

    missed_dates: list = []

    @start()
    def reschedule(self):
        """Use AbsenceHandlerAgent to shift all future lectures/quizzes."""
        logger.info(f"[AbsenceFlow] START — missed_dates={self.missed_dates}")

        # Record interruptions
        for d in self.missed_dates:
            self.state.schedule_interruptions.append(d)

        roadmap_json = self.state.course_roadmap.model_dump_json()
        events_json = json.dumps([e.model_dump() for e in self.state.calendar_events])

        agent = create_absence_handler_agent()
        task = Task(
            description=(
                f"The student missed the following dates: {', '.join(self.missed_dates)}\n\n"
                f"Current roadmap:\n{roadmap_json}\n\n"
                f"Current calendar events:\n{events_json}\n\n"
                f"Reschedule ALL lectures and quizzes on or after the missed dates. "
                f"Push them forward by the number of missed days while maintaining the "
                f"original content order. Use the `update_google_calendar_event` tool "
                f"to update each affected event.\n\n"
                f"Return a summary of all changes made."
            ),
            expected_output="A summary of rescheduled lectures, quizzes, and updated calendar events.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        logger.info(f"[AbsenceFlow] SUCCESS — Rescheduled: {str(result)[:200]}")

        return {
            "updated_roadmap": self.state.course_roadmap.model_dump(),
            "rescheduled_events": [e.model_dump() for e in self.state.calendar_events],
            "changes_summary": str(result),
        }
