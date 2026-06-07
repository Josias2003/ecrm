from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class RoleEnum(str, Enum):
    admin="admin"; reb="reb"; district="district"
    school="school"; enumerator="enumerator"; community="community"

class StatusEnum(str, Enum):
    good="good"; moderate="moderate"; critical="critical"

class FeedbackStatusEnum(str, Enum):
    pending="pending"; reviewed="reviewed"; resolved="resolved"; closed="closed"

# ── AUTH ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

# ── USER ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: RoleEnum
    district: Optional[str] = None
    school_id: Optional[int] = None
    is_active: bool = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[RoleEnum] = None
    district: Optional[str] = None
    school_id: Optional[int] = None
    is_active: Optional[bool] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserOut(BaseModel):
    id: int; full_name: str; email: str; role: str
    district: Optional[str]; school_id: Optional[int]
    school_name: Optional[str] = None
    is_active: bool; created_at: datetime
    class Config: from_attributes = True

class UnassignedSchoolOut(BaseModel):
    id: int
    name: str
    district: str
    school_code: str

class IncompleteUserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    issue: str

class AssignmentGapsOut(BaseModel):
    unassigned_schools: List[UnassignedSchoolOut]
    unassigned_districts: List[str]
    incomplete_users: List[IncompleteUserOut]
    unassigned_school_count: int
    unassigned_district_count: int
    incomplete_user_count: int

# ── SCHOOL ────────────────────────────────────────────────────────
class SchoolCreate(BaseModel):
    name: str; district: str; sector: str; cell: Optional[str] = None
    school_type: str; ownership: str = "Public"
    latitude: Optional[float] = None; longitude: Optional[float] = None
    students_boys: int = 0; students_girls: int = 0
    teachers_male: int = 0; teachers_female: int = 0
    classrooms: int = 0; classrooms_good: int = 0
    textbooks: int = 0; desks: int = 0
    toilets_boys: int = 0; toilets_girls: int = 0
    has_library: bool = False; has_ict_lab: bool = False
    has_science_lab: bool = False; has_water: bool = False
    has_electricity: bool = False; has_internet: bool = False
    has_fence: bool = False; has_canteen: bool = False
    distance_to_road_km: Optional[float] = None

class SchoolUpdate(BaseModel):
    name: Optional[str] = None; district: Optional[str] = None
    sector: Optional[str] = None; cell: Optional[str] = None
    school_type: Optional[str] = None; ownership: Optional[str] = None
    latitude: Optional[float] = None; longitude: Optional[float] = None
    gps_verified: Optional[bool] = None
    students_boys: Optional[int] = None; students_girls: Optional[int] = None
    teachers_male: Optional[int] = None; teachers_female: Optional[int] = None
    classrooms: Optional[int] = None; classrooms_good: Optional[int] = None
    textbooks: Optional[int] = None; desks: Optional[int] = None
    toilets_boys: Optional[int] = None; toilets_girls: Optional[int] = None
    has_library: Optional[bool] = None; has_ict_lab: Optional[bool] = None
    has_science_lab: Optional[bool] = None; has_water: Optional[bool] = None
    has_electricity: Optional[bool] = None; has_internet: Optional[bool] = None
    has_fence: Optional[bool] = None; has_canteen: Optional[bool] = None
    distance_to_road_km: Optional[float] = None

class SchoolOut(BaseModel):
    id: int; name: str; district: str; sector: str; cell: Optional[str]
    school_type: str; ownership: str
    latitude: Optional[float]; longitude: Optional[float]; gps_verified: bool
    students_boys: int; students_girls: int
    teachers_male: int; teachers_female: int
    classrooms: int; classrooms_good: int
    textbooks: int; desks: int; toilets_boys: int; toilets_girls: int
    has_library: bool; has_ict_lab: bool; has_science_lab: bool
    has_water: bool; has_electricity: bool; has_internet: bool
    has_fence: bool; has_canteen: bool
    distance_to_road_km: Optional[float]
    status: str; created_at: datetime; updated_at: Optional[datetime]
    school_code: str = ""
    infrastructure_score: int = 0
    connectivity_label: str = "None"
    total_students: int = 0
    total_teachers: int = 0
    class Config: from_attributes = True

