from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "thin-muscle-api"
    debug: bool = False
    allow_demo_auth: bool = False
    seed_demo_data: bool = False
    cookie_secure: bool = True
    public_origin: str = ""
    cors_origins: list[str] = []
    database_url: str = "sqlite:///./thin_muscle.db"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_payment_methods: list[str] = ["card"]
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_verify_service_sid: str = ""
    wx_web_app_id: str = ""
    wx_web_app_secret: str = ""
    ai_gateway_base_url: str = "https://api.apikey.fan/v1"
    ai_gateway_api_key: str = ""
    ai_vision_model: str = ""
    ai_food_enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_sender: str = ""
    smtp_starttls: bool = False
    moderation_admin_ids: list[int] = []
    # 市场：标价=买家实付，平台从中抽 15%
    market_fee_rate: float = 0.15
    # 对象存储（密钥私聊后注入）
    oss_endpoint: str = ""
    oss_bucket: str = ""
    oss_access_key: str = ""
    oss_secret_key: str = ""
    # 微信小程序 / 支付（密钥私聊后注入）
    wx_app_id: str = ""
    wx_app_secret: str = ""
    wx_mch_id: str = ""
    wx_pay_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
