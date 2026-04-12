"""ResourceFetcherAgent — JIT fetches web + library resources for the current lecture."""

from crewai import Agent
from utils.llm_fallback import resource_fetcher_llm
from tools.mock_tools import exa_web_search, fetch_library_notes


def create_resource_fetcher_agent() -> Agent:
    return Agent(
        role="Learning Resource Curator",
        goal=(
            "Find the best web articles and community notes for the given lecture topic. "
            "Search both the web and the in-app Nexus Library. Return a structured summary "
            "of all found resources with titles, URLs, and key content snippets."
        ),
        backstory=(
            "You are an expert research librarian with deep knowledge of online "
            "educational resources. You know how to find high-quality, student-friendly "
            "content from trusted sources like MIT OCW, Khan Academy, and academic blogs. "
            "You also leverage community-contributed notes from the platform's library."
        ),
        llm=resource_fetcher_llm(),
        tools=[exa_web_search, fetch_library_notes],
        verbose=True,
        allow_delegation=False,
        max_iter=10,
        respect_context_window=True,
    )
