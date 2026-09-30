# Zoom Clone

A production-grade, pixel-faithful video conferencing web application cloning the core Zoom web app. Built with an authentic Zoom Workplace dashboard, instant meeting generation, comprehensive pre-join audio/video preview room, browser-native WebRTC conferencing, live in-meeting chat, host moderation controls, and meeting scheduling powered by a normalized relational database schema.

---

## Live Demo

- **Production Live App:** `https://zoomclone.vercel.app` *(or deployed Render/Railway link)*
- **Interactive Swagger REST API Docs:** `http://localhost:8000/docs`

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router, Single Page Application architecture, React 19, TypeScript)
- **Backend:** Python 3.11+ / 3.12 with FastAPI (high-concurrency async ASGI REST API + WebSocket signaling server)
- **Database:** SQLite with SQLAlchemy ORM (WAL mode with `PRAGMA busy_timeout=5000` for concurrent read/write throughput)
- **Real-Time Communication:** Native WebRTC Mesh (direct P2P media streaming via Google STUN `stun:stun.l.google.com:19302`) + WebSocket real-time signaling hub
- **UI / Styling:** Custom Zoom Design Tokens (Vanilla CSS variables), Lucide React iconography, authentic Zoom blue (`#0B5CFF`), and responsive desktop/tablet/mobile layouts

---

## Features

### Core Features Implemented (Must-Have)

1. **Landing Dashboard (`/`):**
   - Clean, professional Zoom Workplace desktop UI matching brand typography, colors, and layout.
   - Header navigation bar with user profile, presence indicator, and settings modal placeholders.
   - Primary action buttons: **New Meeting** (signature Zoom orange), **Join Meeting** (signature Zoom blue), and **Schedule Meeting**.
   - **Upcoming Meetings:** Dynamically loaded from SQLite via FastAPI with start times, topics, formatted Meeting IDs, and one-click actions.
   - **Recent Meetings:** Chronological history of past or active meetings with participant rosters.

2. **Instant Meeting Creation:**
   - One-click instant meeting generation creating a row in SQLite with unique 10–11 digit numeric code.
   - Automatically builds shareable invite link and copies it to clipboard.
   - Redirects host immediately into the meeting room.

3. **Join Meeting Flow (`/join` & Join Modal):**
   - Accepts either a 9–11 digit numeric Meeting ID or a full invite link.
   - Requires display name, persisting preference to local storage.
   - Pre-validates existence against FastAPI before admitting participants.
   - Clear error states: shows friendly message for invalid IDs (404) and ended meetings (410: "This meeting has ended").
   - Blocks the Join button until a valid meeting code and name are supplied.

4. **Meeting Scheduling (`/schedule` & Schedule Modal):**
   - Topic and description fields.
   - Date and time pickers with validation rejecting past dates.
   - Duration selector with validation enforcing duration > 0.
   - Automatic passcode generation and shareable invite link creation.
   - Persists to database and immediately updates the Upcoming Meetings list without requiring a page reload.

5. **Meeting Room (`/meeting/[id]`):**
   - Displays meeting title, 10-digit formatted Meeting ID (`### ### ####`), and invite link.
   - Authentic Zoom bottom toolbar dock: Mute/Unmute Mic, Start/Stop Video, Participants Drawer, In-Meeting Chat, Share Screen, and Leave / End Meeting.
   - Active Participants Panel listing all room members with real-time audio/video indicators and `(Host)` / `(Me)` badges.
   - Local camera preview using `navigator.mediaDevices.getUserMedia` with mirrored preview and live audio volume activity meter.
   - WebRTC P2P multi-peer video grid supporting Gallery Grid and Speaker View with active speaker voice detection.

### Bonus Features Implemented

- **Zoom Copy Invitation Modal:** Authentic modal displaying formatted invitation text (Host name, Topic, Date/Time, Join URL, Meeting ID, and Passcode) with a 1-click clipboard copy button.
- **Host Moderation Controls:** Host can trigger **Mute All** to globally silence attendee participants, and **Remove Participant** to eject disruptive users with instant redirect notifications.
- **Screen Sharing:** Captures display output via `getDisplayMedia` and hot-swaps video tracks with active peers via `replaceTrack` without renegotiation.
- **Editing & Deleting Scheduled Meetings:** Hosts can delete or cancel scheduled meetings from the dashboard with instant cascade cleanup.
- **Responsive Layout:** Adaptive layouts tested across desktop, tablet, and mobile breakpoints.

---

## Database Schema

### Entity-Relationship Diagram

