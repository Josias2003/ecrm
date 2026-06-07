from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings
from app.core.database import ensure_schema
from app.routes import (
    auth_router, users_router, schools_router,
    teachers_router, feedback_router, alerts_router,
    analytics_router, logs_router, enrollment_router,
    reports_router, chat_router, system_router, meta_router,
)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ECRM API",
    description="Education Community Resource Mapping — Rwanda",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    redirect_slashes=False,
)

app.state.limiter = limiter
ensure_schema()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )

for router in [auth_router, users_router, schools_router, teachers_router,
               feedback_router, alerts_router, analytics_router,
               logs_router, enrollment_router, reports_router, chat_router, system_router, meta_router]:
    app.include_router(router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ECRM API v1.0.0", "country": "Rwanda"}
