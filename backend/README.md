# thin-muscle-api

薄肌健身小程序后端（FastAPI）

## 市场 v2（字段表）

- 商品 `kind`：`plan`（周/月/全程）| `lesson`（教学模块）
- 复刻：**媒体全保留** → `GET /api/v1/market/nodes` 训练节点库
- 拼装：`POST /api/v1/market/assemble`，须 `ack_weight` + `ack_level`；`lesson_node_id` 只能挂在动作学法位
- 价格字段：`price_fen`（分），抽成 15%
- 筛选：`kind` + `cycle` + `level`

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
COOKIE_SECURE=false PUBLIC_ORIGIN=http://127.0.0.1:5173 uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

正式模式使用 `/api/v1/auth/register`、`/login`、`/me`、`/logout`，浏览器通过 HttpOnly Cookie 登录，写操作同时验证 CSRF。`X-User-Id` 默认无效。注册密码至少 10 位。

旧开发头只在 `ALLOW_DEMO_AUTH=true` 的隔离演示环境可用；演示种子数据另由 `SEED_DEMO_DATA=true` 控制。生产不要开启。

账号记录通过 `/api/v1/data` GET/PUT 同步；PUT 必须提交读取到的 revision，冲突返回 409。新表为增量创建，不修改旧表列或认领旧演示账号。部署和各服务商参数见 [集中部署清单](../deploy/DEPLOYMENT.md)。

本地验证：`.venv/bin/python -m pip install -r requirements-dev.txt`，然后 `.venv/bin/python -m unittest discover -s tests -v`。

## 账号安全与身份绑定

登录后从「账号安全」修改密码、验证恢复邮箱、管理登录方式或注销。密码找回需要提前验证恢复邮箱；链接有效 15 分钟且只能使用一次。修改/重置密码撤销所有旧会话。注销立即清除私人数据，有作品或任何订单时拒绝注销；仅保留无个人资料的用户编号占位以防旧设备缓存关联新账号。

邮件需配置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_SENDER`，以及服务商需要的 `SMTP_USERNAME`、`SMTP_PASSWORD`；`PUBLIC_ORIGIN` 必须为真实 HTTPS 站点。默认 SMTPS 465；STARTTLS 时设置 `SMTP_STARTTLS=true` 及服务商端口（通常 587），不会降级到明文发送。没有配置时界面明确提示未开通。上线前用测试邮箱验证投递、过期、重复链接与失败重试，本地模拟测试不能代替真实邮件验收。

手机号和微信绑定复用现有 Twilio/微信参数，目标身份属于其他账号时拒绝自动合并。解绑至少保留一种已配置的登录方式，并撤销其他设备的会话；微信非 UnionID 身份还必须匹配原 AppID。新增表由启动过程增量创建，旧账号无恢复邮箱，旧表结构保持兼容。
