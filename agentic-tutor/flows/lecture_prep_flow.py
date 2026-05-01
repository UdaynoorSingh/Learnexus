"""
LecturePrepFlow — JIT preparation of the next lecture.

Trigger: POST /prep-next-lecture
Steps:
  1. @start() fetch_resources → ResourceFetcherAgent searches web + library
  2. @listen() write_script → ScriptWriterAgent creates the lecture script
  3. @listen() generate_audio → trigger Sarvam TTS mock for audio URL
"""

import json
import logging

from crewai import Crew, Task
from crewai.flow.flow import Flow, listen, start

from state.tutor_state import TutorState, FetchedResources
from agents.resource_fetcher_agent import create_resource_fetcher_agent
from agents.script_writer_agent import create_script_writer_agent
from tools.mock_tools import trigger_sarvam_tts

logger = logging.getLogger("agentic_tutor.flows.lecture_prep")


class LecturePrepFlow(Flow[TutorState]):
    """Orchestrates JIT lecture preparation: fetch → write → audio."""

    def _get_current_lecture(self):
        """Find the current lecture entry from the roadmap."""
        idx = self.state.current_lecture_index
        for week in self.state.course_roadmap.weeks:
            for day in week.days:
                if day.type == "lecture" and day.lecture_index == idx:
                    return day
        return None

    @start()
    def fetch_resources(self):
        """Step 1: Use ResourceFetcherAgent to gather web + library resources."""
        lecture = self._get_current_lecture()
        if not lecture:
            logger.error(f"[LecturePrepFlow] No lecture found at index {self.state.current_lecture_index}")
            raise ValueError(f"No lecture at index {self.state.current_lecture_index}")

        logger.info(f"[LecturePrepFlow] START — fetch_resources for '{lecture.title}' (index={lecture.lecture_index})")

        topics_str = ", ".join(lecture.topics) if lecture.topics else lecture.title

        agent = create_resource_fetcher_agent()
        task = Task(
            description=(
                f"Find the best learning resources for the following lecture:\n\n"
                f"**Title**: {lecture.title}\n"
                f"**Topics**: {topics_str}\n\n"
                f"Search the web using `exa_web_search` and the in-app library using "
                f"`fetch_library_notes`. Return a comprehensive summary of all resources found."
            ),
            expected_output="A structured summary of web resources and library notes found for this lecture.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        self.state.fetched_resources = FetchedResources(
            web_results=[{"summary": str(result)}],
            library_notes=[],
        )
        logger.info(f"[LecturePrepFlow] SUCCESS — Resources fetched for '{lecture.title}'")
        return str(result)

    @listen(fetch_resources)
    def write_script(self, resources_summary):
        """Step 2: Use ScriptWriterAgent to create an engaging lecture script."""
        lecture = self._get_current_lecture()
        logger.info(f"[LecturePrepFlow] Writing script for '{lecture.title}'...")

        profile = self.state.student_profile
        topics_str = ", ".join(lecture.topics) if lecture.topics else lecture.title

        agent = create_script_writer_agent()
        task = Task(
            description=(
                f"Write an engaging lecture script for the following:\n\n"
                f"**Lecture Title**: {lecture.title}\n"
                f"**Topics to Cover**: {topics_str}\n"
                f"**Duration**: ~{lecture.estimated_duration_minutes} minutes\n"
                f"**Student's Learning Style**: {profile.learning_style}\n"
                f"**Language**: {profile.preferred_language}\n"
                f"**Depth Level**: {profile.depth_level}\n\n"
                f"**Reference Resources**:\n{resources_summary}\n\n"
                f"Write the script as if a professor is speaking. Include:\n"
                f"- A warm opening that hooks the student\n"
                f"- Clear explanations with analogies and examples\n"
                f"- Key takeaways at the end\n"
                f"- Natural transitions between topics\n\n"
                f"The script should be ready for text-to-speech conversion."
            ),
            expected_output="A complete, engaging lecture script ready for TTS conversion.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()

        self.state.current_script = str(result)
        logger.info(f"[LecturePrepFlow] SUCCESS — Script written, length={len(self.state.current_script)} chars")
        return self.state.current_script

    @listen(write_script)
    def generate_audio(self, script):
        """Step 3: Call Sarvam TTS to generate audio from the script."""
        logger.info("[LecturePrepFlow] Generating TTS audio...")

        result_str = trigger_sarvam_tts.run(
            script=script,
            language=self.state.student_profile.preferred_language,
        )
        audio_result = json.loads(result_str)

        lecture = self._get_current_lecture()

        final_result = {
            "lecture_index": self.state.current_lecture_index,
            "title": lecture.title if lecture else "Unknown",
            "topics": lecture.topics if lecture else [],
            "script": self.state.current_script,
            "audio_url": audio_result.get("audio_url", ""),
            "duration_seconds": audio_result.get("duration_seconds", 0),
        }

        self.state.current_lecture_index += 1

        logger.info(f"[LecturePrepFlow] SUCCESS — Audio ready: {audio_result.get('audio_url', '')}")
        return final_result
