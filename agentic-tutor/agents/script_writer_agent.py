"""ScriptWriterAgent — Writes engaging lecture scripts from fetched resources."""

from crewai import Agent
from utils.llm_fallback import script_writer_llm


def create_script_writer_agent() -> Agent:
    return Agent(
        role="AI Lecture Script Writer",
        goal=(
            "Write an engaging, clear, and comprehensive lecture script based on the "
            "provided resources and topic. The script should feel like a real professor "
            "speaking — with clear explanations, analogies, examples, and a logical flow. "
            "Adapt the tone to the student's learning style and preferred language."
        ),
        backstory=(
            "You are an award-winning educational content creator who has written "
            "scripts for popular online courses at Coursera, edX, and YouTube channels "
            "with millions of subscribers. You excel at breaking down complex topics "
            "into digestible, memorable segments. Your scripts are ready for text-to-speech."
        ),
        llm=script_writer_llm(),
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
