from app.models.notifications import Notification


def add_notification(db, user_id, actor_id, kind, target_kind, target_id, event):
    if user_id == actor_id:
        return
    key = f"{user_id}:{event}"
    db.flush()
    if not db.query(Notification.id).filter_by(event_key=key).first():
        db.add(
            Notification(
                user_id=user_id,
                actor_id=actor_id,
                event_key=key,
                kind=kind,
                target_kind=target_kind,
                target_id=target_id,
            )
        )
