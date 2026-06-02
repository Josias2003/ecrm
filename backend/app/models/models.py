from sqlalchemy import (Column, Integer, String, Float, Boolean,
                        ForeignKey, DateTime, Text, Enum as SAEnum, Index)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin="admin"; reb="reb"; district="district"
    school="school"; enumerator="enumerator"; community="community"

class StatusEnum(str, enum.Enum):
    good="good"; moderate="moderate"; critical="critical"

class FeedbackStatusEnum(str, enum.Enum):
    pending="pending"; reviewed="reviewed"; resolved="resolved"

class AlertLevelEnum(str, enum.Enum):
    info="info"; warning="warning"; critical="critical"

class School(Base):
    __tablename__ = "schools"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(200), nullable=False)
    district         = Column(String(100), nullable=False, index=True)
    sector           = Column(String(100), nullable=False)
    cell             = Column(String(100), nullable=True)
    school_type      = Column(String(30), nullable=False)
    ownership        = Column(String(30), default="Public")
    latitude         = Column(Float, nullable=True)
    longitude        = Column(Float, nullable=True)
    gps_verified     = Column(Boolean, default=False, index=True)
    gps_verified_by  = Column(Integer, nullable=True)
    gps_verified_at  = Column(DateTime(timezone=True), nullable=True)
    students_boys    = Column(Integer, default=0)
    students_girls   = Column(Integer, default=0)
    teachers_male    = Column(Integer, default=0)
    teachers_female  = Column(Integer, default=0)
    classrooms       = Column(Integer, default=0)
    classrooms_good  = Column(Integer, default=0)
    textbooks        = Column(Integer, default=0)
    desks            = Column(Integer, default=0)
    toilets_boys     = Column(Integer, default=0)
    toilets_girls    = Column(Integer, default=0)
    has_library      = Column(Boolean, default=False)
    has_ict_lab      = Column(Boolean, default=False)
    has_science_lab  = Column(Boolean, default=False)
    has_water        = Column(Boolean, default=False)
    has_electricity  = Column(Boolean, default=False)
    has_internet     = Column(Boolean, default=False)
    has_fence        = Column(Boolean, default=False)
    has_canteen      = Column(Boolean, default=False)
    distance_to_road_km = Column(Float, nullable=True)
    status           = Column(SAEnum(StatusEnum), default=StatusEnum.moderate, index=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    teacher_list   = relationship("Teacher", back_populates="school", cascade="all, delete-orphan")
    feedback       = relationship("Feedback", back_populates="school", cascade="all, delete-orphan")
    alerts         = relationship("ResourceAlert", back_populates="school", cascade="all, delete-orphan")
    enrollments    = relationship("EnrollmentHistory", back_populates="school", cascade="all, delete-orphan")

    __table_args__ = (Index('idx_district_status', 'district', 'status'),)

class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(150), nullable=False)
    email           = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SAEnum(RoleEnum), nullable=False, index=True)
    district        = Column(String(100), nullable=True, index=True)
    school_id       = Column(Integer, ForeignKey("schools.id"), nullable=True)
    is_active       = Column(Boolean, default=True, index=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
    feedback        = relationship("Feedback", back_populates="submitted_by", foreign_keys="Feedback.user_id")
    audit_logs      = relationship("AuditLog", back_populates="user")

class Teacher(Base):
    __tablename__ = "teachers"
    id              = Column(Integer, primary_key=True, index=True)
    school_id       = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    full_name       = Column(String(150), nullable=False)
    gender          = Column(String(10), nullable=False)
    subject         = Column(String(100), nullable=False)
    qualification   = Column(String(20), nullable=False)
    employment_type = Column(String(30), default="Permanent")
    status          = Column(String(20), default="Active")
    join_year       = Column(Integer, nullable=True)
    phone           = Column(String(20), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    school          = relationship("School", back_populates="teacher_list")

class Feedback(Base):
    __tablename__ = "feedback"
    id               = Column(Integer, primary_key=True, index=True)
    school_id        = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=True)
    issue_type       = Column(String(60), nullable=False, index=True)
    description      = Column(Text, nullable=False)
    reporter_name    = Column(String(150), nullable=True)
    reporter_contact = Column(String(100), nullable=True)
    status           = Column(SAEnum(FeedbackStatusEnum), default=FeedbackStatusEnum.pending, index=True)
    reviewer_note    = Column(Text, nullable=True)
    reviewed_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at      = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    school           = relationship("School", back_populates="feedback")
    submitted_by     = relationship("User", back_populates="feedback", foreign_keys=[user_id])

class ResourceAlert(Base):
    __tablename__ = "resource_alerts"
    id          = Column(Integer, primary_key=True, index=True)
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    alert_type  = Column(String(80), nullable=False)
    level       = Column(SAEnum(AlertLevelEnum), default=AlertLevelEnum.warning, index=True)
    message     = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    school      = relationship("School", back_populates="alerts")

class EnrollmentHistory(Base):
    __tablename__ = "enrollment_history"
    id             = Column(Integer, primary_key=True, index=True)
    school_id      = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    year           = Column(Integer, nullable=False, index=True)
    term           = Column(Integer, nullable=True)
    students_boys  = Column(Integer, default=0)
    students_girls = Column(Integer, default=0)
    teachers       = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    school         = relationship("School", back_populates="enrollments")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action_type = Column(String(30), nullable=False, index=True)
    description = Column(Text, nullable=False)
    entity      = Column(String(50), nullable=True)
    entity_id   = Column(Integer, nullable=True)
    ip_address  = Column(String(50), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    user        = relationship("User", back_populates="audit_logs")
