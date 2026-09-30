from datetime import datetime
from typing import Optional, List
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field
from .config import settings

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

class MeetingBase(BaseModel):
    title: str = Field(..., max_length=255, description="Meeting title / topic")
    description: Optional[str] = Field(default="", description="Meeting description")
    host_name: str = Field(default="Alex Rivera", max_length=100, description="Name of meeting creator")

class MeetingCreateInstant(BaseModel):
    title: Optional[str] = Field(default="Instant Meeting", max_length=255)
    host_name: Optional[str] = Field(default="Alex Rivera", max_length=100)

class MeetingSchedule(MeetingBase):
    scheduled_at: datetime = Field(..., description="Scheduled start time in ISO 8601")
    duration_minutes: int = Field(default=30, ge=1, le=1440, description="Duration in minutes, must be > 0")
    passcode: Optional[str] = Field(default=None, max_length=20)

class MeetingUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    passcode: Optional[str] = None

class MeetingJoinRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100, description="Participant display name")

class MeetingParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: Optional[int] = None
    meeting_code: Optional[str] = None
    user_id: Optional[int] = None
    display_name: str
    role: str = "attendee"
    is_host: bool = False
    is_muted: bool = False
    joined_at: datetime
    left_at: Optional[datetime] = None

class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    meeting_id: str
    title: str
    description: Optional[str] = ""
    host_id: Optional[int] = None
    host_name: str = "Alex Rivera"
    meeting_type: str = "instant" # instant | scheduled
    is_instant: bool = True
    scheduled_at: Optional[datetime] = None
    duration_minutes: int = 30
    status: str # scheduled | live | ended
    passcode: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    invite_url: str = ""
    join_url: str = ""
    participant_count: int = 0
    participants: Optional[List[MeetingParticipantResponse]] = []

    def model_post_init(self, __context) -> None:
        clean_code = (self.meeting_code or self.meeting_id or "").replace(" ", "")
        if not self.invite_url and clean_code:
            self.invite_url = f"{settings.frontend_base_url}/meeting/{clean_code}"
        if not self.join_url and clean_code:
            self.join_url = f"{settings.frontend_base_url}/join?meetingId={clean_code}"
