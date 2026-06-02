from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles, hash_password, verify_password, create_access_token, get_client_ip
from app.models.models import User, AuditLog
from app.schemas.schemas import LoginRequest, TokenResponse, UserCreate, UserUpdate, UserOut
from typing import List

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
    token = create_access_token({"sub": str(user.id)})
    ip = get_client_ip(request)
    log_action(db, user.id, "LOGIN", f"{user.full_name} signed in", ip_address=ip)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}

@auth_router.get("/me", response_model=UserOut)
def me(cu=Depends(get_current_user)):
    return cu

@auth_router.post("/logout")
def logout(cu=Depends(get_current_user), request: Request = None, db: Session = Depends(get_db)):
    ip = get_client_ip(request) if request else "unknown"
    log_action(db, cu.id, "LOGOUT", f"{cu.full_name} signed out", ip_address=ip)
    db.commit()
    return {"message": "Logged out"}

# Users management
users_router = APIRouter(prefix="/api/users", tags=["Users"])

@users_router.get("/", response_model=List[UserOut])
def list_users(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
               db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    return db.query(User).offset(skip).limit(limit).all()

@users_router.post("/", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    u = User(full_name=payload.full_name, email=payload.email,
             hashed_password=hash_password(payload.password),
             role=payload.role, district=payload.district, school_id=payload.school_id)
    db.add(u)
    ip = get_client_ip(request)
    log_action(db, cu.id, "CREATE", f"Created user {payload.email} ({payload.role})", "User", ip_address=ip)
    db.commit()
    db.refresh(u)
    return u

@users_router.patch("/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(u, k, v)
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Updated user {u.email}", "User", uid, ip_address=ip)
    db.commit()
    db.refresh(u)
    return u

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
