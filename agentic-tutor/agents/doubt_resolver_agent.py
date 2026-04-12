"""DoubtResolverAgent — Answers student doubts using ONLY current lecture context."""

from crewai import Agent
from utils.llm_fallback import doubt_resolver_llm


def create_doubt_resolver_agent() -> Agent:
    return Agent(
        role="Real-Time Doubt Resolver",
        goal=(
            "Answer the student's question quickly and accurately using ONLY the "
            "current lecture script and fetched resources as context. Do NOT use "
            "any prior course history. Keep answers concise and under 300 words."
        ),
        backstory=(
            "You are a brilliant teaching assistant who can explain any concept "
            "in a simple, intuitive way. You specialize in answering student doubts "
            "in real time during live lectures, always referencing the specific "
            "content that was just covered."
        ),
        llm=doubt_resolver_llm(),
        tools=[],
        verbose=True,
        allow_delegation=False,
        max_iter=5,
        max_execution_time=15,  # must respond fast
        respect_context_window=True,
    )
