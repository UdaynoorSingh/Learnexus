"""
CourseInitFlow — Generates the full course roadmap and creates calendar events.

Trigger: POST /init-course
Steps:
  1. @start() generate_roadmap → RoadmapAgent produces structured JSON roadmap
  2. @listen() create_calendar_events → batch-creates mock calendar events
"""

import json
import logging
import re
from datetime import datetime, timedelta

from crewai import Agent, Crew, Task
from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel, Field
from typing import Optional, List

from state.tutor_state import TutorState, CourseRoadmap, DayEntry, Week, CalendarEvent
from agents.roadmap_agent import create_roadmap_agent
from tools.calendar_tools import add_google_calendar_event

logger = logging.getLogger("agentic_tutor.flows.course_init")


class CourseInitFlow(Flow[TutorState]):
    """Orchestrates course initialization: roadmap generation → calendar sync."""

    @start()
    def generate_roadmap(self):
        """Step 1: Use RoadmapAgent to produce a structured JSON course roadmap."""
        logger.info(f"[CourseInitFlow] START — generate_roadmap for topic='{self.state.student_profile.topic}'")

        profile = self.state.student_profile

        duration_weeks = profile.duration_weeks
        duration_str = profile.duration_input.lower()
        if "month" in duration_str:
            try:
                months = int(re.search(r"(\d+)", duration_str).group(1))
                duration_weeks = months * 4
                self.state.student_profile.duration_weeks = duration_weeks
            except Exception:
                pass

        today = datetime.utcnow()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        start_date = (today + timedelta(days=days_until_monday)).strftime("%Y-%m-%d")

        task_description = f"""
Create a detailed course roadmap for the following student profile:

- **Topic**: {profile.topic}
- **Depth Level**: {profile.depth_level}
- **Duration**: {duration_weeks} weeks (starting from {start_date})
- **Pace**: {profile.pace_speed}
- **Language**: {profile.preferred_language}
- **Learning Style**: {profile.learning_style}
- **Constraints**: {profile.constraints or 'None'}

Rules:
1. Schedule 2-3 lecture days per week (Mon/Wed/Fri or Mon/Wed or Tue/Thu).
2. Insert a quiz after every 2-3 lectures.
3. Each lecture must have a unique `lecture_index` starting from 0.
4. Quiz entries must reference the `lecture_index` values they cover in `covers_lectures`.
5. Provide specific dates in YYYY-MM-DD format starting from {start_date}.
6. No lecture content — only titles and topic names per day.

Output ONLY valid JSON matching this exact schema:
{{
  "course_title": "...",
  "total_weeks": {duration_weeks},
  "weeks": [
    {{
      "week_number": 1,
      "days": [
        {{
          "day": "Monday",
          "date": "YYYY-MM-DD",
          "type": "lecture",
          "lecture_index": 0,
          "title": "Introduction to ...",
          "topics": ["Topic A", "Topic B"],
          "estimated_duration_minutes": 45
        }},
        {{
          "day": "Wednesday",
          "date": "YYYY-MM-DD",
          "type": "quiz",
          "lecture_index": null,
          "covers_lectures": [0, 1],
          "title": "Quiz: ...",
          "num_questions": 5,
          "topics": [],
          "estimated_duration_minutes": 20
        }}
      ]
    }}
  ]
}}
"""

        agent = create_roadmap_agent()
        task = Task(
            description=task_description,
            expected_output="A valid JSON object containing the full course roadmap.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        raw = str(result)
        logger.info(f"[CourseInitFlow] Raw roadmap output length: {len(raw)} chars")

        try:
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if json_match:
                raw = json_match.group(1).strip()
            brace_start = raw.index("{")
            brace_end = raw.rindex("}") + 1
            json_str = raw[brace_start:brace_end]
            roadmap_data = json.loads(json_str)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"[CourseInitFlow] Failed to parse roadmap JSON: {e}")
            raise ValueError(f"RoadmapAgent produced invalid JSON: {e}")

        roadmap = CourseRoadmap(**roadmap_data)
        self.state.course_roadmap = roadmap
        logger.info(f"[CourseInitFlow] SUCCESS — Roadmap generated: {roadmap.course_title}, {roadmap.total_weeks} weeks")
        return roadmap

    @listen(generate_roadmap)
    def create_calendar_events(self, roadmap):
        """Step 2: Batch-create mock Google Calendar events for every lecture/quiz."""
        logger.info("[CourseInitFlow] Creating calendar events for all days...")

        events = []
        for week in self.state.course_roadmap.weeks:
            for day in week.days:
                import json as _json
                result_str = add_google_calendar_event.run(
                    title=day.title,
                    date=day.date,
                    description=f"Week {week.week_number} — {day.type.capitalize()}: {', '.join(day.topics)}",
                )
                result = _json.loads(result_str)

                event = CalendarEvent(
                    event_id=result["event_id"],
                    title=day.title,
                    date=day.date,
                    description=result.get("description", ""),
                    status="created",
                )
                events.append(event)
                day.calendar_event_id = result["event_id"]

        self.state.calendar_events = events
        logger.info(f"[CourseInitFlow] SUCCESS — Created {len(events)} calendar events")
        return {
            "roadmap": self.state.course_roadmap.model_dump(),
            "calendar_events": [e.model_dump() for e in events],
            "student_id": self.state.student_id,
        }
