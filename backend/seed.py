import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure python path includes backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.models import User, Meeting, MeetingParticipant

async def seed_database():
    """Populate database with realistic sample data per Section 12 specifications.
    This script is strictly idempotent: running it multiple times does not produce duplicates."""
    print("[seed] Initializing database schema...")
    await init_db()

    async with AsyncSessionLocal() as session:
        print("[seed] Seeding users...")
        # 1. Default Host User (Alex Rivera)
        host_user = await session.execute(select(User).where(User.id == 1))
        host = host_user.scalars().first()
        if not host:
            host = User(
                id=1,
                name="Alex Rivera",
                email="alex.rivera@zoomclone.local",
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
            )
            session.add(host)
            await session.commit()
            await session.refresh(host)
            print(f"  + Created default host user: {host.name} ({host.email})")
        else:
            print(f"  - Default host user already exists: {host.name}")

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # 2. Upcoming Meetings (3-5 meetings spread over upcoming days)
        upcoming_seeds = [
            {
                "meeting_code": "812 3456 7890",
                "title": "Sprint Planning & Backlog Grooming",
                "description": "Bi-weekly sprint kick-off with sprint commitments and story point reviews.",
                "scheduled_at": now + timedelta(days=1, hours=2),
                "duration_minutes": 45,
                "passcode": "492019"
            },
            {
                "meeting_code": "923 4810 5921",
                "title": "Design Review: Mobile Responsive Layouts",
                "description": "Design crit with UX team evaluating tablet and phone breakpoints.",
                "scheduled_at": now + timedelta(days=2, hours=4),
                "duration_minutes": 30,
                "passcode": "812903"
            },
            {
                "meeting_code": "740 1928 3847",
                "title": "1:1 with Engineering Manager",
                "description": "Career growth check-in, project blockers, and goal alignments.",
                "scheduled_at": now + timedelta(days=3, hours=1),
                "duration_minutes": 30,
                "passcode": "104928"
            },
            {
                "meeting_code": "619 4820 9182",
                "title": "Architecture Sync: WebRTC Mesh & STUN",
                "description": "Evaluating signaling latency, candidate buffering, and media tracks.",
                "scheduled_at": now + timedelta(days=4, hours=3),
                "duration_minutes": 60,
                "passcode": "982104"
            }
        ]

        print("\n[seed] Seeding upcoming meetings...")
        for m_data in upcoming_seeds:
            existing = await session.execute(
                select(Meeting).where(Meeting.meeting_code == m_data["meeting_code"])
            )
            if existing.scalars().first() is None:
                meeting = Meeting(
                    meeting_code=m_data["meeting_code"],
                    title=m_data["title"],
                    description=m_data["description"],
                    host_id=host.id,
                    host_name=host.name,
                    meeting_type="scheduled",
                    scheduled_at=m_data["scheduled_at"],
                    duration_minutes=m_data["duration_minutes"],
                    passcode=m_data["passcode"],
                    status="scheduled"
                )
                session.add(meeting)
                await session.flush()
                # Add host participant
                p = MeetingParticipant(
                    meeting_id=meeting.id,
                    meeting_code=meeting.meeting_code,
                    user_id=host.id,
                    display_name=f"{host.name} (Host)",
                    role="host",
                    is_muted=False,
                    joined_at=m_data["scheduled_at"]
                )
                session.add(p)
                print(f"  + Added upcoming: {meeting.title} ({meeting.meeting_code})")
            else:
                print(f"  - Upcoming meeting already exists: {m_data['title']}")

        await session.commit()

        # 3. Recent / Ended Meetings (3-5 meetings with 2-6 participants each)
        recent_seeds = [
            {
                "meeting_code": "501 2948 1029",
                "title": "Weekly Engineering All-Hands",
                "description": "Cross-team engineering updates, platform metrics, and announcements.",
                "started_at": now - timedelta(days=1, hours=3),
                "ended_at": now - timedelta(days=1, hours=2, minutes=15),
                "duration_minutes": 45,
                "participants": [
                    ("Alex Rivera", "host"),
                    ("Sarah Chen", "attendee"),
                    ("Marcus Vance", "attendee"),
                    ("Elena Rostova", "attendee"),
                    ("David Kim", "attendee")
                ]
            },
            {
                "meeting_code": "491 0293 8471",
                "title": "Product Roadmap & Q4 Alignment",
                "description": "Reviewing feature priority matrix with executive stakeholders.",
                "started_at": now - timedelta(days=2, hours=5),
                "ended_at": now - timedelta(days=2, hours=4),
                "duration_minutes": 60,
                "participants": [
                    ("Alex Rivera", "host"),
                    ("Priya Patel", "attendee"),
                    ("Jordan Miller", "attendee"),
                    ("Sarah Chen", "attendee")
                ]
            },
            {
                "meeting_code": "382 9104 7291",
                "title": "Frontend Performance & Core Web Vitals",
                "description": "Auditing Next.js bundle metrics, SSR hydration, and layout shifts.",
                "started_at": now - timedelta(days=3, hours=6),
                "ended_at": now - timedelta(days=3, hours=5, minutes=30),
                "duration_minutes": 30,
                "participants": [
                    ("Alex Rivera", "host"),
                    ("Marcus Vance", "attendee"),
                    ("David Kim", "attendee")
                ]
            },
            {
                "meeting_code": "291 0482 9183",
                "title": "Client Onboarding & Live Demo",
                "description": "Product walk-through and interactive Q&A demo session.",
                "started_at": now - timedelta(days=4, hours=4),
                "ended_at": now - timedelta(days=4, hours=3, minutes=15),
                "duration_minutes": 45,
                "participants": [
                    ("Alex Rivera", "host"),
                    ("Elena Rostova", "attendee"),
                    ("Jordan Miller", "attendee")
                ]
            }
        ]

        print("\n[seed] Seeding recent/ended meetings with participants...")
        for r_data in recent_seeds:
            existing = await session.execute(
                select(Meeting).where(Meeting.meeting_code == r_data["meeting_code"])
            )
            if existing.scalars().first() is None:
                meeting = Meeting(
                    meeting_code=r_data["meeting_code"],
                    title=r_data["title"],
                    description=r_data["description"],
                    host_id=host.id,
                    host_name=host.name,
                    meeting_type="scheduled",
                    started_at=r_data["started_at"],
                    ended_at=r_data["ended_at"],
                    duration_minutes=r_data["duration_minutes"],
                    status="ended"
                )
                session.add(meeting)
                await session.flush()

                for name, role in r_data["participants"]:
                    p = MeetingParticipant(
                        meeting_id=meeting.id,
                        meeting_code=meeting.meeting_code,
                        display_name=name,
                        role=role,
                        is_muted=(role != "host"),
                        joined_at=r_data["started_at"],
                        left_at=r_data["ended_at"]
                    )
                    session.add(p)
                print(f"  + Added recent meeting: {meeting.title} with {len(r_data['participants'])} participants")
            else:
                print(f"  - Recent meeting already exists: {r_data['title']}")

        await session.commit()
        print("\n[seed] Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
