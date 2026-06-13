from app.routes.auth import auth_router, users_router
from app.routes.schools import schools_router
from app.routes.teachers import teachers_router
from app.routes.feedback import feedback_router
from app.routes.alerts import alerts_router
from app.routes.analytics import analytics_router
from app.routes.logs import logs_router, enrollment_router
from app.routes.reports import reports_router
from app.routes.report_assignments import report_assignments_router
from app.routes.chat import chat_router
from app.routes.system import system_router
from app.routes.meta import meta_router
from app.routes.settings import settings_router
from app.routes.requests import requests_router
from app.routes.data_entry import data_entry_router

__all__ = [
    "auth_router", "users_router", "schools_router",
    "teachers_router", "feedback_router", "alerts_router",
    "analytics_router", "logs_router", "enrollment_router",
    "reports_router", "report_assignments_router", "chat_router", "system_router", "meta_router",
    "settings_router", "requests_router", "data_entry_router",
]
