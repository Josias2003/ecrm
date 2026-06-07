"""
ECRM Database Seed Script
Usage: cd backend && python -m app.seeds.seed
Generates realistic Rwanda data deterministically — same output every run.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import datetime
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models.models import (Base, User, School, Teacher, Feedback,
                                FeedbackMessage, PasswordResetOTP,
                                ResourceAlert, EnrollmentHistory, AuditLog,
                                ChatRoom, ChatMessage, ChatParticipant,
                                StatusEnum, AlertLevelEnum)
from app.data.rwanda_districts import RWANDA_DISTRICTS, DISTRICT_NAMES

# ── Deterministic RNG ──────────────────────────────────────────────
def mkrng(seed=42):
    s = [seed & 0xFFFFFFFF]
    def rng():
        s[0] = (s[0] * 1664525 + 1013904223) & 0xFFFFFFFF
        return s[0] / 0xFFFFFFFF
    return rng

def ri(r, a, b): return int(r() * (b - a + 1)) + a
def rf(r, a, b): return r() * (b - a) + a
def pick(r, items): return items[int(r() * len(items))]
def weighted(r, items, weights):
    acc, x = 0, r()
    for item, w in zip(items, weights):
        acc += w
        if x <= acc: return item
    return items[-1]

# ── Rwanda Data (30 districts, national coverage) ─────────────────
SCHOOLS_PER_DISTRICT = 13
SPREAD = 0.045

FNAMES = ["Alice","Emmanuel","Grace","James","Sandra","Denis","Claudine","Patrick",
          "Solange","Jean","Marie","Pierre","Odette","Etienne","Vestine","Innocent",
          "Celestin","Scholastique","Alexis","Beatrice","Vincent","Esperance",
          "Norbert","Annonciate","Fidele","Josiane","Olivier","Francine","Leon",
          "Rosine","Theophile","Immaculee","Gerard","Donatha","Edmond"]
LNAMES = ["Uwimana","Nkusi","Kabera","Mugenzi","Ishimwe","Habimana","Mukamana",
          "Niyonzima","Ingabire","Uwase","Karema","Ndayisaba","Bizimana",
          "Nsengiyumva","Tuyishime","Nzeyimana","Karangwa","Gatera","Muvunyi",
          "Sezirahiga","Uwihoreye","Ntawuhiganayo","Kayitare","Hakizimana","Gasana"]

P_SUBJECTS = ["Mathematics","English","Kinyarwanda","Science","Social Studies",
               "Physical Education","Religious Education","Creative Arts"]
S_SUBJECTS = ["Mathematics","English","Kinyarwanda","Biology","Chemistry","Physics",
               "History","Geography","ICT","French","Economics","Entrepreneurship"]
QUALS  = ["A2","A1","A0","Masters","PhD"]
QWGTS  = [0.30, 0.38, 0.24, 0.07, 0.01]
ETYPES = ["Permanent","Contract","Volunteer"]
EWGTS  = [0.70, 0.25, 0.05]

FB_TYPES = ["Infrastructure","Teacher Absence","Resources","Sanitation","Safety","Administration"]
FB_ISSUES = {
    "Infrastructure":  ["Roof leaking in classrooms","Perimeter wall collapsed","Windows broken","Floor damaged"],
    "Teacher Absence": ["Teacher absent for days","Position vacant for months","Late arrivals"],
    "Resources":       ["No textbooks for class","Students sitting on floor","No chalk/materials"],
    "Sanitation":      ["Toilets not functional","No running water","Open garbage near school"],
    "Safety":          ["Exposed electrical wiring","No fence around well","Stray dogs in compound"],
    "Administration":  ["School fees issues","Timetable not followed","Records not updated"],
}
REPORTERS = ["Parent","Community Member","Head Teacher","Local Leader","Student","NGO Worker"]
FB_STATS  = ["pending","reviewed","resolved"]
FB_WGTS   = [0.50, 0.30, 0.20]

def compute_status(s):
    total_stu = (s.students_boys or 0) + (s.students_girls or 0)
    total_tea = (s.teachers_male or 0) + (s.teachers_female or 0)
    total_tlt = (s.toilets_boys or 0) + (s.toilets_girls or 0)
    if total_stu == 0: return StatusEnum.moderate
    score = sum([
        s.has_water,
        s.has_electricity,
        total_tlt >= max(1, total_stu // 50),
        s.textbooks >= total_stu * 0.7,
        s.desks >= total_stu * 0.8,
        s.classrooms >= max(1, total_stu // 45),
        s.has_library,
        s.gps_verified,
    ])
    if score >= 6: return StatusEnum.good
    if score >= 3: return StatusEnum.moderate
    return StatusEnum.critical

def generate_alerts(school, rng):
    alerts = []
    total_stu = (school.students_boys or 0) + (school.students_girls or 0)
    total_tlt = (school.toilets_boys or 0) + (school.toilets_girls or 0)
    total_tea = (school.teachers_male or 0) + (school.teachers_female or 0)
    if total_stu > 0:
        ratio = total_stu / max(total_tea, 1)
        if school.textbooks < total_stu * 0.5:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="textbook_shortage",
                level=AlertLevelEnum.critical,
                message=f"Only {school.textbooks} textbooks for {total_stu} students — critical shortage"))
        elif school.textbooks < total_stu * 0.7:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="textbook_shortage",
                level=AlertLevelEnum.warning,
                message=f"Textbook shortage: {school.textbooks}/{total_stu} available"))
        if school.desks < total_stu * 0.6:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="desk_shortage",
                level=AlertLevelEnum.warning,
                message=f"Desk shortage: {school.desks} desks for {total_stu} students"))
        if total_tlt < total_stu // 50:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="sanitation_gap",
                level=AlertLevelEnum.critical,
                message=f"Only {total_tlt} toilets for {total_stu} students — below 1:50 standard"))
        if ratio > 50:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="teacher_overload",
                level=AlertLevelEnum.warning,
                message=f"High pupil-teacher ratio: 1:{ratio:.0f} — recommended max 1:45"))
        if not school.has_water:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="no_water",
                level=AlertLevelEnum.critical,
                message="School has no running water — health and sanitation risk"))
        if not school.gps_verified:
            alerts.append(ResourceAlert(school_id=school.id, alert_type="gps_unverified",
                level=AlertLevelEnum.info,
                message="GPS coordinates not yet field-verified"))
    return alerts


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Wipe all data
    for model in [FeedbackMessage, PasswordResetOTP, ChatMessage, ChatParticipant, ChatRoom, AuditLog, ResourceAlert, EnrollmentHistory, Feedback, Teacher, User, School]:
        db.query(model).delete()
    db.commit()

    rng = mkrng(42)
    schools = []
    pfx = {"Primary": ["GS","EP"], "Secondary": ["LS","CS","ES"]}

    # ── SEED SCHOOLS (30 districts × ~13 schools) ────────────────
    print(f"  Seeding schools across {len(RWANDA_DISTRICTS)} districts...")
    for dist in RWANDA_DISTRICTS:
        for n in range(SCHOOLS_PER_DISTRICT):
            sector = pick(rng, dist["sectors"])
            stype = weighted(rng, ["Primary", "Secondary"], [0.68, 0.32])
            cls   = ri(rng, 5, 24)
            boys  = cls * ri(rng, 14, 28)
            girls = cls * ri(rng, 14, 26)
            stu   = boys + girls
            tmale = max(1, round(stu * rf(rng, 1/55, 1/28) * rf(rng, 0.3, 0.6)))
            tfem  = max(1, round(stu * rf(rng, 1/55, 1/28) * rf(rng, 0.4, 0.7)))
            txt   = round(stu * rf(rng, 0.35, 1.05))
            dsk   = round(stu * rf(rng, 0.45, 1.0))
            tlt_b = max(1, round(boys * rf(rng, 1/90, 1/25)))
            tlt_g = max(1, round(girls * rf(rng, 1/90, 1/25)))
            lat   = dist["lat"] + (rng() - 0.5) * 2 * SPREAD
            lng   = dist["lng"] + (rng() - 0.5) * 2 * SPREAD
            gps_v = rng() > 0.28
            water = rng() > 0.32
            elec  = rng() > 0.28
            lib   = rng() > 0.52
            ict   = rng() > 0.70
            sci   = rng() > 0.78
            inet  = rng() > 0.80
            fence = rng() > 0.42
            dist_road = round(rf(rng, 0.2, 8.0), 2)

            s = School(
                name=f"{pick(rng, pfx[stype])} {sector} {n+1}",
                district=dist["name"], sector=sector,
                school_type=stype,
                ownership=weighted(rng, ["Public", "Private", "Faith-based"], [0.82, 0.10, 0.08]),
                latitude=round(lat, 5), longitude=round(lng, 5),
                gps_verified=gps_v,
                students_boys=boys, students_girls=girls,
                teachers_male=tmale, teachers_female=tfem,
                classrooms=cls, classrooms_good=max(1, cls - ri(rng, 0, 3)),
                textbooks=txt, desks=dsk,
                toilets_boys=tlt_b, toilets_girls=tlt_g,
                has_library=lib, has_ict_lab=ict, has_science_lab=sci,
                has_water=water, has_electricity=elec,
                has_internet=inet, has_fence=fence,
                distance_to_road_km=dist_road,
            )
            s.status = compute_status(s)
            db.add(s)
            schools.append(s)

    db.commit()
    db.expire_all()
    schools = db.query(School).all()
    print(f"     OK: {len(schools)} schools seeded")

    # ── SEED USERS ────────────────────────────────────────────────
    print("  Seeding users...")
    gs_school = next((s for s in schools if s.district == "Gasabo"), schools[0])
    users_data = [
        dict(full_name="Amahoro Jean",    email="admin@reb.rw",            password="Admin@1234",   role="admin",      district="National",   school_id=None),
        dict(full_name="Uwase Marie",     email="uwase@mineduc.gov.rw",    password="Reb@1234",     role="reb",        district="National",   school_id=None),
        dict(full_name="Habimana Eric",   email="eric@gasabo.gov.rw",      password="District@1",   role="district",   district="Gasabo",     school_id=None),
        dict(full_name="Mukamana Claire", email="claire@kicukiro.gov.rw",  password="District@2",   role="district",   district="Kicukiro",   school_id=None),
        dict(full_name="Nzeyimana Jules", email="jules@nyarugenge.gov.rw", password="District@3",   role="district",   district="Nyarugenge", school_id=None),
        dict(full_name="Niyonzima Paul",  email="paul@school.rw",          password="School@1234",  role="school",     district="Gasabo",     school_id=gs_school.id),
        dict(full_name="Ingabire Rose",   email="rose@reb.rw",             password="Field@1234",   role="enumerator", district="Kicukiro",   school_id=None),
        dict(full_name="Mukeza David",    email="david@gmail.com",         password="Comm@1234",    role="community",  district="Gasabo",     school_id=None),
    ]
    assigned_districts = {u["district"] for u in users_data if u["role"] == "district"}
    for dist_name in DISTRICT_NAMES:
        if dist_name in assigned_districts:
            continue
        slug = dist_name.lower().replace(" ", "").replace("'", "")
        users_data.append(dict(
            full_name=f"{dist_name} District Officer",
            email=f"officer.{slug}@district.gov.rw",
            password="District@1",
            role="district",
            district=dist_name,
            school_id=None,
        ))
    for u in users_data:
        db.add(User(full_name=u["full_name"], email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"], district=u["district"], school_id=u["school_id"]))
    db.commit()
    print(f"     OK: {len(users_data)} users seeded")

    # ── SEED TEACHERS ─────────────────────────────────────────────
    print("  Seeding teachers...")
    rng2 = mkrng(77)
    t_count = 0
    batch = []
    for school in schools:
        subjects = S_SUBJECTS if school.school_type == "Secondary" else P_SUBJECTS
        n_teachers = (school.teachers_male or 0) + (school.teachers_female or 0)
        for i in range(n_teachers):
            gender = "Female" if i < (school.teachers_female or 0) else "Male"
            batch.append(Teacher(
                school_id=school.id,
                full_name=f"{pick(rng2, FNAMES)} {pick(rng2, LNAMES)}",
                gender=gender,
                subject=pick(rng2, subjects),
                qualification=weighted(rng2, QUALS, QWGTS),
                employment_type=weighted(rng2, ETYPES, EWGTS),
                status="Active" if rng2() > 0.07 else "Absent",
                join_year=ri(rng2, 2010, 2025),
                phone=f"+25078{ri(rng2,1000000,9999999)}",
            ))
            t_count += 1
            if len(batch) >= 500:
                db.add_all(batch)
                db.commit()
                batch.clear()
    if batch:
        db.add_all(batch)
        db.commit()
    print(f"     OK: {t_count} teachers seeded")

    # ── SEED FEEDBACK ─────────────────────────────────────────────
    print("  Seeding feedback...")
    rng3 = mkrng(99)
    fb_count = 0
    months = ["2025-09","2025-10","2025-11","2025-12","2026-01"]
    for school in schools:
        if school.status.value == "good" and rng3() > 0.25: continue
        count = ri(rng3,2,5) if school.status.value == "critical" else ri(rng3,0,3)
        for _ in range(count):
            ftype = pick(rng3, FB_TYPES)
            issues = FB_ISSUES[ftype]
            issue = pick(rng3, issues)
            month = pick(rng3, months)
            day = str(ri(rng3, 1, 28)).zfill(2)
            status = weighted(rng3, FB_STATS, FB_WGTS)
            db.add(Feedback(
                school_id=school.id,
                issue_type=ftype, description=issue,
                reporter_name=f"{pick(rng3,FNAMES)} {pick(rng3,LNAMES)}",
                reporter_contact=f"+25078{ri(rng3,1000000,9999999)}",
                status=status,
                reviewer_note="Will follow up with district officer" if status in ["reviewed","resolved"] else None,
            ))
            fb_count += 1
    db.commit()
    print(f"     OK: {fb_count} feedback records seeded")

    # ── SEED RESOURCE ALERTS ──────────────────────────────────────
    print("  Seeding resource alerts...")
    rng4 = mkrng(55)
    db.expire_all()
    schools_fresh = db.query(School).all()
    al_count = 0
    for school in schools_fresh:
        for alert in generate_alerts(school, rng4):
            db.add(alert)
            al_count += 1
    db.commit()
    print(f"     OK: {al_count} alerts generated")

    # ── SEED ENROLLMENT HISTORY ───────────────────────────────────
    print("  Seeding enrollment history...")
    rng5 = mkrng(33)
    for school in schools:
        base_b = school.students_boys or 0
        base_g = school.students_girls or 0
        for yr in [2022, 2023, 2024, 2025]:
            factor = (yr - 2021) * 0.05
            db.add(EnrollmentHistory(
                school_id=school.id, year=yr, term=1,
                students_boys=max(0, round(base_b * (1 - 0.15 + factor) + ri(rng5,-20,20))),
                students_girls=max(0, round(base_g * (1 - 0.15 + factor) + ri(rng5,-20,20))),
                teachers=(school.teachers_male or 0) + (school.teachers_female or 0),
            ))
    db.commit()
    print("     OK: Enrollment history for 4 years seeded")

    # ── SEED CHAT ROOMS ───────────────────────────────────────────
    print("  Seeding chat rooms...")
    db.add(ChatRoom(title="National Coordination", scope="national"))
    db.add(ChatRoom(title="Head Masters", scope="role_group", target_role="school"))
    db.add(ChatRoom(title="Field Enumerators", scope="role_group", target_role="enumerator"))
    db.add(ChatRoom(title="District Officers", scope="role_group", target_role="district"))
    for d in DISTRICT_NAMES:
        db.add(ChatRoom(title=f"{d} Field Team", scope="district", district=d))
        db.add(ChatRoom(title=f"{d} Head Masters", scope="district_group", target_role="school", district=d))
    for school in schools[:60]:
        db.add(ChatRoom(title=f"{school.name} Staff", scope="school", school_id=school.id, district=school.district))
    db.commit()
    print("     OK: Chat rooms seeded")

    # ── SEED AUDIT LOGS ───────────────────────────────────────────
    db.add(AuditLog(action_type="SYSTEM", description="Database seeded successfully",
                    entity="System"))
    db.commit()
    db.close()

    print("\n" + ("-" * 55))
    print("SEED COMPLETE")
    print("-" * 55)
    print(f"  Districts: {len(DISTRICT_NAMES)}")
    print(f"  Schools:   {len(schools)}")
    print(f"  Teachers:  {t_count}")
    print(f"  Feedback:  {fb_count}")
    print(f"  Alerts:    {al_count}")
    print("-" * 55)
    print("\n  Login credentials:")
    for u in users_data:
        print(f"  {u['role']:12} | {u['email']:35} | {u['password']}")

if __name__ == "__main__":
    print("\nECRM Database Seed\n")
    seed()
