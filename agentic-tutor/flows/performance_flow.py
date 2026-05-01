"""
PerformanceFlow — Analyzes cumulative student performance.

Trigger: Called internally after every quiz grade, or via GET /performance-report
Steps:
  1. @start() analyze → PerformanceTrackerAgent generates a performance summary
"""

import json
import logging

from crewai import Crew, Task
from crewai.flow.flow import Flow, start

from state.tutor_state import TutorState
from agents.performance_tracker_agent import create_performance_tracker_agent

logger = logging.getLogger("agentic_tutor.flows.performance")


class PerformanceFlow(Flow[TutorState]):
    """Generates a comprehensive performance report from quiz history."""

    @start()
    def analyze(self):
        """Use PerformanceTrackerAgent to analyze all quiz scores and performance data."""
        logger.info("[PerformanceFlow] START — analyzing performance...")

        quiz_history = ""
        for qs in self.state.quiz_scores:
            quiz_history += (
                f"\n- Quiz {qs.quiz_id}: {qs.score}/{qs.total} ({qs.percentage}%) "
                f"| Weak: {', '.join(qs.weak_topics) if qs.weak_topics else 'None'}"
            )

        if not quiz_history:
            quiz_history = "\nNo quizzes taken yet."

        perf_log = ""
        for entry in self.state.performance_log:
            perf_log += f"\n- {entry.notes} | Weak: {', '.join(entry.weak_topics)}"

        if not perf_log:
            perf_log = "\nNo performance entries yet."

        total_lectures = sum(
            1 for w in self.state.course_roadmap.weeks
            for d in w.days if d.type == "lecture"
        )
        completed = self.state.current_lecture_index
        progress_pct = (completed / max(total_lectures, 1)) * 100

        agent = create_performance_tracker_agent()
        task = Task(
            description=(
                f"Analyze the student's learning performance:\n\n"
                f"**Topic**: {self.state.student_profile.topic}\n"
                f"**Overall Progress**: {completed}/{total_lectures} lectures ({progress_pct:.1f}%)\n\n"
                f"**Quiz History**:{quiz_history}\n\n"
                f"**Performance Log**:{perf_log}\n\n"
                f"Generate a comprehensive report with:\n"
                f'1. "quiz_scores": summary of each quiz\n'
                f'2. "weak_topics": consolidated list of topics needing improvement\n'
                f'3. "strong_topics": topics the student has mastered\n'
                f'4. "overall_progress_percent": {progress_pct:.1f}\n'
                f'5. "recommendations": actionable study tips\n\n'
                f"Return as JSON."
            ),
            expected_output="A JSON performance report with quiz_scores, weak_topics, strong_topics, and recommendations.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        raw = str(result)
        logger.info(f"[PerformanceFlow] SUCCESS — Report generated, length={len(raw)} chars")

        try:
            import re
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if json_match:
                raw = json_match.group(1).strip()
            brace_start = raw.index("{")
            brace_end = raw.rindex("}") + 1
            report = json.loads(raw[brace_start:brace_end])
        except Exception:
            report = {
                "quiz_scores": [qs.model_dump() for qs in self.state.quiz_scores],
                "weak_topics": list(set(
                    t for qs in self.state.quiz_scores for t in qs.weak_topics
                )),
                "overall_progress_percent": progress_pct,
                "raw_analysis": raw,
            }

        return report
