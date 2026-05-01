"""
Real Google Calendar Integration Tools for Agentic Tutor.
Requires a credentials.json file downloaded from Google Cloud Console.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from crewai.tools import tool

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

logger = logging.getLogger("agentic_tutor.tools.calendar")

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")

def get_calendar_service():
    """Authenticates using credentials.json and returns the Google Calendar service."""
    creds = None
    
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.error(f"Failed to refresh token: {e}")
                creds = None

        if not creds:
            if not os.path.exists(CREDS_FILE):
                error_msg = f"ERROR: '{CREDS_FILE}' not found! Please download your OAuth Client ID JSON from Google Cloud Console."
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)

            logger.info("Triggering Google OAuth Flow - please check your browser to authorize...")
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    service = build("calendar", "v3", credentials=creds)
    return service


@tool("add_google_calendar_event")
def add_google_calendar_event(title: str, date: str, description: str = "") -> str:
    """
    Creates a Google Calendar event for a lecture or quiz. 
    date must be in ISO format, e.g. YYYY-MM-DD.
    """
    logger.info(f"add_google_calendar_event called — title='{title}', date='{date}'")
    try:
        service = get_calendar_service()
        
        start_datetime = datetime.fromisoformat(date)
        end_datetime = start_datetime + timedelta(hours=1)

        event_body = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_datetime.isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_datetime.isoformat(),
                "timeZone": "UTC",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 30},
                ],
            },
        }

        event = service.events().insert(calendarId="primary", body=event_body).execute()
        event_id = event.get("id")
        event_link = event.get("htmlLink")
        
        import json
        result = {
            "event_id": event_id,
            "title": title,
            "date": start_datetime.isoformat(),
            "description": description,
            "status": "created",
            "htmlLink": event_link
        }
        logger.info(f"Successfully created Google Calendar event: {event_link}")
        return json.dumps(result, indent=2)

    except Exception as e:
        logger.error(f"Failed to create Google Calendar event: {e}")
        import json
        return json.dumps({"error": str(e), "status": "failed"})


@tool("update_google_calendar_event")
def update_google_calendar_event(event_id: str, new_date: str) -> str:
    """
    Reschedules an existing Google Calendar event.
    new_date must be in ISO format, e.g. YYYY-MM-DD.
    """
    logger.info(f"update_google_calendar_event called — event_id='{event_id}', new_date='{new_date}'")
    try:
        service = get_calendar_service()
        
        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        start_datetime = datetime.fromisoformat(new_date)
        end_datetime = start_datetime + timedelta(hours=1)
        event["start"]["dateTime"] = start_datetime.isoformat()
        event["end"]["dateTime"] = end_datetime.isoformat()

        updated_event = service.events().update(calendarId="primary", eventId=event_id, body=event).execute()
        
        import json
        result = {
            "event_id": event_id,
            "status": "updated",
            "new_date": start_datetime.isoformat(),
            "htmlLink": updated_event.get("htmlLink")
        }
        logger.info(f"Successfully updated Google Calendar event: {updated_event.get('htmlLink')}")
        return json.dumps(result, indent=2)

    except Exception as e:
        logger.error(f"Failed to update Google Calendar event: {e}")
        import json
        return json.dumps({"error": str(e), "status": "failed"})
