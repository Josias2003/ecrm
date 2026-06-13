from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_client_ip
from app.models.models import ChatRoom, ChatMessage, ChatParticipant, User, AuditLog
from app.models.models import RoleEnum
from app.schemas.schemas import ChatRoomOut, ChatMessageOut, ChatMessageCreate, ChatContactOut, ChatRoomCreate
from app.core.security import require_roles
from app.data.rwanda_districts import DISTRICT_NAMES

def _district_slug(name: str) -> str:
    return name.lower().replace(" ", "_")

def _district_from_slug(slug: str, fallback: str = None) -> str:
    for d in DISTRICT_NAMES:
        if _district_slug(d) == slug:
            return d
    return fallback

chat_router = APIRouter(prefix="/api/chat", tags=["Chat"])

def _role_value(cu) -> str:
    return cu.role.value if hasattr(cu.role, "value") else str(cu.role)

def _can_access_room(cu, room: ChatRoom, db: Session) -> bool:
    role = _role_value(cu)
    if role == "admin":
        return True
    if role == "reb":
        if room.scope == "school":
            return False
        return room.scope in ("national", "role_group", "district_group", "district", "custom_group", "direct")
    if room.scope == "national":
        return role == "reb"
    if room.scope == "role_group":
        if role == "reb":
            return True
        return room.target_role == role
    if room.scope == "district":
        return role in ("district", "enumerator") and cu.district == room.district
    if room.scope == "district_group":
        if role == "reb":
            return True
        if role == "district" and cu.district == room.district:
            return True
        if role == "school" and room.target_role == "school" and cu.district == room.district:
            return True
        return False
    if room.scope == "custom_group":
        if role == "reb":
            return True
        return db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room.id, ChatParticipant.user_id == cu.id,
        ).first() is not None
    if room.scope == "school":
        if role == "school" and cu.school_id == room.school_id:
            return True
        if role in ("district", "enumerator") and cu.district == room.district:
            return True
        return False
    if room.scope == "direct":
        return db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room.id,
            ChatParticipant.user_id == cu.id,
        ).first() is not None
    return False

def _can_message_user(cu, target: User) -> bool:
    role = _role_value(cu)
    target_role = target.role.value if hasattr(target.role, "value") else str(target.role)
    if role == "admin":
        return target_role != "admin"
    if target_role == "admin":
        return role != "admin"
    if role == "reb":
        return target_role in ("district", "school", "enumerator", "reb")
    if role == "district":
        return target_role in ("school", "enumerator", "reb") and (
            not target.district or target.district == cu.district or target_role == "reb"
        )
    if role == "school":
        return target_role in ("district", "reb") or (
            target_role == "school" and target.district == cu.district
        )
    if role == "enumerator":
        return target_role in ("district", "reb")
    return False

def _users_for_preset(preset: str, db: Session, cu):
    q = db.query(User).filter(User.is_active == True)
    if preset == "all_headmasters":
        return q.filter(User.role == RoleEnum.school).all()
    if preset == "all_enumerators":
        return q.filter(User.role == RoleEnum.enumerator).all()
    if preset == "all_district_officers":
        return q.filter(User.role == RoleEnum.district).all()
    if preset.startswith("headmasters_"):
        slug = preset.replace("headmasters_", "")
        district = _district_from_slug(slug, cu.district)
        return q.filter(User.role == RoleEnum.school, User.district == district).all()
    if preset.startswith("enumerators_"):
        slug = preset.replace("enumerators_", "")
        district = _district_from_slug(slug, cu.district)
        return q.filter(User.role == RoleEnum.enumerator, User.district == district).all()
    return []

@chat_router.get("/presets")
def list_presets(cu=Depends(get_current_user)):
    if _role_value(cu) not in ("reb", "district"):
        return []
    presets = [
        {"id": "all_headmasters", "label": "All Head Masters"},
        {"id": "all_enumerators", "label": "All Field Enumerators"},
        {"id": "all_district_officers", "label": "All District Officers"},
    ]
    for d in DISTRICT_NAMES:
        slug = _district_slug(d)
        presets.append({"id": f"headmasters_{slug}", "label": f"Head Masters — {d}"})
        presets.append({"id": f"enumerators_{slug}", "label": f"Enumerators — {d}"})
    return presets

@chat_router.post("/rooms", response_model=ChatRoomOut, status_code=201)
def create_room(payload: ChatRoomCreate, request: Request, db: Session = Depends(get_db),
                cu=Depends(require_roles("reb", "district"))):
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(400, "Room title is required")
    member_ids = set(payload.member_ids or [])
    if payload.preset:
        for u in _users_for_preset(payload.preset, db, cu):
            member_ids.add(u.id)
    if not member_ids and not payload.preset:
        raise HTTPException(400, "Select a member preset or add members")
    room = ChatRoom(title=title, scope="custom_group")
    db.add(room)
    db.flush()
    db.add(ChatParticipant(room_id=room.id, user_id=cu.id))
    for uid in member_ids:
        if uid != cu.id:
            db.add(ChatParticipant(room_id=room.id, user_id=uid))
    ip = get_client_ip(request)
    db.add(AuditLog(user_id=cu.id, action_type="CHAT", description=f"Created room {title}",
                    entity="ChatRoom", entity_id=room.id, ip_address=ip))
    db.commit()
    db.refresh(room)
    return room

