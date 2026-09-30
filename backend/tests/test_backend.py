import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from starlette.testclient import TestClient
try:
    from app.main import app
    from app.database import init_db
except ImportError:
    from backend.app.main import app
    from backend.app.database import init_db

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Ensure database schema is created before tests run."""
    await init_db()

@pytest.mark.asyncio
async def test_health_and_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "healthy"}

        root_res = await client.get("/")
        assert root_res.status_code == 200
        data = root_res.json()
        assert data["status"] == "online"
        assert "docs_url" in data

@pytest.mark.asyncio
async def test_upcoming_and_recent_meetings():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Schedule a meeting to verify upcoming list
        start_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        sched_res = await client.post("/api/meetings/schedule", json={
            "title": "Upcoming Sprint Review",
            "scheduled_at": start_time,
            "duration_minutes": 30
        })
        assert sched_res.status_code == 201
        sched_data = sched_res.json()

        # Check upcoming meetings endpoint
        res = await client.get("/api/meetings/upcoming")
        assert res.status_code == 200
        upcoming = res.json()
        assert len(upcoming) >= 1
        meeting_ids = [m["meeting_id"] for m in upcoming]
        assert sched_data["meeting_id"] in meeting_ids
        for m in upcoming:
            assert m["status"] == "scheduled"
            assert "invite_url" in m

        # 2. Create an instant meeting to verify recent list
        inst_res = await client.post("/api/meetings/instant", json={
            "title": "Ad-hoc Sync",
            "host_name": "Test Host"
        })
        assert inst_res.status_code == 201
        inst_data = inst_res.json()

        # Check recent meetings endpoint
        recent_res = await client.get("/api/meetings/recent")
        assert recent_res.status_code == 200
        recent = recent_res.json()
        assert len(recent) >= 1
        recent_ids = [m["meeting_id"] for m in recent]
        assert inst_data["meeting_id"] in recent_ids
        for m in recent:
            assert m["status"] in ("completed", "active", "ended", "live")

@pytest.mark.asyncio
async def test_create_instant_meeting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"title": "Ad-hoc Review", "host_name": "Test Host"}
        res = await client.post("/api/meetings/instant", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Ad-hoc Review"
        assert data["host_name"] == "Test Host"
        assert data["is_instant"] is True
        assert data["status"] == "active"
        # Validate 10-digit meeting ID format: ### ### ####
        meeting_id = data["meeting_id"]
        assert len(meeting_id.replace(" ", "")) == 10
        assert "/meeting/" in data["invite_url"]

@pytest.mark.asyncio
async def test_schedule_meeting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        payload = {
            "title": "Roadmap Q4 Review",
            "description": "Align on upcoming product deliverables",
            "scheduled_at": start_time,
            "duration_minutes": 60,
            "passcode": "secret123"
        }
        res = await client.post("/api/meetings/schedule", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Roadmap Q4 Review"
        assert data["duration_minutes"] == 60
        assert data["is_instant"] is False
        assert data["status"] == "scheduled"
        assert data["passcode"] == "secret123"

@pytest.mark.asyncio
async def test_get_meeting_by_id_and_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Retrieve seeded meeting 849 203 1192
        res = await client.get("/api/meetings/849 203 1192")
        assert res.status_code == 200
        assert res.json()["meeting_id"] == "849 203 1192"

        # Also retrieve with unformatted string: 8492031192
        res_unformatted = await client.get("/api/meetings/8492031192")
        assert res_unformatted.status_code == 200
        assert res_unformatted.json()["meeting_id"] == "849 203 1192"

        # Retrieve invalid meeting ID
        res_404 = await client.get("/api/meetings/9999999999")
        assert res_404.status_code == 404
        assert "not found" in res_404.json()["detail"].lower()

def test_websocket_signaling_full_flow():
    """Verify WebSocket multi-peer discovery, chat broadcast, WebRTC SDP relay, and leave notification."""
    client = TestClient(app)
    meeting_room = "test-signal-room"

    # Client 1 connects as Host
    with client.websocket_connect(f"/ws/meeting/{meeting_room}?peer_id=peer-1&name=Alice&is_host=true") as ws1:
        # 1. Verify Client 1 receives initial room state
        state1 = ws1.receive_json()
        assert state1["type"] == "room-state"
        assert state1["yourPeerId"] == "peer-1"
        assert state1["peers"] == []

        # Client 2 connects as Guest
        with client.websocket_connect(f"/ws/meeting/{meeting_room}?peer_id=peer-2&name=Bob&is_host=false") as ws2:
            # 2. Verify Client 1 is notified that Bob joined
            joined_msg = ws1.receive_json()
            assert joined_msg["type"] == "user-joined"
            assert joined_msg["peerId"] == "peer-2"
            assert joined_msg["name"] == "Bob"

            # 3. Verify Client 2 receives room state containing Alice
            state2 = ws2.receive_json()
            assert state2["type"] == "room-state"
            assert state2["yourPeerId"] == "peer-2"
            assert len(state2["peers"]) == 1
            assert state2["peers"][0]["peerId"] == "peer-1"
            assert state2["peers"][0]["name"] == "Alice"

            # 4. In-meeting Chat broadcast test: Bob sends message
            ws2.send_json({"type": "chat", "text": "Hi Alice!"})
            chat1 = ws1.receive_json()
            assert chat1["type"] == "chat"
            assert chat1["sender"] == "Bob"
            assert chat1["text"] == "Hi Alice!"

            chat2 = ws2.receive_json()
            assert chat2["type"] == "chat"
            assert chat2["sender"] == "Bob"

            # 5. WebRTC Offer relay test: Alice sends SDP offer targeted to Bob
            mock_sdp = {"type": "offer", "target": "peer-2", "sdp": "mock-sdp-offer-content"}
            ws1.send_json(mock_sdp)
            offer_received = ws2.receive_json()
            assert offer_received["type"] == "offer"
            assert offer_received["sender"] == "peer-1"
            assert offer_received["sdp"] == "mock-sdp-offer-content"

            # 6. WebRTC Answer relay test: Bob sends SDP answer targeted to Alice
            mock_answer = {"type": "answer", "target": "peer-1", "sdp": "mock-sdp-answer-content"}
            ws2.send_json(mock_answer)
            answer_received = ws1.receive_json()
            assert answer_received["type"] == "answer"
            assert answer_received["sender"] == "peer-2"
            assert answer_received["sdp"] == "mock-sdp-answer-content"

            # 7. ICE Candidate relay test: Alice sends ICE candidate targeted to Bob
            mock_ice = {
                "type": "ice-candidate",
                "target": "peer-2",
                "candidate": {"candidate": "candidate:1 1 UDP ...", "sdpMid": "0"}
            }
            ws1.send_json(mock_ice)
            ice_received = ws2.receive_json()
            assert ice_received["type"] == "ice-candidate"
            assert ice_received["sender"] == "peer-1"
            assert "candidate" in ice_received["candidate"]

        # 8. Client 2 disconnected: Verify Client 1 receives user-left notification
        left_msg = ws1.receive_json()
        assert left_msg["type"] == "user-left"
        assert left_msg["peerId"] == "peer-2"


@pytest.mark.asyncio
async def test_get_me():
    """Verify GET /api/me returns default logged-in user profile."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/me")
        assert res.status_code == 200
        user = res.json()
        assert user["id"] == 1
        assert user["name"] == "Alex Rivera"
        assert "alex.rivera" in user["email"]


