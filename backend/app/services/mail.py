"""Account mail adapter. Never log credentials, addresses or recovery links."""

import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def ready():
    return bool(
        settings.smtp_host
        and settings.smtp_sender
        and settings.public_origin.startswith("https://")
    )


def send_account_link(address, link, purpose):
    message = EmailMessage()
    message["Subject"] = "薄肌俱乐部 · " + (
        "验证恢复邮箱" if purpose == "verify_email" else "重置密码"
    )
    message["From"] = settings.smtp_sender
    message["To"] = address
    message.set_content(
        f"请在 15 分钟内打开以下链接：\n{link}\n\n链接仅能使用一次。如果不是你发起，请忽略这封邮件。"
    )
    deliver(message)


def send_reminder(address, kind):
    message = EmailMessage()
    message["Subject"] = "薄肌俱乐部 · " + (
        "训练提醒" if kind == "training" else "恢复提醒"
    )
    message["From"] = settings.smtp_sender
    message["To"] = address
    message.set_content(
        (
            "按你的计划，记得记录今天的训练。"
            if kind == "training"
            else "按你的设置，提醒你安排恢复和休息。"
        )
        + "\n可在训练总览关闭或调整提醒；这不是根据身体状态自动生成的医疗或恢复建议。"
    )
    deliver(message)


def deliver(message):
    context = ssl.create_default_context()
    if settings.smtp_starttls:
        client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
    else:
        client = smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=15, context=context
        )
    with client:
        if settings.smtp_starttls:
            client.starttls(context=context)
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