# ── TEACHER ───────────────────────────────────────────────────────
class TeacherCreate(BaseModel):
    school_id: int; full_name: str; gender: str; subject: str
    qualification: str; employment_type: str = "Permanent"
    status: str = "Active"; join_year: Optional[int] = None
    phone: Optional[str] = None

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None; gender: Optional[str] = None
    subject: Optional[str] = None; qualification: Optional[str] = None
    employment_type: Optional[str] = None; status: Optional[str] = None
    join_year: Optional[int] = None; phone: Optional[str] = None

class TeacherOut(BaseModel):
    id: int; school_id: int; full_name: str; gender: str; subject: str
    qualification: str; employment_type: str; status: str
    join_year: Optional[int]; phone: Optional[str]; created_at: datetime
    class Config: from_attributes = True

# ── FEEDBACK ──────────────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    school_id: int; issue_type: str; description: str
    reporter_name: Optional[str] = None; reporter_contact: Optional[str] = None

class FeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatusEnum] = None
    reviewer_note: Optional[str] = None

class FeedbackMessageCreate(BaseModel):
    content: str

class FeedbackMessageOut(BaseModel):
    id: int; feedback_id: int; user_id: int; content: str
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class FeedbackOut(BaseModel):
    id: int; school_id: int; issue_type: str; description: str
    reporter_name: Optional[str]; reporter_contact: Optional[str]
    status: str; reviewer_note: Optional[str]
    forwarded_to_reb: bool = False
    school_name: Optional[str] = None
    district: Optional[str] = None
    created_at: datetime; updated_at: Optional[datetime]
    class Config: from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class ChatRoomCreate(BaseModel):
    title: str
    preset: Optional[str] = None
    member_ids: Optional[List[int]] = None

# ── ALERT ─────────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int; school_id: int; alert_type: str; level: str
    message: str; is_resolved: bool; forwarded_to_reb: bool = False
    school_name: Optional[str] = None
    district: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class AlertResolve(BaseModel):
    resolution_note: str

# ── ENROLLMENT HISTORY ────────────────────────────────────────────
class EnrollmentHistoryOut(BaseModel):
    id: int; school_id: int; year: int; term: Optional[int]
    students_boys: int; students_girls: int; teachers: int
    class Config: from_attributes = True

# ── AUDIT LOG ─────────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: int; user_id: Optional[int]; action_type: str
    description: str; entity: Optional[str]; entity_id: Optional[int]
    ip_address: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class ChatRoomOut(BaseModel):
    id: int; title: str; scope: str
    target_role: Optional[str] = None
    district: Optional[str]; school_id: Optional[int]
    created_at: datetime
    class Config: from_attributes = True

class ChatContactOut(BaseModel):
    id: int; full_name: str; role: str
    district: Optional[str] = None
    class Config: from_attributes = True

class ChatMessageOut(BaseModel):
    id: int; room_id: int; user_id: int; content: str
    reply_to_id: Optional[int] = None
    reply_author_name: Optional[str] = None
    reply_content: Optional[str] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class ChatMessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[int] = None

class ReportMeta(BaseModel):
    type: str
    label: str
    description: str

class ReportPreview(BaseModel):
    type: str
    label: str
    description: str
    period_from: str
    period_to: str
    generated_at: datetime
    summary: dict
    insights: List[str] = []
    rows: List[dict] = []

# ── ANALYTICS ─────────────────────────────────────────────────────
class DistrictStats(BaseModel):
    district: str; total_schools: int; total_students: int
    total_teachers: int; critical_schools: int; moderate_schools: int
    good_schools: int; avg_pupil_teacher_ratio: float
    schools_with_water: int; schools_with_electricity: int
    district_officer: Optional[str] = None
    officer_assigned: bool = False

class NationalStats(BaseModel):
    total_schools: int; total_students: int; total_teachers: int
    critical_schools: int; moderate_schools: int; good_schools: int
    schools_with_water: int; schools_with_electricity: int
    schools_with_library: int; schools_with_ict: int
    schools_gps_verified: int; total_alerts: int; pending_feedback: int

TokenResponse.model_rebuild()
