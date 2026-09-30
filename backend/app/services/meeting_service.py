import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy import select, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Meeting, MeetingParticipant, User
from ..schemas import (
    MeetingCreateInstant,
    MeetingSchedule,
    MeetingUpdateRequest,
    MeetingJoinRequest
)
from ..config import settings

def format_zoom_code(raw_digits: str) -> str:
    """Format digits into Zoom-style grouped ID: ### ### #### or ### #### ####."""
    clean = raw_digits.replace(" ", "").replace("-", "")
    if len(clean) == 10:
        return f"{clean[:3]} {clean[3:6]} {clean[6:]}"
    elif len(clean) == 11:
        return f"{clean[:3]} {clean[3:7]} {clean[7:]}"
    return raw_digits

def normalize_code(code: str) -> str:
    """Normalize input into both raw digits and formatted Zoom string."""
    return code.replace(" ", "").replace("-", "")

async def generate_meeting_code(db: AsyncSession) -> str:
    """Generate a unique 10-digit numeric code matching Zoom's format (### ### ####)."""
    for _ in range(20):
        # 10 digits
        raw_digits = str(secrets.randbelow(9 * 10**9) + 10**9)
        formatted = format_zoom_code(raw_digits)
        clean = normalize_code(formatted)

        # Check uniqueness across database
        query = select(Meeting).where(
            or_(
                Meeting.meeting_code == formatted,
                Meeting.meeting_code == clean,
                Meeting.meeting_id == formatted,
                Meeting.meeting_id == clean
            )
        )
        existing = await db.execute(query)
        if existing.scalars().first() is None:
            return formatted
    return format_zoom_code(str(secrets.randbelow(9 * 10**10) + 10**10))

def build_invite_link(code: str) -> str:
    """Construct canonical join link from meeting code."""
    clean = normalize_code(code)
    return f"{settings.frontend_base_url}/join?meetingId={clean}"

