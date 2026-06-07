"""School metrics derived from database fields only."""

from app.models.models import School


def school_code(school_id: int) -> str:
    return f"SCH-{school_id:03d}"


def infrastructure_score(school: School) -> int:
    stu = (school.students_boys or 0) + (school.students_girls or 0)
    tlt = (school.toilets_boys or 0) + (school.toilets_girls or 0)
    pts = 0.0
    max_pts = 10.0
    if school.has_water:
        pts += 1.5
    if school.has_electricity:
        pts += 1.5
    if school.has_library:
        pts += 1.0
    if school.has_ict_lab:
        pts += 1.0
    if school.has_science_lab:
        pts += 0.5
    if school.gps_verified:
        pts += 1.0
    if stu > 0:
        if (school.textbooks or 0) >= stu * 0.7:
            pts += 1.5
        elif (school.textbooks or 0) >= stu * 0.4:
            pts += 0.75
        if (school.desks or 0) >= stu * 0.7:
            pts += 1.5
        elif (school.desks or 0) >= stu * 0.4:
            pts += 0.75
        if tlt >= max(1, stu / 50):
            pts += 1.5
    status_val = school.status.value if hasattr(school.status, "value") else str(school.status)
    if status_val == "good":
        pts += 0.5
    return min(100, int(round((pts / max_pts) * 100)))


def connectivity_label(school: School) -> str:
    """Factual label from has_internet / has_electricity columns — no invented network types."""
    net = bool(school.has_internet)
    pwr = bool(school.has_electricity)
    if net and pwr:
        return "Internet & electricity"
    if net:
        return "Internet only"
    if pwr:
        return "Electricity only"
    return "None"


def resource_rows_for_school(school: School) -> list:
    stu = (school.students_boys or 0) + (school.students_girls or 0) or 1
    rows = []

    def add(name, category, available, required):
        gap = available - required
        if gap >= 0:
            condition = "Good"
        elif abs(gap) > required * 0.3:
            condition = "Critical"
        else:
            condition = "Fair"
        rows.append({
            "id": f"{school.id}-{name}",
            "name": name,
            "category": category,
            "school_id": school.id,
            "school_name": school.name,
            "district": school.district,
            "available": available,
            "required": required,
            "gap": gap,
            "condition": condition,
        })

    add("Textbooks", "Textbook", school.textbooks or 0, stu)
    add("Student Desks", "Furniture", school.desks or 0, stu)
    add("Classrooms", "Infrastructure", school.classrooms or 0, max(1, (stu + 44) // 45))
    if school.has_ict_lab:
        add("ICT Lab seats", "ICT", int((school.desks or 0) * 0.1), int(stu * 0.15))
    return rows
