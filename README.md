# thin-muscle

薄肌健身项目，统一管理前后端。

- `backend/`：FastAPI 后端，包含 API、数据模型及 Python 依赖。
- `frontend/`：训练跟踪网页原型，包含 HTML、CSS 和 JavaScript。

## 后端启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

接口文档：http://127.0.0.1:8000/docs 。默认 SQLite 数据库会在启动时创建，本地数据库与上传内容不纳入版本管理。

## 前端启动

另开终端，在仓库根目录执行：

```bash
python3 -m http.server 8080 --directory frontend
```

浏览器访问 http://127.0.0.1:8080 。也可直接打开 `frontend/index.html` 预览。前端默认请求 `http://127.0.0.1:8000` 的后端接口。

各目录保留原有 `.gitignore`，忽略密钥、本地环境、运行数据及生成文件。