async def get_default_user(db: AsyncSession) -> User:
    """Retrieve or create the default logged-in user (Alex Rivera)."""
    result = await db.execute(select(User).where(User.id == 1))
    user = result.scalars().first()
    if not user:
        user = User(
            id=1,
            name="Alex Rivera",
            email="alex.rivera@zoomclone.local",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user

async def create_instant_meeting(
    db: AsyncSession,
    payload: MeetingCreateInstant = MeetingCreateInstant()
) -> Meeting:
    """Create a new instant meeting immediately redirecting to room."""
    user = await get_default_user(db)
    code = await generate_meeting_code(db)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    meeting = Meeting(
        meeting_code=code,
        title=payload.title or "Instant Meeting",
        description="",
        host_id=user.id,
        host_name=payload.host_name or user.name,
        meeting_type="instant",
        status="active",
        duration_minutes=60,
        started_at=now
    )
    db.add(meeting)
    await db.flush()

    # Add host as initial participant
    host_participant = MeetingParticipant(
        meeting_id=meeting.id,
        meeting_code=meeting.meeting_code,
        user_id=user.id,
        display_name=payload.host_name or user.name,
        role="host",
        is_muted=False,
        joined_at=now
    )
    db.add(host_participant)
    await db.commit()
    await db.refresh(meeting)
    return meeting

async def schedule_meeting(
    db: AsyncSession,
    payload: MeetingSchedule
) -> Meeting:
    """Validate and persist a newly scheduled meeting."""
    user = await get_default_user(db)

    # Validation: duration must be > 0
    if payload.duration_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be greater than 0 minutes."
        )

    # Validation: reject past dates (with 5 minute grace period for timezone variance)
    sched_dt = payload.scheduled_at.replace(tzinfo=None) if payload.scheduled_at else None
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if sched_dt and sched_dt < (now_utc - timedelta(minutes=5)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time cannot be in the past."
        )

    code = await generate_meeting_code(db)

    meeting = Meeting(
        meeting_code=code,
        title=payload.title.strip(),
        description=payload.description or "",
        host_id=user.id,
        host_name=payload.host_name or user.name,
        meeting_type="scheduled",
        scheduled_at=sched_dt,
        duration_minutes=payload.duration_minutes,
        status="scheduled",
        passcode=payload.passcode
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return meeting

async def get_upcoming_meetings(db: AsyncSession) -> List[Meeting]:
    """Retrieve scheduled upcoming meetings sorted chronologically."""
    query = (
        select(Meeting)
        .where(Meeting.status == "scheduled")
        .order_by(Meeting.scheduled_at.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_recent_meetings(db: AsyncSession) -> List[Meeting]:
    """Retrieve completed/ended or live meetings for recent history."""
    query = (
        select(Meeting)
        .where(Meeting.status.in_(["ended", "completed", "live", "active"]))
        .order_by(Meeting.created_at.desc())
        .limit(10)
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_meeting_by_code(db: AsyncSession, code: str) -> Meeting:
    """
    Retrieve meeting by code or ID.
    Raises 404 if not found.
    Raises 410 if ended.
    """
    clean = normalize_code(code)
    formatted = format_zoom_code(code)

    query = select(Meeting).where(
        or_(
            Meeting.meeting_code == code,
            Meeting.meeting_code == clean,
            Meeting.meeting_code == formatted,
            Meeting.meeting_id == code,
            Meeting.meeting_id == clean,
            Meeting.meeting_id == formatted
        )
    )
    result = await db.execute(query)
    meeting = result.scalars().first()

    if not meeting:
        # On-demand provision for Personal Meeting Room (PMI: 849 203 1192)
        if clean == "8492031192":
            user = await get_default_user(db)
            meeting = Meeting(
                meeting_code="849 203 1192",
                title="Personal Meeting Room",
                host_id=user.id,
                host_name=user.name,
                meeting_type="instant",
                status="live",
                duration_minutes=60,
                started_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.add(meeting)
            await db.commit()
            await db.refresh(meeting)
            return meeting

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{code}' not found."
        )

    # Requirement 9.3: If meeting is ended, return 410
    if meeting.status in ("ended", "completed"):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This meeting has ended."
        )

    return meeting

async def join_meeting(
    db: AsyncSession,
    code: str,
    payload: MeetingJoinRequest
) -> MeetingParticipant:
    """Add a participant to the meeting and record their entry."""
    meeting = await get_meeting_by_code(db, code)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    participant = MeetingParticipant(
        meeting_id=meeting.id,
        meeting_code=meeting.meeting_code,
        display_name=payload.display_name.strip(),
        role="attendee",
        is_muted=False,
        joined_at=now
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant

async def leave_meeting(
    db: AsyncSession,
    code: str,
    participant_id: Optional[int] = None,
    display_name: Optional[str] = None
) -> dict:
    """Record participant departure."""
    clean = normalize_code(code)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    query = select(MeetingParticipant).where(
        or_(
            MeetingParticipant.meeting_code == code,
            MeetingParticipant.meeting_code == clean
        ),
        MeetingParticipant.left_at.is_(None)
    )
    if participant_id:
        query = query.where(MeetingParticipant.id == participant_id)
    elif display_name:
        query = query.where(MeetingParticipant.display_name == display_name)

    result = await db.execute(query)
    participant = result.scalars().first()
    if participant:
        participant.left_at = now
        await db.commit()
        return {"status": "left", "participant_id": participant.id}

    return {"status": "ok"}

async def end_meeting(db: AsyncSession, code: str) -> Meeting:
    """Host ends the meeting, changing status to ended."""
    clean = normalize_code(code)
    query = select(Meeting).where(
        or_(
            Meeting.meeting_code == code,
            Meeting.meeting_code == clean,
            Meeting.meeting_id == code,
            Meeting.meeting_id == clean
        )
    )
    result = await db.execute(query)
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{code}' not found."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    meeting.status = "ended"
    meeting.ended_at = now

    # Mark all active participants as left
    await db.execute(
        update(MeetingParticipant)
        .where(
            or_(
                MeetingParticipant.meeting_code == code,
                MeetingParticipant.meeting_code == clean,
                MeetingParticipant.meeting_id == meeting.id
            ),
            MeetingParticipant.left_at.is_(None)
        )
        .values(left_at=now)
    )
    await db.commit()
    await db.refresh(meeting)
    return meeting

async def get_meeting_participants(
    db: AsyncSession,
    code: str
) -> List[MeetingParticipant]:
    """List current active participants in the meeting."""
    clean = normalize_code(code)
    query = (
        select(MeetingParticipant)
        .where(
            or_(
                MeetingParticipant.meeting_code == code,
                MeetingParticipant.meeting_code == clean
            ),
            MeetingParticipant.left_at.is_(None)
        )
        .order_by(MeetingParticipant.joined_at.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def mute_all_participants(db: AsyncSession, code: str) -> dict:
    """Bonus: Host mutes all active attendee participants."""
    clean = normalize_code(code)
    await db.execute(
        update(MeetingParticipant)
        .where(
            or_(
                MeetingParticipant.meeting_code == code,
                MeetingParticipant.meeting_code == clean
            ),
            MeetingParticipant.role != "host",
            MeetingParticipant.left_at.is_(None)
        )
        .values(is_muted=True)
    )
    await db.commit()
    return {"status": "muted_all"}

async def remove_participant(
    db: AsyncSession,
    code: str,
    participant_id: int
) -> dict:
    """Bonus: Host removes a participant."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.id == participant_id,
            MeetingParticipant.left_at.is_(None)
        )
    )
    participant = result.scalars().first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found."
        )

    participant.left_at = now
    await db.commit()
    return {"status": "removed", "participant_id": participant_id}

async def delete_meeting(db: AsyncSession, code: str) -> dict:
    """Bonus: Delete or cancel a scheduled meeting."""
    clean = normalize_code(code)
    query = select(Meeting).where(
        or_(
            Meeting.meeting_code == code,
            Meeting.meeting_code == clean,
            Meeting.meeting_id == code,
            Meeting.meeting_id == clean
        )
    )
    result = await db.execute(query)
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{code}' not found."
        )

    await db.delete(meeting)
    await db.commit()
    return {"status": "deleted", "meeting_code": code}

async def update_meeting(
    db: AsyncSession,
    code: str,
    payload: MeetingUpdateRequest
) -> Meeting:
    """Bonus: Edit a scheduled meeting."""
    clean = normalize_code(code)
    query = select(Meeting).where(
        or_(
            Meeting.meeting_code == code,
            Meeting.meeting_code == clean,
            Meeting.meeting_id == code,
            Meeting.meeting_id == clean
        )
    )
    result = await db.execute(query)
    meeting = result.scalars().first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{code}' not found."
        )

    if payload.title is not None:
        meeting.title = payload.title.strip()
    if payload.description is not None:
        meeting.description = payload.description.strip()
    if payload.scheduled_at is not None:
        meeting.scheduled_at = payload.scheduled_at.replace(tzinfo=None)
    if payload.duration_minutes is not None:
        meeting.duration_minutes = payload.duration_minutes
    if payload.passcode is not None:
        meeting.passcode = payload.passcode.strip()

    await db.commit()
    await db.refresh(meeting)
    return meeting
