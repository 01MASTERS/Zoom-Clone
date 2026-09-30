from datetime import datetime
from typing import Optional, List
# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func
)
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from .database import Base

class User(Base):
    """Default user model representing logged-in users / meeting hosts."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="Alex Rivera")
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, default="alex.rivera@zoomclone.local")
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")
    participations: Mapped[List["MeetingParticipant"]] = relationship("MeetingParticipant", back_populates="user")


class Meeting(Base):
    """Meeting model holding both instant and scheduled meetings."""
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Both meeting_id and meeting_code mapped for 100% compatibility with existing SQLite & PDF schema
    meeting_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    meeting_code: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")
    host_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, default=1)
    host_name: Mapped[str] = mapped_column(String(100), default="Alex Rivera", nullable=False)
    meeting_type: Mapped[str] = mapped_column(String(20), default="instant", nullable=False) # instant or scheduled
    is_instant: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False) # scheduled -> live -> ended
    passcode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __init__(self, **kwargs):
        # Synchronize meeting_code and meeting_id
        if "meeting_code" in kwargs and "meeting_id" not in kwargs:
            kwargs["meeting_id"] = kwargs["meeting_code"]
        elif "meeting_id" in kwargs and "meeting_code" not in kwargs:
            kwargs["meeting_code"] = kwargs["meeting_id"]

        # Synchronize is_instant and meeting_type
        if "meeting_type" in kwargs and "is_instant" not in kwargs:
            kwargs["is_instant"] = (kwargs["meeting_type"] == "instant")
        elif "is_instant" in kwargs and "meeting_type" not in kwargs:
            kwargs["meeting_type"] = "instant" if kwargs["is_instant"] else "scheduled"

        super().__init__(**kwargs)

    host: Mapped[Optional["User"]] = relationship("User", back_populates="meetings")
    participants: Mapped[List["MeetingParticipant"]] = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="meeting",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class MeetingParticipant(Base):
    """Participant model tracking attendance, host/attendee roles, and mute state."""
    __tablename__ = "meeting_participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("meetings.meeting_id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    meeting_code: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="attendee", nullable=False) # host or attendee
    is_host: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __init__(self, **kwargs):
        if "role" in kwargs and "is_host" not in kwargs:
            kwargs["is_host"] = (kwargs["role"] == "host")
        elif "is_host" in kwargs and "role" not in kwargs:
            kwargs["role"] = "host" if kwargs["is_host"] else "attendee"

        if "meeting_code" in kwargs and "meeting_id" not in kwargs:
            kwargs["meeting_id"] = kwargs["meeting_code"]
        elif "meeting_id" in kwargs and "meeting_code" not in kwargs:
            kwargs["meeting_code"] = kwargs["meeting_id"]

        super().__init__(**kwargs)

    meeting: Mapped[Optional["Meeting"]] = relationship("Meeting", back_populates="participants")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="participations")


class ChatMessage(Base):
    """Chat message model for in-meeting text messages."""
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("meetings.meeting_id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    sender_name: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    meeting: Mapped[Optional["Meeting"]] = relationship("Meeting", back_populates="messages")