```
+------------------------------------+
|               users                |
+------------------------------------+
| id (INTEGER, PK)                   |<--------+
| name (TEXT, NOT NULL)              |         |
| email (TEXT, UNIQUE, NOT NULL)     |         |
| avatar_url (TEXT, NULLABLE)        |         |
| created_at (DATETIME, DEFAULT NOW) |         |
+------------------------------------+         |
                  |                            |
                  | 1:N (hosts)                | 1:N (optional for guests)
                  v                            |
+------------------------------------+         |
|              meetings              |         |
+------------------------------------+         |
| id (INTEGER, PK internal)          |         |
| meeting_code (TEXT, UNIQUE, INDEX) |<----+   |
| title (TEXT, NOT NULL)             |     |   |
| description (TEXT, NULLABLE)       |     |   |
| host_id (INTEGER, FK -> users.id)  |     |   |
| meeting_type (TEXT: instant/sched) |     |   |
| scheduled_at (DATETIME, INDEX)     |     |   |
| duration_minutes (INTEGER, > 0)    |     |   |
| passcode (TEXT, NULLABLE)          |     |   |
| status (TEXT: sched/live/ended)    |     |   |
| started_at (DATETIME, NULLABLE)    |     |   |
| ended_at (DATETIME, NULLABLE)      |     |   |
| created_at (DATETIME, DEFAULT NOW) |     |   |
| updated_at (DATETIME, DEFAULT NOW) |     |   |
+------------------------------------+     |   |
                  |                        |   |
                  | 1:N (CASCADE)          |   |
                  v                        |   |
+------------------------------------+     |   |
|            participants            |     |   |
+------------------------------------+     |   |
| id (INTEGER, PK)                   |     |   |
| meeting_id (INTEGER, FK meetings)  |     |   |
| meeting_code (TEXT, INDEX)         |-----+   |
| user_id (INTEGER, FK users, NULL)  |---------+
| display_name (TEXT, NOT NULL)      |
| role (TEXT: host / attendee)       |
| is_muted (BOOLEAN, DEFAULT FALSE)  |
| joined_at (DATETIME, DEFAULT NOW)  |
| left_at (DATETIME, NULLABLE)       |
+------------------------------------+
```

### Reasoning Behind Key Database Design Decisions

1. **Instant vs. Scheduled Meetings:**
   - *Design Choice:* Single unified `meetings` table with nullable `scheduled_at` and a `meeting_type` column (`'instant' | 'scheduled'`).
   - *Rationale:* Eliminates schema duplication across instant and scheduled conferences. Both types share 90% of attributes (topic, host, participants, passcode, status, timestamps). A single table simplifies foreign key references from participants and chat logs while optimizing query indexing.

2. **Internal ID vs. Public Meeting Code:**
   - *Design Choice:* Keep an auto-incrementing integer `id` as internal primary key and a separate unique, indexed `meeting_code` string (`### ### ####`).
   - *Rationale:* Exposing incremental database primary keys in public URLs leaks platform metrics and invites enumeration attacks. A public Zoom-style numeric code provides clean, human-readable meeting identifiers while database joins retain the performance of integer primary keys.

3. **Invite Link Storage vs. Dynamic Generation:**
   - *Design Choice:* Derive invite URLs at request time from `meeting_code` (`${BASE_URL}/join?meetingId=${code}`) rather than hardcoding static URLs in SQLite.
   - *Rationale:* Storing absolute URLs hardcodes deployment domains. If domain names, protocols (HTTP vs HTTPS), or ports change during deployment, database links become stale. Request-time generation guarantees links always match the active host domain.

4. **Upcoming vs. Recent Meeting Queries:**
   - *Upcoming Meetings:* Defined by `status = 'scheduled' AND scheduled_at >= now` ordered by `scheduled_at ASC`.
   - *Recent Meetings:* Defined by `status IN ('ended', 'completed', 'active')` ordered by `coalesce(ended_at, created_at) DESC LIMIT 10`.

5. **Indexes:**
   - Indexed on `meetings.meeting_code` for O(1) room lookup during join flows.
   - Indexed on `meetings.scheduled_at` for rapid sorting of upcoming meetings.
   - Indexed on `participants.meeting_id` with `ON DELETE CASCADE` for fast participant retrieval and clean foreign key cleanup.

---

## API Endpoints

All endpoints are hosted under `/api` on the FastAPI backend:

