# 🏥 Smart Queue & Token Management System
### Government Hospital — Digital Queue System

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (`mongod`)

### 1. Backend
```bash
cd backend
npm install
npm run seed        # Creates 7 departments + admin user
npm run dev         # Starts on http://localhost:5001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev         # Starts on http://localhost:3000
```

### 3. Open in browser
| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Patient — get token, track queue |
| `http://localhost:3000/admin/login` | Admin login |
| `http://localhost:3000/admin/dashboard` | All departments overview |
| `http://localhost:3000/admin/queue` | Manage queue |

**Default admin login:** `admin@hospital.com` / `admin123`

---

## Architecture

```
hospital-queue-system/
├── backend/   (Node.js + Express + MongoDB)
└── frontend/  (React + Tailwind + Vite)
```

### Priority System
| Priority | Who | Level |
|----------|-----|-------|
| 🚨 Emergency | Admin-inserted critical patients | 3 (highest) |
| 👴 Senior Citizen | Age ≥ 60, auto-detected | 2 |
| 👤 Normal | Everyone else | 1 (default) |

### Real-time Updates
- **WebSocket** (`ws://localhost:5001/ws`) — instant push on any queue change
- **Polling fallback** — every 8s (admin) / 15s (patient) if WS disconnects
- **Auto-reconnect** — exponential backoff (1s → 2s → 4s … max 30s)

### Wait Time Calculation
- Uses **dynamic rolling average** based on actual consultation times today
- Falls back to configured department average if < 3 samples exist
- Formula: `waitTime = currentServeTimeLeft + position × avgConsultationTime`

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Admin login |
| GET | `/api/departments` | — | List departments |
| POST | `/api/tokens/generate` | — | Patient generates token |
| GET | `/api/tokens/:number/status` | — | Check token position |
| GET | `/api/queue/all` | JWT | Dashboard summary |
| GET | `/api/queue/:deptId` | JWT | Full queue |
| POST | `/api/queue/:deptId/next` | JWT | Call next patient |
| POST | `/api/queue/:deptId/emergency` | JWT | Emergency insert |
| POST | `/api/queue/token/:id/skip` | JWT | Skip patient |
| POST | `/api/queue/token/:id/complete` | JWT | Mark complete |

---

## Tech Stack
- **Frontend:** React 18, Tailwind CSS 3, Vite 5, React Router 6
- **Backend:** Node.js, Express 4, Mongoose 8, WebSocket (ws)
- **Database:** MongoDB (tokens reset daily per department)
- **Auth:** JWT (8h expiry)
