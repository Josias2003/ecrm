# ECRM — System Testing & Validation Document
## Education Community Resource Mapping · Rwanda
### Version 1.0 | Academic Final Year Project

---

## HOW TO RUN THE SYSTEM

### Step 1 — Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m app.seeds.seed          # Seeds DB with 35 schools, 2000+ teachers, 150+ feedback
uvicorn app.main:app --reload --port 8000
```
API available at: http://localhost:8000
API Docs (Swagger): http://localhost:8000/api/docs

### Step 2 — Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App available at: http://localhost:5173

---

## TEST ACCOUNTS

| Role             | Email                         | Password      | Access Level         |
|------------------|-------------------------------|---------------|----------------------|
| System Admin     | admin@reb.rw                  | Admin@1234    | Full system control  |
| REB Officer      | uwase@mineduc.gov.rw          | Reb@1234      | National view + analytics |
| District Officer | eric@gasabo.gov.rw            | District@1    | Gasabo district only |
| School Head      | paul@school.rw                | School@1234   | Own school only      |
| Field Enumerator | rose@reb.rw                   | Field@1234    | Data collection      |
| Community Member | david@gmail.com               | Comm@1234     | Feedback submission  |

---

## TEST CASES

---

### MODULE 1 — AUTHENTICATION

#### TC-001: Successful Login
- **Pre-condition:** System is running, database seeded
- **Steps:**
  1. Navigate to http://localhost:5173
  2. Click the "Admin" role tile
  3. Email and password auto-fill
  4. Click "Sign In"
- **Expected Result:** Redirected to Admin Dashboard, user name shown in sidebar
- **Pass Criteria:** Token stored in localStorage (`ecrm_token`), /api/auth/me returns user data

#### TC-002: Invalid Credentials
- **Steps:**
  1. Enter email: wrong@email.com, password: wrongpass
  2. Click "Sign In"
- **Expected Result:** Error toast "Invalid email or password"
- **Pass Criteria:** No redirect, no token stored

#### TC-003: Role-Based Redirect
- **Steps:**
  1. Login as District Officer (eric@gasabo.gov.rw)
  2. Observe dashboard
- **Expected Result:** District dashboard shows only Gasabo schools
- **Pass Criteria:** Schools API called with district=Gasabo filter

#### TC-004: JWT Token Persistence
- **Steps:**
  1. Login as any user
  2. Refresh the browser page
- **Expected Result:** User remains logged in, dashboard loads
- **Pass Criteria:** Token retrieved from localStorage (`ecrm_token`), /api/auth/me succeeds

#### TC-005: Sign Out
- **Steps:**
  1. Click "Sign Out" at bottom of sidebar
- **Expected Result:** Redirected to login page
- **Pass Criteria:** `ecrm_token` removed from localStorage

---

### MODULE 2 — GIS MAP (Core Feature)

#### TC-006: Map Loads with School Pins
- **Steps:**
  1. Login as Admin
  2. Click "GIS Map" in sidebar
- **Expected Result:** Leaflet map loads with OpenStreetMap tiles. School pins appear in clustered groups and are colour-coded (green=good, amber=moderate, red=critical)
- **Pass Criteria:** 35 pins visible (minus any without GPS coordinates)

#### TC-007: School Popup on Click
- **Steps:**
  1. On GIS Map, click any school pin
- **Expected Result:** Popup shows school name, district, student count, teacher count, facilities icons, status badge, GPS coordinates
- **Pass Criteria:** Popup content matches database record

#### TC-008: School Detail Panel
- **Steps:**
  1. Click a school pin → popup appears
  2. Click the pin again to select
- **Expected Result:** School detail panel appears below map with full metrics
- **Pass Criteria:** Panel shows students, teachers, classrooms, textbooks, desks, facilities

#### TC-009: GPS Coordinate Entry
- **Steps:**
  1. Login as Admin or Enumerator
  2. Go to GIS Map
  3. Find a school without GPS in "Schools Without GPS" section
  4. Click "Add GPS"
  5. Enter latitude: -1.94500, longitude: 30.08500
  6. Click "Save Coordinates"
- **Expected Result:** Modal closes, school now shows on map
- **Pass Criteria:** School appears at entered coordinates on map

#### TC-010: Use My Location (GPS Capture)
- **Steps:**
  1. Open GPS Edit Modal for any school
  2. Click "Use My Current Location"
  3. Allow browser location access
- **Expected Result:** Latitude and longitude fields populate with current GPS coordinates
- **Pass Criteria:** Coordinates appear in input fields

#### TC-011: GPS Verification
- **Steps:**
  1. Select a school that has GPS but is not verified
  2. Click "✓ Verify GPS"
- **Expected Result:** School pin changes to show blue ring (verified marker), badge updates to "GPS Verified"
- **Pass Criteria:** /api/schools/{id}/verify-gps returns 200, gps_verified=true in DB

#### TC-012: Filter Map by District
- **Steps:**
  1. On GIS Map, select "Kicukiro" in district filter
- **Expected Result:** Only Kicukiro schools shown on map, other pins disappear
- **Pass Criteria:** Map stats bar updates to show only Kicukiro school count

#### TC-013: Filter Map by Status
- **Steps:**
  1. Select "Critical" in status filter
- **Expected Result:** Only red (critical) school pins remain
- **Pass Criteria:** Map legend shows critical count matches filtered pins

#### TC-014: GeoJSON Export
- **Steps:**
  1. Click "GeoJSON" export button
- **Expected Result:** File "ecrm_schools.geojson" downloads
- **Pass Criteria:** File is valid GeoJSON FeatureCollection with school properties

#### TC-015: District Officer Map Restriction
- **Steps:**
  1. Login as District Officer (Gasabo)
  2. Go to GIS Map
- **Expected Result:** District filter is locked to Gasabo, only Gasabo schools visible
- **Pass Criteria:** API returns only Gasabo schools, filter dropdown disabled

---

### MODULE 3 — SCHOOL MANAGEMENT

#### TC-016: List All Schools
- **Steps:**
  1. Login as Admin
  2. Click "Schools" in sidebar
- **Expected Result:** All 35 schools shown in list view with columns for name, district, type, status, GPS
- **Pass Criteria:** Table has 35 rows

#### TC-017: Register New School
- **Steps:**
  1. Click "+ Register School"
  2. Fill: Name="GS Test", District=Gasabo, Sector=Remera, Type=Primary
  3. Students (Boys)=200, Girls=180, Teachers (M)=8, Teachers (F)=6
  4. Classrooms=10, Textbooks=300, Desks=350
  5. Check "Water" and "Electricity"
  6. Click "Register School"
- **Expected Result:** School appears in list, status auto-computed as "good" or "moderate"
- **Pass Criteria:** POST /api/schools returns 201, new school in list

#### TC-018: Auto Status Computation
- **Steps:**
  1. Register a school with: no water, no electricity, very few textbooks, few desks, few toilets
- **Expected Result:** Status automatically set to "critical"
- **Pass Criteria:** Status reflects scoring of 8 criteria in backend

#### TC-019: Auto Alert Generation
- **Steps:**
  1. Register school with textbooks=10, students=300 (massive shortage)
- **Expected Result:** Resource alert automatically created for textbook_shortage at critical level
- **Pass Criteria:** GET /api/alerts shows new alert for this school

#### TC-020: Edit School Data
- **Steps:**
  1. Find any school
  2. Click "Edit"
  3. Change students_boys from current to current+50
  4. Click "Update School"
- **Expected Result:** School data updates, status may change
- **Pass Criteria:** PATCH /api/schools/{id} returns updated school

#### TC-021: School Card View
- **Steps:**
  1. Switch to "Cards" view in Schools page
- **Expected Result:** Schools shown as visual cards with colour-coded left border, stats, facility icons
- **Pass Criteria:** Cards match list data

#### TC-022: School Detail Modal
- **Steps:**
  1. Click "View" on any school row
- **Expected Result:** Modal shows all fields including: enrollment by gender, teachers by gender, all facilities, GPS coordinates, road distance
- **Pass Criteria:** All 20+ fields visible

#### TC-023: CSV Export
- **Steps:**
  1. Click "CSV" button on Schools page
- **Expected Result:** CSV file downloads with all school records
- **Pass Criteria:** File opens in Excel with correct columns

#### TC-024: Filter by Status
- **Steps:**
  1. Select "critical" in status filter
- **Expected Result:** Only critical schools shown
- **Pass Criteria:** Count matches critical schools in database

#### TC-025: School Head Access Restriction
- **Steps:**
  1. Login as School Head
  2. Go to Schools page
- **Expected Result:** Only their own school appears
- **Pass Criteria:** API returns single school matching school_id

---

### MODULE 4 — TEACHER MANAGEMENT

#### TC-026: Teacher Roster by School
- **Steps:**
  1. Login as Admin
  2. Click "Teachers"
  3. Filter by a specific school
- **Expected Result:** Only teachers for that school shown
- **Pass Criteria:** All records have matching school_id

#### TC-027: Add Teacher
- **Steps:**
  1. Click "+ Add Teacher"
  2. Fill: School=LS Remera, Name=Test Teacher, Gender=Female, Subject=Biology, Qualification=A0
  3. Click "Add Teacher"
- **Expected Result:** Teacher appears in roster
- **Pass Criteria:** POST /api/teachers returns 201

#### TC-028: Teacher Workload Analysis
- **Steps:**
  1. Observe "Workload Alerts" panel on Teachers page
- **Expected Result:** Schools with P:T ratio > 1:50 listed with teacher gap count
- **Pass Criteria:** GET /api/teachers/workload/analysis returns sorted list

#### TC-029: Qualification Distribution Chart
- **Steps:**
  1. Observe the pie chart on Teachers page
- **Expected Result:** Pie chart shows A2, A1, A0, Masters distribution
- **Pass Criteria:** Chart segments match teacher counts in database

#### TC-030: Teacher Status Filter
- **Steps:**
  1. Filter teachers by status "Absent"
- **Expected Result:** Only absent teachers shown
- **Pass Criteria:** Results match DB query for status=Absent

---

### MODULE 5 — FEEDBACK & COMMUNITY REPORTS

#### TC-031: Submit Feedback (Community Member)
- **Steps:**
  1. Login as Community Member
  2. Go to Feedback
  3. Click "+ Submit Report"
  4. Select a school, choose type "Infrastructure", write description
  5. Click "Submit Report"
- **Expected Result:** Success toast, feedback appears in list with status "pending"
- **Pass Criteria:** POST /api/feedback returns 201

#### TC-032: Review Feedback (District Officer)
- **Steps:**
  1. Login as District Officer
  2. Go to Feedback, find a pending report
  3. Click "Review"
- **Expected Result:** Status changes to "reviewed"
- **Pass Criteria:** PATCH /api/feedback/{id} with status=reviewed

#### TC-033: Resolve Feedback
- **Steps:**
  1. Find a "reviewed" feedback
  2. Click "Resolve"
- **Expected Result:** Status changes to "resolved"
- **Pass Criteria:** Status badge updates to green "resolved"

#### TC-034: Feedback Visible by Role
- **Steps:**
  1. Login as District Officer (Gasabo)
  2. Check Feedback list
- **Expected Result:** Only feedback for Gasabo schools shown
- **Pass Criteria:** All records have school in Gasabo district

#### TC-035: Feedback Filter by Type
- **Steps:**
  1. Filter feedback by "Teacher Absence"
- **Expected Result:** Only teacher absence reports shown
- **Pass Criteria:** All rows have issue_type=Teacher Absence

---

### MODULE 6 — RESOURCE ALERTS

#### TC-036: Alerts Auto-Generated
- **Steps:**
  1. Login as Admin
  2. Click "Alerts" in sidebar
- **Expected Result:** List of resource alerts showing: textbook_shortage, desk_shortage, sanitation_gap, teacher_overload, no_water, gps_unverified
- **Pass Criteria:** Each alert has level (critical/warning/info) and message

#### TC-037: Resolve an Alert
- **Steps:**
  1. Find an active alert
  2. Click "Resolve"
- **Expected Result:** Alert disappears from active list
- **Pass Criteria:** is_resolved=true in DB

#### TC-038: Filter by Level
- **Steps:**
  1. Click "critical" filter
- **Expected Result:** Only critical-level alerts shown
- **Pass Criteria:** All visible alerts have level=critical

#### TC-039: Alert Count in Sidebar
- **Steps:**
  1. Login as Admin
  2. Observe sidebar "Alerts" menu item
- **Expected Result:** Red badge with count of active alerts
- **Pass Criteria:** Badge count matches GET /api/alerts count

#### TC-040: Alert Triggered on School Update
- **Steps:**
  1. Edit a school, drastically reduce textbooks to 0
  2. Go to Alerts page
- **Expected Result:** New critical textbook_shortage alert for that school
- **Pass Criteria:** Alert auto-generated by auto_alerts() on PATCH

---

### MODULE 7 — ANALYTICS

#### TC-041: National Stats Dashboard (Admin/REB)
- **Steps:**
  1. Login as Admin → Dashboard
- **Expected Result:** Cards show total schools, total students, total teachers, GPS verified count
- **Pass Criteria:** Numbers match GET /api/analytics/national

#### TC-042: District Comparison Charts
- **Steps:**
  1. On Admin Dashboard → Districts tab
- **Expected Result:** Bar chart comparing Gasabo, Kicukiro, Nyarugenge by students and teachers
- **Pass Criteria:** Chart data matches GET /api/analytics/districts

#### TC-043: Enrollment Trend Chart (REB)
- **Steps:**
  1. Login as REB Officer → Dashboard → Trends tab
- **Expected Result:** Line chart showing enrollment growth 2022–2025 by boys, girls, total
- **Pass Criteria:** Chart has 4 data points matching enrollment_history table

#### TC-044: Resource Gap Progress Bars
- **Steps:**
  1. Login as Admin → Analytics page
- **Expected Result:** Progress bars for textbooks, desks, toilets, classrooms showing have/need
- **Pass Criteria:** Bar color is red for <50%, amber for 50-80%, green for >80%

#### TC-045: Facilities Coverage
- **Steps:**
  1. Analytics page, "Facility Coverage" card
- **Expected Result:** Shows % of schools with water, electricity, library, ICT, GPS
- **Pass Criteria:** Percentages calculated from national stats

#### TC-045B: Intervention Priority Risk Scores (Innovation)
- **Steps:**
  1. Login as Admin or District Officer
  2. On Dashboard overview, locate "Intervention Priority — Top Risk Schools"
- **Expected Result:** Table shows schools sorted by risk_score with status and P:T ratio
- **Pass Criteria:** GET `/api/analytics/risk-scores?limit=8` returns a list with `risk_score` (0–100) and `reasons`

---

### MODULE 8 — USER MANAGEMENT (Admin only)

#### TC-046: View All Users
- **Steps:**
  1. Login as Admin → Users
- **Expected Result:** All 8 seeded users shown with role badges
- **Pass Criteria:** GET /api/users returns 8 records

#### TC-047: Create New User
- **Steps:**
  1. Click "+ Create User"
  2. Fill name, email, password, role=district, district=Kicukiro
  3. Click "Create User"
- **Expected Result:** User appears in list
- **Pass Criteria:** POST /api/users returns 201

#### TC-048: Deactivate User
- **Steps:**
  1. Click "Deactivate" on any non-admin user
- **Expected Result:** Status badge changes to "Inactive"
- **Pass Criteria:** is_active=false in DB

#### TC-049: Non-Admin Cannot Access Users Page
- **Steps:**
  1. Login as District Officer
  2. Notice "Users" not in sidebar navigation
- **Expected Result:** Users menu item not shown
- **Pass Criteria:** Page not in NAV_CONFIG for district role

---

### MODULE 9 — ROLE-BASED ACCESS CONTROL

#### TC-050: District Officer Isolation
- **Steps:**
  1. Login as District Officer (Gasabo)
  2. Check Schools, Feedback, Alerts
- **Expected Result:** All data filtered to Gasabo only
- **Pass Criteria:** Backend enforces district filter on all queries

#### TC-051: School Head Data Access
- **Steps:**
  1. Login as School Head
  2. Check Dashboard, Teachers, Feedback
- **Expected Result:** Only their school's data visible
- **Pass Criteria:** school_id filter applied on all API calls

#### TC-051B: Enrollment History Isolation (Defect Fix Validation)
- **Steps:**
  1. Login as School Head
  2. Open any browser dev tool / API client
  3. Call GET `/api/enrollment/{some_other_school_id}`
- **Expected Result:** Forbidden
- **Pass Criteria:** API responds 403 and does not return other schools' enrollment records

#### TC-052: Community Member Restrictions
- **Steps:**
  1. Login as Community Member
  2. Check available sidebar items
- **Expected Result:** Only Report Issue, Track Reports, School Map visible
- **Pass Criteria:** Admin/Analytics/Users pages not accessible

#### TC-053: Enumerator School Registration
- **Steps:**
  1. Login as Field Enumerator
  2. Go to Schools → Register School
- **Expected Result:** Can register new schools with GPS
- **Pass Criteria:** POST /api/schools succeeds with enumerator role

#### TC-054: API Role Guard Test
- **Steps:**
  1. Get token for community member via login
  2. Call GET /api/users with that token (Admin-only endpoint)
- **Expected Result:** Returns 403 Forbidden
- **Pass Criteria:** {"detail": "Access denied for this role"}

---

### MODULE 10 — DATA EXPORT

#### TC-055: Schools CSV Export
- **Steps:**
  1. Login as Admin → Schools
  2. Click "CSV" button
- **Expected Result:** CSV file downloads
- **Pass Criteria:** File has headers: ID, Name, District, Sector, Type, Students (Boys), Students (Girls), Total Students, Teachers...

#### TC-056: GeoJSON Export
- **Steps:**
  1. Login as Admin → GIS Map
  2. Click "GeoJSON" button
- **Expected Result:** .geojson file downloads
- **Pass Criteria:** Valid GeoJSON FeatureCollection, each feature has Point geometry with coordinates

#### TC-057: Filtered CSV Export
- **Steps:**
  1. Filter schools by district=Kicukiro
  2. Click CSV export
- **Expected Result:** CSV contains only Kicukiro schools
- **Pass Criteria:** All rows in file have district=Kicukiro

---

### MODULE 11 — API ENDPOINT TESTS

You can test all endpoints directly via Swagger UI at http://localhost:8000/api/docs

#### TC-058: Health Check
```
GET /api/health
Expected: {"status": "ok", "service": "ECRM API v1.0.0", "country": "Rwanda"}
```

#### TC-059: Login
```
POST /api/auth/login
Body: {"email": "admin@reb.rw", "password": "Admin@1234"}
Expected: 200 with access_token and user object
```

#### TC-060: Get Schools (filtered)
```
GET /api/schools?district=Gasabo&status=critical
Expected: 200 with list of critical Gasabo schools only
```

#### TC-061: Resource Gaps
```
GET /api/analytics/resource-gaps
Expected: {"textbooks": {"have": X, "need": Y}, "desks": {...}, ...}
```

#### TC-062: Teacher Workload
```
GET /api/teachers/workload/analysis
Expected: List sorted by ratio descending, overloaded=true for ratio>50
```

#### TC-063: GIS Summary
```
GET /api/analytics/gis-summary
Expected: {"total_mapped": N, "gps_verified": N, "by_status": {...}, "coverage_pct": N}
```

---

## SEEDED DATA SUMMARY

| Entity             | Count  | Notes                                    |
|--------------------|--------|------------------------------------------|
| Schools            | 35     | Across Gasabo (15), Kicukiro (10), Nyarugenge (10) |
| Teachers           | ~2,000 | Proportional to school sizes             |
| Feedback records   | ~150   | Weighted toward critical/moderate schools |
| Resource Alerts    | ~200   | Auto-generated based on resource levels  |
| Enrollment History | 140    | 4 years × 35 schools                    |
| Users              | 8      | All 6 roles represented                  |

---

## KNOWN LIMITATIONS (Future Work)

1. **Offline sync** — Frontend marks "Online" but offline IndexedDB queue not implemented
2. **PDF export** — Referenced in proposal but not implemented; CSV covers this use case
3. **SMS notifications** — Alert delivery by SMS requires Twilio integration
4. **Real-time updates** — Alerts are pulled on page load; WebSocket push not implemented
5. **Multi-language** — English only; Kinyarwanda translation is future work
6. **Mobile app** — Progressive Web App not configured; works in mobile browser

---

## MARKING CRITERIA COVERAGE

| Criterion                        | Implemented | Evidence                                 |
|----------------------------------|-------------|------------------------------------------|
| GIS Mapping with GPS             | ✅ Yes      | Leaflet + OpenStreetMap, GPS capture, verify |
| Role-based access control        | ✅ Yes      | 6 roles, backend + frontend enforcement  |
| School data collection           | ✅ Yes      | Full CRUD with 20+ fields                |
| Teacher workload analysis        | ✅ Yes      | /api/teachers/workload/analysis endpoint |
| Resource gap detection + alerts  | ✅ Yes      | Auto-alerts on create/update             |
| Community feedback portal        | ✅ Yes      | Submit, review, resolve workflow         |
| Enrollment trends                | ✅ Yes      | 4-year history with line charts          |
| Data export                      | ✅ Yes      | CSV + GeoJSON                            |
| RESTful API with JWT auth        | ✅ Yes      | FastAPI + python-jose                    |
| Database with seed data          | ✅ Yes      | SQLite (upgradeable to PostgreSQL)       |
| Professional UI                  | ✅ Yes      | React + Recharts + Leaflet               |
| Audit logging                    | ✅ Yes      | Every action logged with user + timestamp|
