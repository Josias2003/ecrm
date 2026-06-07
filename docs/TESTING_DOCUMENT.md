# ECRM — System Testing & Validation Document
## Education Community Resource Mapping · Rwanda

---

## HOW TO RUN THE SYSTEM

### Step 1 — Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m app.seeds.seed          # Seeds DB with 35 schools, 2000+ teachers, 150+ feedback
uvicorn app.main:app --reload --port 8000
```
API: http://localhost:8000  
Swagger: http://localhost:8000/api/docs

### Step 2 — Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173 (landing page at `/`, not `/login`)

---

## TEST ACCOUNTS

| Role             | Email                         | Password      |
|------------------|-------------------------------|---------------|
| System Admin     | admin@reb.rw                  | Admin@1234    |
| REB Officer      | uwase@mineduc.gov.rw          | Reb@1234      |
| District Officer | eric@gasabo.gov.rw            | District@1    |
| School Head      | paul@school.rw                | School@1234   |
| Field Enumerator | rose@reb.rw                   | Field@1234    |
| Community Member | david@gmail.com               | Comm@1234     |

---

## FUNCTIONAL REQUIREMENTS BY ROLE

### System Administrator
| ID | Requirement |
|----|-------------|
| ADM-01 | View system health dashboard (API status, active users, recent audit logs) |
| ADM-02 | Create, update, and deactivate user accounts |
| ADM-03 | View audit logs (login, export, CRUD actions) |
| ADM-04 | **Cannot** access operational schools, teachers, feedback, GIS, or chat |
| ADM-05 | Sign out returns to landing page |

### REB Officer
| ID | Requirement |
|----|-------------|
| REB-01 | View national dashboard with analytics and enrollment trends |
| REB-02 | View all schools and teachers (**read-only** — no edit/delete) |
| REB-03 | View **only forwarded** feedback and alerts from districts |
| REB-04 | Access National GIS map |
| REB-05 | Generate role-scoped **PDF reports** with executive insights |
| REB-06 | Team chat: category rooms (no per-school staff rooms), create groups, reply to messages |
| REB-07 | Forward/reopen resolved feedback and alerts (when applicable) |
| REB-08 | Message district officers, school heads, enumerators via direct chat |

### District Officer
| ID | Requirement |
|----|-------------|
| DIS-01 | View district dashboard scoped to assigned district (e.g. Gasabo) |
| DIS-02 | Full CRUD on schools and teachers within district |
| DIS-03 | Review feedback via **thread/chat** per issue; forward to REB; reopen closed items |
| DIS-04 | Resolve, forward, and reopen resource alerts |
| DIS-05 | District GIS map locked to own district |
| DIS-06 | Default headmasters group room + direct individual chat |
| DIS-07 | Create custom chat groups with member presets |
| DIS-08 | PDF reports scoped to district data |

### School Head
| ID | Requirement |
|----|-------------|
| SCH-01 | Dashboard for own school (inventory, facilities, teachers, enrollment — no emojis) |
| SCH-02 | Edit own school profile with **Use My Location** GPS or manual coordinates |
| SCH-03 | Manage teachers for own school only |
| SCH-04 | Submit and track issues via feedback threads (**My Issues**) |
| SCH-05 | View alerts for own school |
| SCH-06 | **No** GIS map in navigation |
| SCH-07 | School edit modal can be closed after save (does not auto-reopen) |
| SCH-08 | Scoped PDF reports for own school |

### Field Enumerator
| ID | Requirement |
|----|-------------|
| ENUM-01 | Register and edit schools in assigned district with GPS |
| ENUM-02 | Field map for GPS verification |
| ENUM-03 | **Cannot** manage teachers or operational feedback |
| ENUM-04 | PDF reports: schools summary and GPS coverage |

### Community Member
| ID | Requirement |
|----|-------------|
| COM-01 | Submit feedback reports for schools in area |
| COM-02 | Track own submitted issues and thread replies |
| COM-03 | View school map (read-only) |
| COM-04 | PDF report: own feedback submissions only |
| COM-05 | **Cannot** access admin, analytics, teachers, or chat |

---

## IMPLEMENTED FEATURES BY ROLE (Use Case Diagram)

Mapped to the project requirements and UML use cases.

| Use case (diagram) | REB | District | School Head | Community | Also in system |
|--------------------|:---:|:--------:|:-----------:|:---------:|:--------------:|
| Login to System | ✅ | ✅ | ✅ | ✅ | Admin, Enumerator |
| View Dashboard | ✅ | ✅ | ✅ | — | All roles |
| Register & Map School (GPS) | View | ✅ | Edit own | — | Enumerator |
| Manage Resource Inventory | View | ✅ | ✅ own school | — | Auto gap alerts |
| Manage Teachers & Staff | View | ✅ | ✅ own school | — | Workload analysis |
| Submit Updates | — | — | ✅ | — | School form + GPS |
| Analyze Resource Gaps | ✅ | ✅ | — | — | Analytics + risk scores |
| Generate Reports | ✅ PDF | ✅ PDF | ✅ PDF | ✅ PDF | Live preview |
| Submit Community Feedback | — | Review | ✅ submit | ✅ | Issue threads |
| Team Chat | ✅ | ✅ | Limited | — | Reply-to-message |

**Pagination:** Schools, Teachers, Feedback, and Alerts lists show **20 records per page** with Previous/Next controls (no long scroll through 300+ rows).

---

## MODULE 0 — LANDING PAGE & SIGN IN

#### TC-000: Landing Page Loads at Root
- **Steps:** Navigate to http://localhost:5173/
- **Expected:** Landing page (not login route) with gradient background, **visible aesthetic squares**, hero, stats, features, and sign-in CTA
- **Pass:** URL stays `/`; no redirect to `/login`

#### TC-001: Sign In Modal
- **Steps:** Click **Sign In** or **Get Started** on landing page
- **Expected:** Modal opens with role tiles, email/password, forgot password link
- **Pass:** Modal closes on X or after successful login; redirects to `/dashboard`

#### TC-002: Successful Login
- **Steps:** Open sign-in modal → select REB role tile → Sign In
- **Expected:** Redirected to dashboard; `ecrm_token` in localStorage
- **Pass:** GET /api/auth/me returns user

#### TC-003: Invalid Credentials
- **Steps:** Enter wrong email/password in modal
- **Expected:** Error toast; modal stays open; no token stored

#### TC-004: Forgot Password (OTP)
- **Steps:** Click Forgot password → enter email → receive demo OTP in toast → reset password
- **Expected:** Can sign in with new password
- **Pass:** POST /api/auth/reset-password returns success

#### TC-005: JWT Persistence & Sign Out
- **Steps:** Login → refresh page → sign out from sidebar
- **Expected:** Stays logged in on refresh; sign out returns to **landing page** `/`

#### TC-006: /login Redirect
- **Steps:** Navigate to http://localhost:5173/login
- **Expected:** Redirects to `/` landing page

---

## MODULE 1 — GIS MAP

#### TC-010: Map Loads with School Pins
- Login as REB → National GIS
- **Expected:** Leaflet map with colour-coded clustered pins

#### TC-011: GPS Capture & Verification
- Enumerator: edit school → Use My Location; GIS: Verify GPS on site

#### TC-012: District Map Restriction
- District officer: map locked to own district only

#### TC-013: GeoJSON Export
- Export valid FeatureCollection from GIS page

---

## MODULE 2 — SCHOOL MANAGEMENT

#### TC-020: List & Filter Schools
- REB: all schools (view only); District: district scope; School head: one school

#### TC-021: Register School (District/Enumerator)
- Full form with validation; GPS optional via location button

#### TC-022: Edit School
- District edits any in district; School head edits own school only
- **Pass:** Modal closes after Cancel/Save; does not trap user

#### TC-023: Auto Status & Alerts
- Low resources trigger automatic alerts on create/update

#### TC-024: School Detail Modal
- View shows Lucide icons (no emojis), facility badges, GPS

#### TC-025: CSV Export
- District/REB: export schools CSV

---

## MODULE 3 — TEACHERS

#### TC-030: Teacher Roster
- Filter by school and status; workload panel for P:T > 1:50

#### TC-031: CRUD Teachers
- District and school head can add/edit; REB view-only

#### TC-032: Qualification Chart
- Pie chart matches database counts

---

## MODULE 4 — FEEDBACK & ISSUES

#### TC-040: Submit Issue (Community/School)
- Min 12 char description; appears as pending

#### TC-041: Issue Thread (Chat-style)
- Open issue → message thread between reporter and district
- District: Mark Reviewed, Resolve, Close, Forward to REB, Reopen

#### TC-042: REB Forwarded Only
- REB sees only `forwarded_to_reb=true` items

#### TC-043: Closed Status
- Close requires note (min 12 chars); distinct from resolved

---

## MODULE 5 — RESOURCE ALERTS

#### TC-050: Alert List by Role
- Human-readable types (no underscores); school name column

#### TC-051: Resolve / Forward / Reopen
- District resolves and forwards; reopen accidental resolutions

#### TC-052: Sidebar Badge
- Active alert count on nav for reb/district/school

---

## MODULE 6 — REPORTS (PDF)

#### TC-060: Report Types from API
- No hardcoded frontend list; types from GET /api/reports/types

#### TC-061: Live Preview
- Select report + period → preview loads automatically with KPIs and insights table

#### TC-062: Download PDF
- PDF includes branded header, KPIs, executive insights, data table
- **Pass:** Only PDF format supported (no CSV/JSON on reports page)

#### TC-063: Role-Scoped Reports
- School head: own school; REB alerts: forwarded only; Community: feedback only

---

## MODULE 7 — TEAM CHAT

#### TC-070: Rooms by Category
- National, By role, District head masters, District teams, Other groups, Direct
- REB does **not** see per-school "GS … Staff" rooms

#### TC-071: Reply to Message
- Click Reply on a message → quoted context → send threaded reply

#### TC-072: Create Group (REB/District)
- Preset dropdown: All Head Masters, Head Masters — Gasabo, etc.

#### TC-073: Live Search
- Search bar filters rooms, contacts, and messages

#### TC-074: Direct Messages
- Message someone from contacts list

---

## MODULE 8 — ANALYTICS

#### TC-080: National Stats (REB)
- GET /api/analytics/national returns 200

#### TC-081: District Comparison & Trends
- Charts match API data

#### TC-082: Risk Scores
- Intervention priority table with risk_score 0–100

---

## MODULE 9 — USER MANAGEMENT (Admin)

#### TC-090: CRUD Users
- Create district user, deactivate account

#### TC-091: Non-Admin Blocked
- Community token on GET /api/users → 403

---

## MODULE 10 — ROLE-BASED ACCESS CONTROL

#### TC-100: District Isolation
- All queries filtered to district

#### TC-101: School Head Isolation
- school_id filter on teachers, feedback, alerts, enrollment

#### TC-102: REB Read-Only Schools/Teachers
- No Edit/Delete buttons in UI; API rejects mutations

#### TC-103: API Role Guard
- Wrong role on protected endpoint → 403

---

## MODULE 11 — API SMOKE TESTS

```
GET  /api/health
POST /api/auth/login
GET  /api/schools/
GET  /api/alerts/?resolved=false
GET  /api/analytics/national        (REB token)
GET  /api/reports/types
GET  /api/reports/preview?type=schools_summary&from_date=2026-06-01&to_date=2026-06-07
GET  /api/reports/export?type=schools_summary&format=pdf
GET  /api/chat/presets              (REB token)
```

**API note:** All list and create endpoints use trailing slash (`/api/schools/`, `/api/teachers/`) — required for FastAPI with `redirect_slashes=False`.

---

## SEEDED DATA SUMMARY

| Entity             | Count  | Notes                                    |
|--------------------|--------|------------------------------------------|
| Schools            | 390    | 30 districts × ~13 public schools each   |
| Teachers           | ~6,000 | Proportional to school enrollment        |
| Feedback           | ~430   | Includes thread messages after use       |
| Resource Alerts    | ~590   | Auto-generated from resource levels      |
| Enrollment History | 1,560  | 4 years × 390 schools                    |
| Chat Rooms         | 90+    | National, 30 district teams, headmasters |
| Users              | 8      | All 6 roles represented                  |

---

## IMPLEMENTED FEATURES (Current)

| Feature | Status |
|---------|--------|
| Landing page at `/` with aesthetic squares | ✅ |
| Sign-in modal (not full-page login) | ✅ |
| OTP password reset | ✅ |
| GIS + GPS capture | ✅ |
| Feedback issue threads + forward/reopen | ✅ |
| PDF decision reports | ✅ |
| Chat categories + reply-to-message | ✅ |
| REB read-only schools/teachers | ✅ |
| School head geolocation on form | ✅ |
| Role-based nav and API guards | ✅ |

---

## KNOWN LIMITATIONS

1. **Offline sync** — Online only; no IndexedDB queue
2. **SMS notifications** — Not integrated
3. **Real-time push** — Polling/refetch intervals; no WebSockets
4. **Multi-language** — English only
5. **PWA** — Works in mobile browser; no install manifest

---

## MARKING CRITERIA COVERAGE

| Criterion | Evidence |
|-----------|----------|
| GIS Mapping with GPS | Leaflet, capture, verify, GeoJSON |
| Role-based access control | 6 roles, backend + frontend |
| School data collection | CRUD, 20+ fields, auto-status |
| Teacher workload | Workload analysis endpoint |
| Resource gap alerts | Auto-alerts on create/update |
| Community feedback | Threads, forward, reopen, closed |
| PDF reports | ReportLab, insights, role scope |
| Team collaboration | Chat rooms, presets, replies |
| Professional UI | Landing, dashboard, Lucide icons |
| Audit logging | All major actions logged |
