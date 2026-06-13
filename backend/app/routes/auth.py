from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, hash_password, verify_password, create_access_token, get_client_ip
from app.models.models import User, AuditLog, PasswordResetOTP, School, RoleEnum, AccountStatusEnum
from app.schemas.schemas import (
    LoginRequest, TokenResponse, UserCreate, UserUpdate, UserOut,
    ProfileUpdate, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
    AssignmentGapsOut, UnassignedSchoolOut, IncompleteUserOut,
    RegisterRequest, RegistrationReview,
)
from app.services.user_scope import validate_user_scope, user_out_school_name, NATIONAL, SELF_REGISTER_ROLES
from app.services.school_metrics import school_code
from app.services.system_settings import min_password_length, get_bool_setting
from app.data.rwanda_districts import DISTRICT_NAMES
from typing import List, Optional

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        ip = get_client_ip(request)
        log_action(db, None, "LOGIN_FAILED", f"Failed login attempt for {payload.email}", ip_address=ip)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated. Contact admin.")
    status = user.account_status.value if hasattr(user.account_status, "value") else str(user.account_status or "active")
    if status == "pending":
        raise HTTPException(status_code=403, detail="Account pending administrator approval.")
    if status == "rejected":
        reason = user.rejection_reason or "Contact the system administrator."
        raise HTTPException(status_code=403, detail=f"Registration rejected: {reason}")
    token = create_access_token({"sub": str(user.id)})
    ip = get_client_ip(request)
    log_action(db, user.id, "LOGIN", f"{user.full_name} signed in", ip_address=ip)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": _serialize_user(db, user)}

@auth_router.get("/me", response_model=UserOut)
def me(cu=Depends(get_current_user), db: Session = Depends(get_db)):
    return _serialize_user(db, cu)

