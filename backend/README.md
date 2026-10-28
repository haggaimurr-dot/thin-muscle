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