| Method | Endpoint | Purpose | Request Body / Query |
|---|---|---|---|
| `GET` | `/api/me` | Fetch default logged-in user profile | None |
| `POST` | `/api/meetings/instant` | Create an instant meeting with 10-digit code & invite link | `{"title": "...", "host_name": "..."}` |
| `POST` | `/api/meetings/schedule` | Create scheduled meeting (validates future date & duration > 0) | `{"title": "...", "scheduled_at": "...", "duration_minutes": 30}` |
| `GET` | `/api/meetings?type=upcoming` | List scheduled upcoming meetings for dashboard | Query: `type=upcoming` |
| `GET` | `/api/meetings?type=recent` | List past/ended and active meetings for dashboard | Query: `type=recent` |
| `GET` | `/api/meetings/{code}` | Get meeting details (returns 404 if missing, 410 if ended) | Path param: `code` |
| `POST` | `/api/meetings/{code}/join` | Add participant with display name | `{"display_name": "..."}` |
| `POST` | `/api/meetings/{code}/leave` | Mark participant as left | Query: `participant_id` or `display_name` |
| `POST` | `/api/meetings/{code}/end` | Host ends meeting (`status = ended`, `ended_at = now`) | Path param: `code` |
| `GET` | `/api/meetings/{code}/participants` | List current active participants from database | Path param: `code` |
| `POST` | `/api/meetings/{code}/mute-all` | Bonus: Host moderation mute all attendee participants | Path param: `code` |
| `DELETE` | `/api/meetings/{code}/participants/{id}` | Bonus: Host removes participant | Path params: `code`, `id` |
| `DELETE` | `/api/meetings/{code}` | Bonus: Delete or cancel a scheduled meeting | Path param: `code` |
| `PATCH` | `/api/meetings/{code}` | Bonus: Edit a scheduled meeting topic or duration | `{"title": "...", "duration_minutes": ...}` |
| `WS` | `/ws/meeting/{code}` | WebSocket signaling for WebRTC SDP, ICE trickle, and chat | Query: `peer_id`, `name`, `is_host` |

---

## Local Setup

### Prerequisites

- **Python:** 3.10+ (Python 3.12 recommended)
- **Node.js:** 18+ (Node 20 recommended)
- **npm** or **yarn**

---

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI development server
python run.py
```

FastAPI server runs on `http://localhost:8000`.  
Swagger documentation available at `http://localhost:8000/docs`.

---

### Step 2: Seeding the Database

Populate realistic sample data (default host, 4 upcoming meetings, and 4 ended meetings with participants) using the idempotent seed script:

```bash
# From project root or backend folder:
python backend/seed.py
```

*Note: Running `python backend/seed.py` multiple times is safe and will not produce duplicate records.*

---

### Step 3: Frontend Setup

In a separate terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

Next.js application runs at `http://localhost:3000`.

---

### Automated Backend Tests

Run the full Pytest test suite covering database transactions, REST endpoints, host moderation, and WebSockets:

```bash
pytest -v
```

---

## Environment Variables

### Backend (`backend/.env` or root `.env`)

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./zoom_clone.db` | SQLite async database connection URL |
| `FRONTEND_BASE_URL` | `http://localhost:3000` | Canonical origin for generating meeting invite URLs |
| `APP_NAME` | `Zoom Clone API` | Name displayed in OpenAPI documentation |

### Frontend (`frontend/.env.local`)

| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of FastAPI REST & WebSocket endpoints |

---

## Assumptions

1. **Default Authenticated Host:** In accordance with prompt specifications, user authentication is optional. The application defaults to user "Alex Rivera" (`alex.rivera@zoomclone.local`, User ID 1) as the host creator of instant and scheduled meetings.
2. **Guest Join Capability:** Guests can join conferences without an account simply by supplying a display name. Guest entries store `user_id = NULL` on the `participants` table.
3. **WebRTC STUN Signaling:** Peer-to-peer audio and video negotiate using Google's public STUN servers (`stun:stun.l.google.com:19302`), requiring no external TURN infrastructure for standard NAT environments.
4. **Timezone Standardization:** Dates and times are handled in ISO 8601 strings and persisted without skew for seamless calendar representation across local browser timezones.

---

## Known Limitations / Future Improvements

1. **TURN Server Fallback:** The current deployment relies on STUN for NAT traversal. In strict corporate symmetric NAT firewalls, implementing a self-hosted Coturn or Twilio Network Traversal Service would ensure 100% peer connectivity.
2. **Selective Forwarding Unit (SFU):** The application uses a full-mesh WebRTC topology, optimal for 2–6 participants. For enterprise calls with 20+ participants, migrating signaling to an SFU (such as LiveKit or Mediasoup) would conserve client bandwidth.
3. **Persistent User Accounts:** Adding JWT / OAuth authentication (Google or GitHub sign-in) would enable multi-tenant host accounts and personal meeting room customization.
4. **Cloud Recording:** Storing meeting audio/video streams on Amazon S3 or Cloudflare R2 for on-demand playback.

---

## License

MIT License.