@auth_router.post("/register", status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if payload.role == RoleEnum.admin:
        raise HTTPException(400, "System administrator accounts cannot self-register")
    if payload.role not in SELF_REGISTER_ROLES:
        raise HTTPException(400, "Invalid registration role")
    min_len = min_password_length(db)
    if len(payload.password) < min_len:
        raise HTTPException(400, f"Password must be at least {min_len} characters")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")

    role_val = payload.role.value if hasattr(payload.role, "value") else str(payload.role)
    district = payload.district
    school_id = payload.school_id

    if role_val in ("district", "enumerator", "school") and not district:
        raise HTTPException(400, "District is required for this role")
    if district and district not in DISTRICT_NAMES and district != NATIONAL:
        raise HTTPException(400, f"Unknown district: {district}")
    if school_id:
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(400, "Selected school does not exist")
        if district and school.district != district:
            raise HTTPException(400, "School must be in your selected district")

    auto_approve = get_bool_setting(db, "community_auto_approve", True) and role_val == "community"
    account_status = AccountStatusEnum.active if auto_approve else AccountStatusEnum.pending

    if auto_approve:
        district, school_id = validate_user_scope(
            db, role=payload.role, district=district, school_id=school_id,
        )

    u = User(
        full_name=payload.full_name.strip(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        district=district if role_val != "community" or district else (district or None),
        school_id=school_id if role_val == "school" else None,
        phone=(payload.phone or "").strip() or None,
        organization=(payload.organization or "").strip() or None,
        account_status=account_status,
        is_active=auto_approve,
    )
    db.add(u)
    ip = get_client_ip(request)
    log_action(
        db, None, "REGISTER",
        f"Registration submitted: {payload.email} ({role_val}) — status={account_status.value}",
        "User", ip_address=ip,
    )
    db.commit()
    db.refresh(u)
    msg = "Account created. You can sign in now." if auto_approve else "Registration submitted. An administrator will review your account."
    return {"message": msg, "account_status": account_status.value, "user_id": u.id}

@auth_router.post("/logout")
def logout(cu=Depends(get_current_user), request: Request = None, db: Session = Depends(get_db)):
    ip = get_client_ip(request) if request else "unknown"
    log_action(db, cu.id, "LOGOUT", f"{cu.full_name} signed out", ip_address=ip)
    db.commit()
    return {"message": "Logged out"}

@auth_router.patch("/me", response_model=UserOut)
def update_profile(payload: ProfileUpdate, request: Request, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    if payload.full_name:
        cu.full_name = payload.full_name.strip()
    if payload.phone is not None:
        cu.phone = payload.phone.strip() or None
    if payload.organization is not None:
        cu.organization = payload.organization.strip() or None
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Updated profile for {cu.email}", "User", cu.id, ip_address=ip)
    db.commit()
    db.refresh(cu)
    return cu

@auth_router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If that email exists, an OTP has been sent."}
    otp = f"{secrets.randbelow(900000)+100000:06d}"
    db.query(PasswordResetOTP).filter(PasswordResetOTP.email == payload.email, PasswordResetOTP.used == False).update({"used": True})
    db.add(PasswordResetOTP(
        email=payload.email,
        otp_hash=hash_password(otp),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    ))
    ip = get_client_ip(request)
    log_action(db, user.id, "SYSTEM", f"Password reset OTP requested for {payload.email}", ip_address=ip)
    db.commit()
    return {"message": "OTP sent to your email.", "dev_otp": otp}

@auth_router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    min_len = min_password_length(db)
    if len(payload.new_password) < min_len:
        raise HTTPException(400, f"Password must be at least {min_len} characters")
    record = (
        db.query(PasswordResetOTP)
        .filter(PasswordResetOTP.email == payload.email, PasswordResetOTP.used == False)
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(400, "OTP expired or invalid. Request a new one.")
    if not verify_password(payload.otp, record.otp_hash):
        raise HTTPException(400, "Invalid OTP")
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.hashed_password = hash_password(payload.new_password)
    record.used = True
    ip = get_client_ip(request)
    log_action(db, user.id, "UPDATE", f"Password reset via OTP for {payload.email}", "User", user.id, ip_address=ip)
    db.commit()
    return {"message": "Password reset successfully. You can sign in now."}

@auth_router.post("/change-password")
def change_password(payload: ChangePasswordRequest, request: Request, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    min_len = min_password_length(db)
    if len(payload.new_password) < min_len:
        raise HTTPException(400, f"New password must be at least {min_len} characters")
    if not verify_password(payload.current_password, cu.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    cu.hashed_password = hash_password(payload.new_password)
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Password changed for {cu.email}", "User", cu.id, ip_address=ip)
    db.commit()
    return {"message": "Password updated successfully"}

# Users management
users_router = APIRouter(prefix="/api/users", tags=["Users"])


def _serialize_user(db: Session, u: User) -> UserOut:
    status = u.account_status.value if hasattr(u.account_status, "value") else str(u.account_status or "active")
    out = UserOut.model_validate(u)
    return out.model_copy(update={
        "school_name": user_out_school_name(db, u.school_id),
        "account_status": status,
    })


def _user_incomplete(u: User) -> Optional[str]:
    rv = u.role.value if hasattr(u.role, "value") else str(u.role)
    if rv == "school" and not u.school_id:
        return "School Head without assigned school"
    if rv in ("district", "enumerator") and not u.district:
        return f"{rv.title()} without assigned district"
    if rv in ("district", "enumerator") and u.district == NATIONAL:
        return f"{rv.title()} cannot use National scope"
    return None


@users_router.get("/assignment-gaps", response_model=AssignmentGapsOut)
def assignment_gaps(db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    headed = {
        u.school_id
        for u in db.query(User).filter(
            User.role == RoleEnum.school,
            User.is_active == True,
            User.school_id.isnot(None),
        ).all()
    }
    unassigned_schools = []
    for s in db.query(School).order_by(School.district, School.name).all():
        if s.id not in headed:
            unassigned_schools.append(UnassignedSchoolOut(
                id=s.id, name=s.name, district=s.district,
                school_code=school_code(s.id),
            ))

    officer_districts = {
        u.district
        for u in db.query(User).filter(
            User.role == RoleEnum.district,
            User.is_active == True,
            User.district.isnot(None),
        ).all()
    }
    unassigned_districts = [d for d in DISTRICT_NAMES if d not in officer_districts]

    incomplete_users = []
    for u in db.query(User).filter(User.is_active == True).all():
        issue = _user_incomplete(u)
        if issue:
            incomplete_users.append(IncompleteUserOut(
                id=u.id, full_name=u.full_name, email=u.email,
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                issue=issue,
            ))

    return AssignmentGapsOut(
        unassigned_schools=unassigned_schools,
        unassigned_districts=unassigned_districts,
        incomplete_users=incomplete_users,
        unassigned_school_count=len(unassigned_schools),
        unassigned_district_count=len(unassigned_districts),
        incomplete_user_count=len(incomplete_users),
    )


@users_router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    role: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    unassigned: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    cu=Depends(require_roles("admin")),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if district:
        q = q.filter(User.district == district)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    if unassigned:
        users = [u for u in users if _user_incomplete(u)]
    return [_serialize_user(db, u) for u in users]


@users_router.get("/pending", response_model=List[UserOut])
def list_pending_users(db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    users = (
        db.query(User)
        .filter(User.account_status == AccountStatusEnum.pending)
        .order_by(User.created_at.desc())
        .all()
    )
    return [_serialize_user(db, u) for u in users]


@users_router.post("/{uid}/approve", response_model=UserOut)
def approve_user(
    uid: int,
    payload: RegistrationReview,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(require_roles("admin")),
):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    if u.account_status != AccountStatusEnum.pending:
        raise HTTPException(400, "User is not pending approval")

    role = payload.role or u.role
    district = payload.district if payload.district is not None else u.district
    school_id = payload.school_id if payload.school_id is not None else u.school_id
    district, school_id = validate_user_scope(
        db, role=role, district=district, school_id=school_id, exclude_user_id=uid,
    )

    u.role = role
    u.district = district
    u.school_id = school_id
    u.account_status = AccountStatusEnum.active
    u.is_active = True
    u.rejection_reason = None
    u.approved_by = cu.id
    u.approved_at = datetime.utcnow()

    ip = get_client_ip(request)
    log_action(db, cu.id, "APPROVE", f"Approved registration for {u.email}", "User", uid, ip_address=ip)
    db.commit()
    db.refresh(u)
    return _serialize_user(db, u)


@users_router.post("/{uid}/reject", response_model=UserOut)
def reject_user(
    uid: int,
    payload: RegistrationReview,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(require_roles("admin")),
):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    if u.account_status != AccountStatusEnum.pending:
        raise HTTPException(400, "User is not pending approval")

    u.account_status = AccountStatusEnum.rejected
    u.is_active = False
    u.rejection_reason = (payload.rejection_reason or "Registration not approved").strip()

    ip = get_client_ip(request)
    log_action(db, cu.id, "REJECT", f"Rejected registration for {u.email}", "User", uid, ip_address=ip)
    db.commit()
    db.refresh(u)
    return _serialize_user(db, u)


@users_router.post("/", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    district, school_id = validate_user_scope(
        db, role=payload.role, district=payload.district, school_id=payload.school_id,
    )
    u = User(
        full_name=payload.full_name.strip(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        district=district,
        school_id=school_id,
        is_active=payload.is_active,
        account_status=AccountStatusEnum.active if payload.is_active else AccountStatusEnum.inactive,
    )
    db.add(u)
    ip = get_client_ip(request)
    scope = f"district={district or '—'}"
    if school_id:
        scope += f", school_id={school_id}"
    log_action(
        db, cu.id, "CREATE",
        f"Provisioned user {payload.email} ({payload.role}) — {scope}",
        "User", ip_address=ip,
    )
    db.commit()
    db.refresh(u)
    return _serialize_user(db, u)


@users_router.patch("/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != u.email:
        if db.query(User).filter(User.email == data["email"], User.id != uid).first():
            raise HTTPException(400, "Email already registered")
    if "password" in data:
        if len(data["password"]) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")
        u.hashed_password = hash_password(data.pop("password"))

    role = data.get("role", u.role)
    district = data["district"] if "district" in data else u.district
    school_id = data["school_id"] if "school_id" in data else u.school_id

    district, school_id = validate_user_scope(
        db, role=role, district=district, school_id=school_id, exclude_user_id=uid,
    )
    data["district"] = district
    data["school_id"] = school_id

    for k, v in data.items():
        setattr(u, k, v)

    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Updated user {u.email}", "User", uid, ip_address=ip)
    db.commit()
    db.refresh(u)
    return _serialize_user(db, u)

@users_router.delete("/{uid}")
def delete_user(uid: int, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    db.delete(u)
    ip = get_client_ip(request)
    log_action(db, cu.id, "DELETE", f"Deleted user {u.email}", "User", uid, ip_address=ip)
    db.commit()
    return {"message": "User deleted"}
