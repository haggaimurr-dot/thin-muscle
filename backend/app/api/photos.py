import io
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from PIL import Image, UnidentifiedImageError, ImageOps
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.auth import current_user
from app.core.db import get_db
from app.models.account import TrainingPhoto
from app.models.entities import User

router = APIRouter(prefix="/photos", tags=["training photos"])


@router.post("")
async def upload(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    raw = await file.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "图片不能超过 8MB")
    used = (
        db.scalar(
            func.sum(func.length(TrainingPhoto.content))
            .select()
            .where(TrainingPhoto.user_id == user.id)
        )
        or 0
    )
    if used >= 100 * 1024 * 1024:
        raise HTTPException(413, "图片空间已满（100MB），请先删除不需要的记录图片")
    try:
        with Image.open(io.BytesIO(raw)) as source:
            if (
                source.format not in ("JPEG", "PNG", "WEBP")
                or source.width * source.height > 20_000_000
            ):
                raise ValueError()
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((1280, 1280))
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=78)
    except (ValueError, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "请选择有效的 JPEG、PNG 或 WebP 图片")
    if used + len(output.getvalue()) > 100 * 1024 * 1024:
        raise HTTPException(413, "图片空间已满（100MB），请先删除不需要的记录图片")
    photo = TrainingPhoto(
        id=secrets.token_hex(16), user_id=user.id, content=output.getvalue()
    )
    db.add(photo)
    db.commit()
    return {"id": photo.id}


@router.get("/{photo_id}")
def read(
    photo_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    photo = db.get(TrainingPhoto, photo_id)
    if not photo or photo.user_id != user.id:
        raise HTTPException(404, "图片不存在或无权查看")
    return Response(
        photo.content,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
