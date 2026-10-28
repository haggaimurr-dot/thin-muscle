# thin-muscle

薄肌健身项目，统一管理前后端。

- `backend/`：FastAPI 后端，包含 API、数据模型及 Python 依赖。
- `frontend/`：Vue 3 + Vite 响应式网页端，覆盖训练、饮食、社区、市场和动作评估演示。

## 后端启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
COOKIE_SECURE=false PUBLIC_ORIGIN=http://127.0.0.1:5173 uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

接口文档：http://127.0.0.1:8000/docs 。本机开发命令中的 HTTP 设置只用于本机；正式环境请使用 HTTPS。默认 SQLite 数据库会在启动时创建，本地数据库与上传内容不纳入版本管理。

## 前端启动

需要 Node.js 22.12+。另开终端执行：

```bash
cd frontend
npm ci
npm run dev
```

前端默认端口 `5173`，Vite 将 `/api` 同源代理到后端 `8000`，适配电脑、平板和手机。生产构建执行 `npm run build`，本地生产预览执行 `npm run preview`。

功能范围、数据存储、部署与浏览器测试说明见 [frontend/README.md](frontend/README.md)。AI 评估、饮食识别及支付流程沿用原型演示模式。

各目录保留 `.gitignore`，忽略密钥、本地环境、运行数据及生成文件。

## 账号、安全和部署

当前代码默认启用正式账号认证并关闭开发头鉴权、自动演示数据及假付款。账号记录支持云端持久化与版本冲突检测。首次上线前请按 [统一部署与配置清单](deploy/DEPLOYMENT.md) 设置 HTTPS、会话 Cookie 和可选服务商配置。AI 动作视频解析暂缓；饮食图片、短信、微信和 Stripe 支付适配需真实凭据与联调。
