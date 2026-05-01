"""
Mock Tool Implementations — Realistic fake data for local testing.

In production, replace these with real integrations (Exa API, Sarvam TTS,
Google Calendar API). The mock versions log all inputs for observability.
"""

import logging
import uuid
from crewai.tools import tool

logger = logging.getLogger("agentic_tutor.tools")


@tool("exa_web_search")
def exa_web_search(query: str) -> str:
    """Searches the web using Exa for lecture topic resources. Returns JSON with title, url, and content snippet."""
    logger.info(f"[MOCK] exa_web_search called with query='{query}'")
    results = [
        {
            "title": f"Comprehensive Guide to {query}",
            "url": f"https://example.com/guide-{query.lower().replace(' ', '-')}",
            "snippet": f"This in-depth article covers the fundamentals of {query}, "
                       f"including key concepts, practical examples, and recent advances in the field.",
        },
        {
            "title": f"{query} — MIT OpenCourseWare Lecture Notes",
            "url": f"https://ocw.mit.edu/{query.lower().replace(' ', '-')}-notes",
            "snippet": f"Full lecture notes from MIT's course on {query}. "
                       f"Covers theory, mathematical foundations, and hands-on labs.",
        },
        {
            "title": f"Visual Explanation of {query} (with diagrams)",
            "url": f"https://visuallearning.dev/{query.lower().replace(' ', '-')}",
            "snippet": f"Interactive visual explanations with step-by-step diagrams "
                       f"to build deep intuition about {query}.",
        },
    ]
    import json
    return json.dumps(results, indent=2)


@tool("fetch_library_notes")
def fetch_library_notes(topic_tag: str) -> str:
    """Fetches top-liked community notes from the in-app Nexus Library by topic tag. Returns JSON list."""
    logger.info(f"[MOCK] fetch_library_notes called with topic_tag='{topic_tag}'")
    notes = [
        {
            "note_id": f"note_{uuid.uuid4().hex[:8]}",
            "title": f"Quick Summary: {topic_tag}",
            "content": f"A concise, student-friendly overview of {topic_tag}. "
                       f"Covers the most important definitions, formulas, and examples.",
            "likes": 42,
            "dislikes": 3,
        },
        {
            "note_id": f"note_{uuid.uuid4().hex[:8]}",
            "title": f"{topic_tag} — Cheat Sheet",
            "content": f"One-page cheat sheet for {topic_tag} with all key formulas, "
                       f"mnemonics, and common pitfalls to avoid.",
            "likes": 28,
            "dislikes": 1,
        },
    ]
    import json
    return json.dumps(notes, indent=2)


@tool("trigger_sarvam_tts")
def trigger_sarvam_tts(script: str, language: str = "English") -> str:
    """Sends lecture script to Sarvam TTS API and returns an audio URL. For testing, returns a mock URL."""
    logger.info(f"[MOCK] trigger_sarvam_tts called — language='{language}', script_length={len(script)} chars")
    import json
    result = {
        "audio_url": "https://mock-cdn.sarvam.ai/lecture_audio_" + uuid.uuid4().hex[:8] + ".mp3",
        "duration_seconds": max(60, len(script) // 3),  
        "language": language,
        "status": "generated",
    }
    return json.dumps(result, indent=2)


@tool("add_google_calendar_event")
def add_google_calendar_event(title: str, date: str, description: str = "") -> str:
    """Creates a Google Calendar event for a lecture or quiz. Mock implementation for testing."""
    logger.info(f"[MOCK] add_google_calendar_event — title='{title}', date='{date}'")
    import json
    result = {
        "event_id": f"mock_evt_{uuid.uuid4().hex[:12]}",
        "title": title,
        "date": date,
        "description": description,
        "status": "created",
    }
    return json.dumps(result, indent=2)


@tool("update_google_calendar_event")
def update_google_calendar_event(event_id: str, new_date: str) -> str:
    """Reschedules an existing Google Calendar event. Mock implementation for testing."""
    logger.info(f"[MOCK] update_google_calendar_event — event_id='{event_id}', new_date='{new_date}'")
    import json
    result = {
        "event_id": event_id,
        "status": "updated",
        "new_date": new_date,
    }
    return json.dumps(result, indent=2)
