from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    health,
    home,
    market,
    auth,
    sync,
    food,
    identity,
    payments,
    photos,
    badges,
    account_security,
    reminders,
    market_extras,
    moderation,
    notifications,
    replies,
    rank_privacy,
    work_versions,
    profile,
    user_foods,
)
from app.core.config import settings
from app.core.db import Base, SessionLocal, engine
from app.models import account, entities, home as home_models  # noqa: F401
from app.services.seed import seed_demo

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(badges.router, prefix="/api/v1")
app.include_router(photos.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(identity.router, prefix="/api/v1")
app.include_router(food.router, prefix="/api/v1")
app.include_router(user_foods.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(account_security.router, prefix="/api/v1")
app.include_router(reminders.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(market.router, prefix="/api/v1")
app.include_router(market_extras.router, prefix="/api/v1")
app.include_router(moderation.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(replies.router, prefix="/api/v1")
app.include_router(rank_privacy.router, prefix="/api/v1")
app.include_router(work_versions.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(home.router, prefix="/api/v1")


def _rank_hourly_worker(stop):
    import threading
    from app.services import home as home_svc

    def loop():
        while not stop.wait(3600):
            try:
                db = SessionLocal()
                try:
                    home_svc.write_hourly_snapshots(db)
                finally:
                    db.close()
            except Exception:
                pass

    threading.Thread(target=loop, name="rank-hourly", daemon=True).start()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # create_all does not add newly declared indexes to existing tables.
    for table in (entities.MarketListing.__table__, entities.TrainingNode.__table__):
        for index in table.indexes:
            if index.name.startswith(("ix_market_status_", "ix_nodes_owner_")):
                index.create(bind=engine, checkfirst=True)
    db = SessionLocal()
    try:
        if settings.seed_demo_data:
            seed_demo(db)
    finally:
        db.close()
    import threading
    from app.services.reminders import tick
    from app.services import mail

    stop = threading.Event()
    if not hasattr(app.state, "worker_stops"):
        app.state.worker_stops = []
    app.state.worker_stops.append(stop)
    _rank_hourly_worker(stop)

    def reminder_loop():
        while not stop.wait(30):
            with SessionLocal() as reminder_db:
                try:
                    tick(reminder_db)
                except Exception:
                    reminder_db.rollback()

    if mail.ready():
        threading.Thread(target=reminder_loop, name="reminders", daemon=True).start()


@app.on_event("shutdown")
def on_shutdown():
    stops = getattr(app.state, "worker_stops", [])
    if stops:
        stops.pop().set()


@app.middleware("http")
async def browser_protection(request, call_next):
    from fastapi.responses import JSONResponse

    if (
        settings.cookie_secure
        and request.url.scheme != "https"
        and request.url.path.startswith("/api/v1/auth/")
        and request.url.path != "/api/v1/auth/capabilities"
    ):
        return JSONResponse({"detail": "正式登录需要 HTTPS 连接"}, status_code=426)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        # Block cross-site cookie/login CSRF, even before a session exists.
        allowed = (
            {settings.public_origin}
            if settings.public_origin
            else {str(request.base_url).rstrip("/")}
        )
        if origin and origin not in allowed:
            return JSONResponse({"detail": "请求来源不允许"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response
