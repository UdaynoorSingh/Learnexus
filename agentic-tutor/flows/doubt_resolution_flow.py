"""
DoubtResolutionFlow — Resolves student doubts mid-lecture.

Trigger: POST /ask-doubt
Steps:
  1. @start() resolve_doubt → DoubtResolverAgent answers using ONLY current lecture context
"""

import logging

from crewai import Crew, Task
from crewai.flow.flow import Flow, start

from state.tutor_state import TutorState
from agents.doubt_resolver_agent import create_doubt_resolver_agent

logger = logging.getLogger("agentic_tutor.flows.doubt_resolution")


class DoubtResolutionFlow(Flow[TutorState]):
    """Answers student doubts using only the current lecture context."""

    student_question: str = ""
    question_lecture_index: int = 0

    @start()
    def resolve_doubt(self):
        """Use DoubtResolverAgent with tight context (current lecture only)."""
        logger.info(f"[DoubtResolutionFlow] START — question='{self.student_question[:100]}...'")

        context_parts = []

        if self.state.current_script:
            script_excerpt = self.state.current_script[:3000]
            context_parts.append(f"=== CURRENT LECTURE SCRIPT ===\n{script_excerpt}")

        if self.state.fetched_resources.web_results:
            resources_text = "\n".join(
                str(r) for r in self.state.fetched_resources.web_results[:3]
            )[:1500]
            context_parts.append(f"=== REFERENCE RESOURCES ===\n{resources_text}")

        context = "\n\n".join(context_parts) if context_parts else "No lecture context available."

        agent = create_doubt_resolver_agent()
        task = Task(
            description=(
                f"A student has the following question during their current lecture:\n\n"
                f"**Student Question**: {self.student_question}\n\n"
                f"Answer using ONLY the context below. Do NOT use any external knowledge "
                f"or prior course history. Be concise (under 300 words), clear, and helpful.\n\n"
                f"{context}"
            ),
            expected_output="A clear, concise answer to the student's question.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        answer = str(result)
        logger.info(f"[DoubtResolutionFlow] SUCCESS — answer length={len(answer)} chars")

        current_lecture = None
        for week in self.state.course_roadmap.weeks:
            for day in week.days:
                if day.type == "lecture" and day.lecture_index == self.question_lecture_index:
                    current_lecture = day
                    break

        return {
            "answer": answer,
            "referenced_topics": current_lecture.topics if current_lecture else [],
        }
