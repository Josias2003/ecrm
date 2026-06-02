# ECRM — Education Community Resource Mapping
## Rwanda · Full-Stack Web Application
### Final Year Project — Bachelor of Science in Computer Science

---

## System Overview

ECRM is a GIS-powered web platform for tracking and managing educational resources across
public schools in Kigali, Rwanda. It supports six distinct user roles and provides
real-time geospatial visualisation, resource gap detection, teacher workload analysis,
community feedback collection, and data export capabilities.

---

## Recent Improvements (Security & Performance)

### Security Enhancements ✅
- Hardcoded `SECRET_KEY` replaced with environment variables
- CORS restricted to configured origins (no wildcard)
- Rate limiting added (100 req/min per IP)
- JWT token expiry reduced from 24h to 2h
- IP address tracking in audit logs
- Input validation on all endpoints

### Performance Optimizations ✅
- Pagination on all list endpoints (configurable `skip`/`limit`)
- Database indexes on frequently queried fields (district, status, gps_verified)
- Split monolithic `routes.py` into modular feature files (6 modules)
- Enum-based status comparisons (no string literals)
- Optimized GIS summary query (dynamic district grouping)

### Code Quality ✅
- Modular route structure for maintainability
- Centralized API configuration (frontend)
- Request/response interceptors with error handling
- Comprehensive environment variable templates
- IP tracking in all audit log entries
- Windows-compatible seed script output (ASCII-only)
- GIS marker clustering for large datasets
- Intervention priority scoring (`/api/analytics/risk-scores`)

---

## Technology Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Backend    | Python 3.10+ · FastAPI · SQLAlchemy ORM             |
| Database   | SQLite (local) — upgradeable to PostgreSQL          |
| Auth       | JWT (python-jose) · bcrypt password hashing         |
| Frontend   | React 18 · Vite · React Router v6                  |
| State      | Zustand · TanStack React Query                      |
| GIS Maps   | Leaflet.js · OpenStreetMap · react-leaflet          |
| GIS UX     | leaflet.markercluster (automatic clustering)        |
| Charts     | Recharts (bar, line, pie, donut)                   |
| HTTP       | Axios with JWT interceptor + centralized config     |
| Security   | slowapi (rate limiting) · environment-based secrets |

---

## Project Structure

```
ecrm/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Settings (env vars) ⭐ IMPROVED
│   │   │   ├── database.py     # SQLAlchemy engine + session
│   │   │   └── security.py     # JWT + bcrypt + IP tracking ⭐ IMPROVED
│   │   ├── models/
│   │   │   └── models.py       # SQLAlchemy ORM + indexes ⭐ IMPROVED
│   │   ├── routes/
│   │   │   ├── __init__.py     # Router exports ⭐ NEW
│   │   │   ├── auth.py         # Auth + users ⭐ SPLIT
│   │   │   ├── schools.py      # Schools management ⭐ SPLIT
│   │   │   ├── teachers.py     # Teacher management ⭐ SPLIT
│   │   │   ├── feedback.py     # Feedback collection ⭐ SPLIT
│   │   │   ├── alerts.py       # Alert management ⭐ SPLIT
│   │   │   ├── analytics.py    # Analytics endpoints ⭐ SPLIT
│   │   │   └── logs.py         # Logs + enrollment ⭐ SPLIT
│   │   ├── schemas/
│   │   │   └── schemas.py      # Pydantic request/response schemas
│   │   ├── seeds/
│   │   │   └── seed.py         # Database seed script
│   │   └── main.py             # FastAPI entry point ⭐ IMPROVED
│   ├── .env.example            # Environment template ⭐ NEW
│   ├── .env                    # Environment variables
│   └── requirements.txt        # slowapi added ⭐ UPDATED
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js          # Axios client ⭐ IMPROVED
│   │   ├── config.js           # Centralized config ⭐ NEW
│   │   ├── components/
│   │   │   ├── UI.jsx          # Shared design system components
│   │   │   └── GISMap.jsx      # Leaflet GIS map component
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardRouter.jsx
│   │   │   ├── GISMapPage.jsx
│   │   │   └── ...
│   │   ├── store/
│   │   │   └── auth.js         # Zustand auth state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example            # Environment template ⭐ NEW
│   ├── package.json            # react-error-boundary added ⭐ UPDATED
│   ├── index.html
│   └── vite.config.js
├── IMPROVEMENTS.md             # Detailed improvement report ⭐ NEW
├── README.md
└── docs/
    └── TESTING_DOCUMENT.md
```

