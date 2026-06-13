"""Report catalog: criterion queries and role access per actor."""

CATEGORY_LABELS = {
    "overview": "Overview",
    "connectivity": "Connectivity",
    "facilities": "Facilities",
    "resources": "Resources",
    "staffing": "Staffing",
    "mapping": "Field Mapping",
    "accountability": "Accountability",
    "platform": "Platform",
}

REPORT_CATALOG = {
    # ── Overview ──────────────────────────────────────────────────
    "schools_summary": {
        "label": "Schools Summary",
        "description": "Inventory, status, and staffing across scoped schools.",
        "category": "overview",
        "roles": ["admin", "reb", "district", "school", "enumerator"],
        "dated": False,
    },
    "school_dossier": {
        "label": "School Resource Dossier",
        "description": "Full per-school listing: enrollment, resources, facilities, and connectivity.",
        "category": "overview",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "district_overview": {
        "label": "District Comparison",
        "description": "Aggregated district comparison for regional equity discussions.",
        "category": "overview",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "national_equity": {
        "label": "National Equity Brief",
        "description": "District-level connectivity, facilities, and critical school counts.",
        "category": "overview",
        "roles": ["admin", "reb"],
        "dated": False,
    },
    "enrollment_trends": {
        "label": "Enrollment Trends",
        "description": "Year-on-year enrollment for capacity and deployment planning.",
        "category": "overview",
        "roles": ["admin", "reb", "district", "school"],
        "dated": True,
    },
    # ── Connectivity ──────────────────────────────────────────────
    "no_internet": {
        "label": "Schools Without Internet",
        "description": "Schools lacking internet — use for connectivity intervention plans.",
        "category": "connectivity",
        "roles": ["admin", "reb", "district", "enumerator"],
        "dated": False,
    },
    "no_water": {
        "label": "Schools Without Water",
        "description": "Schools without water supply — prioritise WASH investments.",
        "category": "connectivity",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "no_electricity": {
        "label": "Schools Without Electricity",
        "description": "Schools without electricity — needed before ICT and labs.",
        "category": "connectivity",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    # ── Facilities ────────────────────────────────────────────────
    "no_library": {
        "label": "Schools Without Library",
        "description": "Schools missing a library facility.",
        "category": "facilities",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "no_ict_lab": {
        "label": "Schools Without ICT Lab",
        "description": "Schools without an ICT lab.",
        "category": "facilities",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "no_science_lab": {
        "label": "Schools Without Science Lab",
        "description": "Schools without a science laboratory.",
        "category": "facilities",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "infrastructure_stale": {
        "label": "Stale Infrastructure Data",
        "description": "Schools whose infrastructure survey was not updated in 12+ months.",
        "category": "facilities",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    # ── Resources ─────────────────────────────────────────────────
    "textbook_deficit": {
        "label": "Textbook Shortage",
        "description": "Schools with fewer textbooks than enrolled students.",
        "category": "resources",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "desk_deficit": {
        "label": "Desk Shortage",
        "description": "Schools with fewer desks than enrolled students.",
        "category": "resources",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "toilet_deficit": {
        "label": "Toilet Shortage",
        "description": "Schools below 1 toilet per 30 students.",
        "category": "resources",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "classroom_pressure": {
        "label": "Classroom Overcrowding",
        "description": "Schools where usable classrooms exceed 45 students per room.",
        "category": "resources",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    # ── Staffing ──────────────────────────────────────────────────
    "high_pt_ratio": {
        "label": "High Pupil-Teacher Ratio",
        "description": "Schools exceeding 1:50 pupil-teacher ratio.",
        "category": "staffing",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "critical_schools": {
        "label": "Critical Status Schools",
        "description": "Schools in critical status with full resource context.",
        "category": "staffing",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "teacher_roster": {
        "label": "Teacher Deployment",
        "description": "Teacher roster by school — subject, qualification, and contract.",
        "category": "staffing",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    # ── Field Mapping ─────────────────────────────────────────────
    "gps_coverage": {
        "label": "GPS Coverage",
        "description": "Mapping and on-site GPS verification progress.",
        "category": "mapping",
        "roles": ["admin", "reb", "district", "enumerator"],
        "dated": False,
    },
    "unmapped_schools": {
        "label": "Unmapped Schools",
        "description": "Schools missing coordinates — assign field capture.",
        "category": "mapping",
        "roles": ["admin", "reb", "district", "enumerator"],
        "dated": False,
    },
    "gps_unverified": {
        "label": "GPS Not Verified",
        "description": "Schools with coordinates but not verified on site.",
        "category": "mapping",
        "roles": ["admin", "reb", "district", "enumerator"],
        "dated": False,
    },
    # ── Accountability ────────────────────────────────────────────
    "alerts_summary": {
        "label": "Resource Alerts",
        "description": "Resource gap alerts in the selected period.",
        "category": "accountability",
        "roles": ["admin", "reb", "district", "school"],
        "dated": True,
    },
    "unresolved_alerts": {
        "label": "Unresolved Alerts",
        "description": "Open resource alerts requiring district or REB action.",
        "category": "accountability",
        "roles": ["admin", "reb", "district", "school"],
        "dated": False,
    },
    "feedback_summary": {
        "label": "Community Feedback",
        "description": "Feedback and issue reports in the selected period.",
        "category": "accountability",
        "roles": ["admin", "reb", "district", "school"],
        "dated": True,
    },
    "feedback_backlog": {
        "label": "Feedback Backlog",
        "description": "Pending and reviewed feedback awaiting resolution.",
        "category": "accountability",
        "roles": ["admin", "reb", "district"],
        "dated": False,
    },
    "my_submissions": {
        "label": "My Submitted Reports",
        "description": "Your community feedback submissions and status.",
        "category": "accountability",
        "roles": ["community"],
        "dated": True,
    },
    "data_entry_compliance": {
        "label": "Data Entry Compliance",
        "description": "Schools missing termly survey or resource updates in the period.",
        "category": "accountability",
        "roles": ["admin", "reb", "district"],
        "dated": True,
    },
    # ── Platform (admin) ──────────────────────────────────────────
    "audit_summary": {
        "label": "Audit Activity",
        "description": "Platform audit log for compliance review.",
        "category": "platform",
        "roles": ["admin"],
        "dated": True,
    },
    "service_requests_register": {
        "label": "Service Requests",
        "description": "User support and account requests register.",
        "category": "platform",
        "roles": ["admin"],
        "dated": True,
    },
    "registration_pipeline": {
        "label": "Pending Registrations",
        "description": "Accounts awaiting admin approval.",
        "category": "platform",
        "roles": ["admin"],
        "dated": False,
    },
}

# Report types each role may assign downstream
ASSIGNABLE_BY = {
    "admin": ["district", "school", "enumerator"],
    "reb": ["district"],
    "district": ["school", "enumerator"],
}
