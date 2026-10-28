from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, home, market, auth, sync, food, identity, payments
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
app.include_router(payments.router, prefix="/api/v1")
app.include_router(identity.router, prefix="/api/v1")
app.include_router(food.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(market.router, prefix="/api/v1")
app.include_router(home.router, prefix="/api/v1")


def _rank_hourly_worker():
    import threading
    import time
    from app.services import home as home_svc

    def loop():
        time.sleep(3600)  # 启动时 seed 已落首屏快照，避免抢跑写空榜
        while True:
            try:
                db = SessionLocal()
                try:
                    home_svc.write_hourly_snapshots(db)
                finally:
                    db.close()
            except Exception:
                pass
            time.sleep(3600)

    threading.Thread(target=loop, name="rank-hourly", daemon=True).start()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if settings.seed_demo_data:
            seed_demo(db)
    finally:
        db.close()
    _rank_hourly_worker()


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