---

## Setup & Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- Git

### 1. Clone / Extract the project
```bash
cd ecrm
```

### 2. Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# ⭐ IMPORTANT: Generate SECRET_KEY (recommended)
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Copy the output and paste into .env as SECRET_KEY value

# Seed the database (creates ecrm.db with all data)
python -m app.seeds.seed    

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API is now running at **http://localhost:8000**
Swagger docs: **http://localhost:8000/api/docs**

### 3. Frontend Setup (new terminal)
```bash
cd frontend

# Create .env file from template
cp .env.example .env
# Update VITE_API_URL if backend is not on localhost:8000

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The app is now running at **http://localhost:5173**

---

## Environment Variables

### Backend (.env)
```
ENV=development
DATABASE_URL=sqlite:///./ecrm.db
SECRET_KEY=<REQUIRED - generate with: python -c "import secrets; print(secrets.token_urlsafe(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

---

## Demo Login Credentials

| Role             | Email                         | Password      |
|------------------|-------------------------------|---------------|
| System Admin     | admin@reb.rw                  | Admin@1234    |
| REB Officer      | uwase@mineduc.gov.rw          | Reb@1234      |
| District Officer | eric@gasabo.gov.rw            | District@1    |
| School Head      | paul@school.rw                | School@1234   |
| Field Enumerator | rose@reb.rw                   | Field@1234    |
| Community Member | david@gmail.com               | Comm@1234     |

---

## Seeded Data

The seed script generates deterministically (same every run):

| Entity             | Count  |
|--------------------|--------|
| Schools            | 35     |
| Teachers           | ~2,000 |
| Feedback records   | ~150   |
| Resource alerts    | ~200   |
| Enrollment history | 140    |
| Users              | 8      |

---

## API Endpoints Reference

All endpoints support pagination with `skip` and `limit` query parameters (default: skip=0, limit=50).

### Auth
| Method | Path               | Access      | Description          |
|--------|--------------------|-------------|----------------------|
| POST   | /api/auth/login    | Public      | Login, get JWT token |
| GET    | /api/auth/me       | All         | Get current user     |
| POST   | /api/auth/logout   | All         | Logout               |

### Schools
| Method | Path                       | Access              | Description             |
|--------|----------------------------|---------------------|-------------------------|
| GET    | /api/schools               | All                 | List (paginated, role-filtered)    |
| POST   | /api/schools               | Admin/REB/District/Enum | Register school     |
| GET    | /api/schools/{id}          | All                 | Get school detail       |
| PATCH  | /api/schools/{id}          | Admin/District/School | Update school         |
| DELETE | /api/schools/{id}          | Admin               | Delete school           |
| PATCH  | /api/schools/{id}/verify-gps | Admin/District/Enum | Verify GPS            |
| GET    | /api/schools/export/csv    | Admin/REB/District  | Export CSV              |
| GET    | /api/schools/export/geojson| All                 | Export GeoJSON          |

### Teachers
| Method | Path                              | Access       | Description          |
|--------|-----------------------------------|--------------|----------------------|
| GET    | /api/teachers                     | All          | List (paginated)     |
| POST   | /api/teachers                     | Admin+       | Add teacher          |
| PATCH  | /api/teachers/{id}                | Admin+       | Update teacher       |
| DELETE | /api/teachers/{id}                | Admin/Dist/School | Remove teacher  |
| GET    | /api/teachers/workload/analysis   | All          | Workload analysis    |

### Feedback
| Method | Path                 | Access          | Description         |
|--------|----------------------|-----------------|---------------------|
| GET    | /api/feedback        | All             | List (paginated)    |
| POST   | /api/feedback        | All             | Submit report       |
| PATCH  | /api/feedback/{id}   | Admin/REB/Dist  | Review/resolve      |

### Alerts
| Method | Path                     | Access         | Description      |
|--------|--------------------------|----------------|------------------|
| GET    | /api/alerts              | All            | List (paginated) |
| PATCH  | /api/alerts/{id}/resolve | Admin/REB/Dist | Resolve alert    |