@chat_router.get("/rooms", response_model=List[ChatRoomOut])
def list_rooms(db: Session = Depends(get_db), cu=Depends(get_current_user)):
    rooms = db.query(ChatRoom).order_by(ChatRoom.title).all()
    return [r for r in rooms if _can_access_room(cu, r, db)]

@chat_router.get("/contacts", response_model=List[ChatContactOut])
def list_contacts(db: Session = Depends(get_db), cu=Depends(get_current_user)):
    if _role_value(cu) == "community":
        users = db.query(User).filter(User.is_active == True, User.role == RoleEnum.admin).all()
        out = [ChatContactOut(id=u.id, full_name=u.full_name, role="admin", district=u.district) for u in users]
        return out
    users = db.query(User).filter(User.is_active == True, User.id != cu.id).all()
    out = []
    for u in users:
        if _can_message_user(cu, u):
            out.append(ChatContactOut(
                id=u.id, full_name=u.full_name,
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                district=u.district,
            ))
    return sorted(out, key=lambda x: (x.role, x.full_name))

@chat_router.post("/direct/{user_id}", response_model=ChatRoomOut)
def get_or_create_direct(user_id: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    target = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target:
        raise HTTPException(404, "User not found")
    if _role_value(cu) == "community":
        tr = target.role.value if hasattr(target.role, "value") else str(target.role)
        if tr != "admin":
            raise HTTPException(403, "Community users can only message system administrators")
    elif not _can_message_user(cu, target):
        raise HTTPException(403, "You cannot message this user")

    direct_rooms = db.query(ChatRoom).filter(ChatRoom.scope == "direct").all()
    for room in direct_rooms:
        pids = {p.user_id for p in room.participants}
        if pids == {cu.id, user_id}:
            return room

    title = f"{cu.full_name} ↔ {target.full_name}"
    room = ChatRoom(title=title, scope="direct")
    db.add(room)
    db.flush()
    db.add(ChatParticipant(room_id=room.id, user_id=cu.id))
    db.add(ChatParticipant(room_id=room.id, user_id=user_id))
    db.commit()
    db.refresh(room)
    return room

@chat_router.get("/rooms/{room_id}/messages", response_model=List[ChatMessageOut])
def list_messages(
    room_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    if not _can_access_room(cu, room, db):
        raise HTTPException(403, "Access denied to this chat room")
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    msgs.reverse()
    out = []
    for m in msgs:
        author = db.query(User).filter(User.id == m.user_id).first()
        reply_author_name = None
        reply_content = None
        if m.reply_to_id:
            parent = db.query(ChatMessage).filter(ChatMessage.id == m.reply_to_id).first()
            if parent:
                parent_author = db.query(User).filter(User.id == parent.user_id).first()
                reply_author_name = parent_author.full_name if parent_author else "Unknown"
                reply_content = parent.content[:120] + ("…" if len(parent.content) > 120 else "")
        out.append(ChatMessageOut(
            id=m.id, room_id=m.room_id, user_id=m.user_id, content=m.content,
            reply_to_id=m.reply_to_id,
            reply_author_name=reply_author_name,
            reply_content=reply_content,
            author_name=author.full_name if author else "Unknown",
            author_role=author.role.value if author else None,
            created_at=m.created_at,
        ))
    return out

@chat_router.post("/rooms/{room_id}/messages", response_model=ChatMessageOut, status_code=201)
def post_message(
    room_id: int,
    payload: ChatMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    if not _can_access_room(cu, room, db):
        raise HTTPException(403, "Access denied to this chat room")
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(400, "Message cannot be empty")
    if len(content) > 2000:
        raise HTTPException(400, "Message too long (max 2000 characters)")
    reply_to_id = payload.reply_to_id
    if reply_to_id:
        parent = db.query(ChatMessage).filter(
            ChatMessage.id == reply_to_id, ChatMessage.room_id == room_id,
        ).first()
        if not parent:
            raise HTTPException(400, "Reply target not found in this room")
    msg = ChatMessage(room_id=room_id, user_id=cu.id, content=content, reply_to_id=reply_to_id)
    db.add(msg)
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="CHAT",
        description=f"Message in {room.title}", entity="ChatRoom", entity_id=room_id,
        ip_address=ip,
    ))
    db.commit()
    db.refresh(msg)
    reply_author_name = None
    reply_content = None
    if msg.reply_to_id:
        parent = db.query(ChatMessage).filter(ChatMessage.id == msg.reply_to_id).first()
        if parent:
            parent_author = db.query(User).filter(User.id == parent.user_id).first()
            reply_author_name = parent_author.full_name if parent_author else "Unknown"
            reply_content = parent.content[:120] + ("…" if len(parent.content) > 120 else "")
    return ChatMessageOut(
        id=msg.id, room_id=msg.room_id, user_id=msg.user_id, content=msg.content,
        reply_to_id=msg.reply_to_id,
        reply_author_name=reply_author_name,
        reply_content=reply_content,
        author_name=cu.full_name, author_role=_role_value(cu),
        created_at=msg.created_at,
    )
