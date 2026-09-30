from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas import (
    MeetingCreateInstant,
    MeetingSchedule,
    MeetingUpdateRequest,
    MeetingJoinRequest,
    MeetingResponse,
    MeetingParticipantResponse
)
from ..services import meeting_service

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

@router.post("/instant", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_instant_meeting(
    payload: MeetingCreateInstant = MeetingCreateInstant(),
    db: AsyncSession = Depends(get_db)
):
    """Create a new instant meeting and generate unique 10-11 digit Meeting ID."""
    return await meeting_service.create_instant_meeting(db, payload)

@router.post("/schedule", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    payload: MeetingSchedule,
    db: AsyncSession = Depends(get_db)
):
    """Create a scheduled meeting with validated start date, duration, and topic."""
    return await meeting_service.schedule_meeting(db, payload)

@router.get("", response_model=List[MeetingResponse])
async def list_meetings(
    type: Optional[str] = Query(None, description="Filter type: upcoming or recent"),
    db: AsyncSession = Depends(get_db)
):
    """List meetings, optionally filtered by ?type=upcoming or ?type=recent."""
    if type == "upcoming":
        return await meeting_service.get_upcoming_meetings(db)
    elif type == "recent":
        return await meeting_service.get_recent_meetings(db)
    # Default to upcoming if not specified
    return await meeting_service.get_upcoming_meetings(db)

@router.get("/upcoming", response_model=List[MeetingResponse])
async def list_upcoming_meetings(db: AsyncSession = Depends(get_db)):
    """List scheduled upcoming meetings ordered by start time."""
    return await meeting_service.get_upcoming_meetings(db)

@router.get("/recent", response_model=List[MeetingResponse])
async def list_recent_meetings(db: AsyncSession = Depends(get_db)):
    """List past completed or active meetings for history tracking."""
    return await meeting_service.get_recent_meetings(db)

@router.get("/{code}", response_model=MeetingResponse)
async def get_meeting_details(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve meeting details by Meeting ID / code. Returns 404 if missing, 410 if ended."""
    return await meeting_service.get_meeting_by_code(db, code)

@router.post("/{code}/join", response_model=MeetingParticipantResponse, status_code=status.HTTP_200_OK)
async def join_meeting(
    code: str,
    payload: MeetingJoinRequest,
    db: AsyncSession = Depends(get_db)
):
    """Join a meeting as an attendee with a display name."""
    return await meeting_service.join_meeting(db, code, payload)

@router.post("/{code}/leave", status_code=status.HTTP_200_OK)
async def leave_meeting(
    code: str,
    participant_id: Optional[int] = Query(None),
    display_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Mark participant as left."""
    return await meeting_service.leave_meeting(db, code, participant_id, display_name)

@router.post("/{code}/end", response_model=MeetingResponse, status_code=status.HTTP_200_OK)
async def end_meeting(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Host ends the meeting (status = ended)."""
    return await meeting_service.end_meeting(db, code)

@router.get("/{code}/participants", response_model=List[MeetingParticipantResponse])
async def get_meeting_participants(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """List active participants currently in the meeting."""
    return await meeting_service.get_meeting_participants(db, code)

@router.post("/{code}/mute-all", status_code=status.HTTP_200_OK)
async def mute_all_participants(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Bonus: Host moderation control to mute all attendees."""
    return await meeting_service.mute_all_participants(db, code)

@router.delete("/{code}/participants/{id}", status_code=status.HTTP_200_OK)
async def remove_participant(
    code: str,
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Bonus: Host moderation control to remove a participant."""
    return await meeting_service.remove_participant(db, code, id)

@router.delete("/{code}", status_code=status.HTTP_200_OK)
async def delete_meeting(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Bonus: Delete or cancel a scheduled meeting."""
    return await meeting_service.delete_meeting(db, code)

@router.patch("/{code}", response_model=MeetingResponse, status_code=status.HTTP_200_OK)
async def update_meeting(
    code: str,
    payload: MeetingUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bonus: Edit a scheduled meeting."""
    return await meeting_service.update_meeting(db, code, payload)