### Analytics
| Method | Path                           | Access     | Description              |
|--------|--------------------------------|------------|--------------------------|
| GET    | /api/analytics/national        | Admin/REB  | National statistics      |
| GET    | /api/analytics/districts       | All        | Per-district stats       |
| GET    | /api/analytics/resource-gaps   | All        | Gap analysis             |
| GET    | /api/analytics/enrollment-trends | All      | Year-on-year trends      |
| GET    | /api/analytics/gis-summary     | All        | GIS coverage stats       |
| GET    | /api/analytics/risk-scores     | All        | Intervention priority scoring |

### Users (Admin only)
| Method | Path           | Description       |
|--------|----------------|-------------------|
| GET    | /api/users     | List (paginated)  |
| POST   | /api/users     | Create user       |
| PATCH  | /api/users/{id}| Update user       |
| DELETE | /api/users/{id}| Remove user       |

### Logs (Admin only)
| Method | Path      | Description    |
|--------|-----------|----------------|
| GET    | /api/logs | Get audit logs |

---

## Key Features

### GIS Mapping (Core Feature)
- Real Leaflet.js map with OpenStreetMap tiles
- Colour-coded pins: green=good, amber=moderate, red=critical
- Blue ring on verified GPS coordinates
- Click pin → popup with full school details
- GPS coordinate entry form with browser geolocation capture
- GPS field verification workflow for enumerators
- GeoJSON export for use in QGIS or other GIS tools
- District zone boundary overlays
- Map stats bar (total, by status, verified count)
- Filter by district, status, type, GPS status

### Role-Based Access Control
- 6 distinct roles with different permissions
- Backend enforcement on every API endpoint
- Frontend hides pages/actions not applicable to role
- JWT token with 2-hour expiry (configurable)

### Resource Gap Detection & Alerts
- Auto-computed school status from 8 criteria
- Alerts auto-generated on school create/update
- Alert types: textbook_shortage, desk_shortage, sanitation_gap, teacher_overload, no_water, gps_unverified
- Resolve alerts once action is taken

### Teacher Workload Analysis
- P:T ratio computed per school
- Overloaded schools flagged (P:T > 1:50)
- Teacher gap count (how many more needed)
- Qualification distribution pie chart

### Community Feedback
- Submit reports with school, type, description
- Reporter can remain anonymous
- District officer reviews → resolves
- School head sees feedback about their school

### Data Export
- CSV export for all school records
- GeoJSON export for GIS tools

### Audit & Compliance
- Complete action logging with IP addresses
- User tracking (who, what, when, where)
- Admin dashboard for compliance
- Rate limiting to prevent abuse

---

## Performance Improvements

- **Pagination**: O(1) page retrieval for large datasets
- **Database Indexes**: O(log n) lookups on 7+ indexed columns
- **Query Optimization**: Strategic joins to reduce N+1 queries
- **API Response**: Configurable timeouts (30s default)
- **Frontend Caching**: React Query with 30s stale time

---

## Security Features

- **Authentication**: JWT with 2-hour expiry
- **Authorization**: Role-based access control (RBAC)
- **CORS**: Restricted to configured origins
- **Rate Limiting**: 100 requests per 60 seconds per IP
- **Password Security**: bcrypt with salt
- **Input Validation**: Pydantic schemas on all endpoints
- **Audit Trail**: Complete logging with IP tracking
- **Secrets Management**: No hardcoded credentials

---

## Production Deployment

To deploy in production, update `.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/ecrm_db
SECRET_KEY=<your-generated-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=https://yourdomain.com
```

Build frontend:
```bash
cd frontend && npm run build
```

Serve the `dist/` folder with nginx or from FastAPI as static files.

---

## Future Enhancements

- [ ] Bulk import/export (Excel templates)
- [ ] Email alerts and notifications
- [ ] PDF report generation
- [ ] Data backup and recovery
- [ ] Offline data sync capability
- [ ] SMS alerts for critical issues
- [ ] Mobile app (React Native)
- [ ] Advanced GIS (heatmaps)
- [ ] Predictive analytics
- [ ] Multi-language support (Kinyarwanda)