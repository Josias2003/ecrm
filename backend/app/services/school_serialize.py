from app.models.models import School
from app.schemas.schemas import SchoolOut
from app.services.school_metrics import school_code, infrastructure_score, connectivity_label


def serialize_school(school: School) -> SchoolOut:
    base = SchoolOut.model_validate(school)
    stu = (school.students_boys or 0) + (school.students_girls or 0)
    tea = (school.teachers_male or 0) + (school.teachers_female or 0)
    status = school.status.value if hasattr(school.status, "value") else str(school.status)
    return base.model_copy(update={
        "status": status,
        "school_code": school_code(school.id),
        "infrastructure_score": infrastructure_score(school),
        "connectivity_label": connectivity_label(school),
        "total_students": stu,
        "total_teachers": tea,
    })