@pytest.mark.asyncio
async def test_meetings_type_query_param():
    """Verify GET /api/meetings?type=upcoming and ?type=recent."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upcoming
        up_res = await client.get("/api/meetings?type=upcoming")
        assert up_res.status_code == 200
        upcoming = up_res.json()
        assert isinstance(upcoming, list)
        for m in upcoming:
            assert m["status"] == "scheduled"

        # Recent
        rec_res = await client.get("/api/meetings?type=recent")
        assert rec_res.status_code == 200
        recent = rec_res.json()
        assert isinstance(recent, list)


@pytest.mark.asyncio
async def test_schedule_validation_rejections():
    """Verify schedule endpoint rejects past dates and duration <= 0."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Past date rejection
        past_time = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        res_past = await client.post("/api/meetings/schedule", json={
            "title": "Past Meeting",
            "scheduled_at": past_time,
            "duration_minutes": 30
        })
        assert res_past.status_code == 400
        assert "past" in res_past.json()["detail"].lower()

        # 2. Duration zero/negative rejection
        future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        res_dur = await client.post("/api/meetings/schedule", json={
            "title": "Zero Duration Meeting",
            "scheduled_at": future_time,
            "duration_minutes": 0
        })
        assert res_dur.status_code in (400, 422)


@pytest.mark.asyncio
async def test_participant_lifecycle_and_ended_410():
    """Verify participant join, participants list, mute-all, leave, end meeting, and 410 on ended."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create instant meeting
        create_res = await client.post("/api/meetings/instant", json={
            "title": "Contract Lifecycle Meeting",
            "host_name": "Host Moderator"
        })
        assert create_res.status_code == 201
        m_data = create_res.json()
        code = m_data["meeting_code"]

        # 2. Add participant via POST /api/meetings/{code}/join
        join_res = await client.post(f"/api/meetings/{code}/join", json={
            "display_name": "Test Attendee"
        })
        assert join_res.status_code == 200
        p_data = join_res.json()
        assert p_data["display_name"] == "Test Attendee"
        assert p_data["role"] == "attendee"
        p_id = p_data["id"]

        # 3. List current participants via GET /api/meetings/{code}/participants
        parts_res = await client.get(f"/api/meetings/{code}/participants")
        assert parts_res.status_code == 200
        parts = parts_res.json()
        names = [p["display_name"] for p in parts]
        assert "Test Attendee" in names

        # 4. Mute all via POST /api/meetings/{code}/mute-all
        mute_res = await client.post(f"/api/meetings/{code}/mute-all")
        assert mute_res.status_code == 200
        assert mute_res.json()["status"] == "muted_all"

        # 5. Remove participant via DELETE /api/meetings/{code}/participants/{id}
        del_res = await client.delete(f"/api/meetings/{code}/participants/{p_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "removed"

        # 6. End meeting via POST /api/meetings/{code}/end
        end_res = await client.post(f"/api/meetings/{code}/end")
        assert end_res.status_code == 200
        assert end_res.json()["status"] == "ended"

        # 7. Accessing ended meeting returns 410 GONE
        ended_get_res = await client.get(f"/api/meetings/{code}")
        assert ended_get_res.status_code == 410
        assert "ended" in ended_get_res.json()["detail"].lower()

