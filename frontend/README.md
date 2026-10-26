# 薄肌 · Vue 网页端

Vue 3 + Vue Router + Vite，复用现有 FastAPI 接口。桌面侧栏、平板自适应布局、手机底部导航；支持 320px 起的窄屏。

## 本地开发

需要 Node.js 22.12+（当前环境 Node.js 24）、Python 3.12。

先启动后端：

```bash
cd /workspace/thin-muscle/backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

另一个终端启动前端：

```bash
cd /workspace/thin-muscle/frontend
npm ci
npm run dev
```

前端默认端口 `5173`。手机与电脑在同一可访问网络时，使用开发机 IP 和该端口访问。请求通过 Vite `/api` 代理到后端，手机无需连接自身的 localhost。云环境的对外访问以平台支持方式为准。

- `API_PROXY_TARGET`：开发/预览代理目标，默认 `http://127.0.0.1:8000`。
- `VITE_API_BASE`：可选的构建时 API 前缀，默认 `/api/v1`。
- 当前沿用后端开发账号 `X-User-Id: 4`，尚非生产登录鉴权。

## 功能与数据

| 页面 | 功能 | 数据来源 |
| --- | --- | --- |
| 训练总览 | 周进度、力量/超负荷/蛋白/连续周统计、今日计划 | 浏览器记录；社区摘要来自 API |
| 我的训练 | 早晚训练、动作勾选、四周阶段、重量/次数/RPE、历史编辑删除、教学视频链接 | 浏览器本地存储 |
| 饮食管理 | 蛋白增减、食物/成分表演示、份量调整、记入与撤销、历史记录 | 浏览器本地存储 |
| 训练社区 | 动态、点赞、留言、关注/取消关注、五维周/月榜 | FastAPI |
| 健身市场 | 筛选、作品详情、点赞留言、方案/教学发布、演示复刻、训练节点、方案拼装与教学绑定 | FastAPI；应用后的每周计划保存在浏览器 |
| 动作实验室 | 本地视频预览、演示评分、时间点提示、历史对比、写入训练记录 | 浏览器本地存储 |

原型中的 AI 动作评估、饮食识别和支付仍为演示，不会真实识别、上传文件或扣款。页面明确标记演示结果。微信登录、支付及对象存储未接入。

兼容读取原版的 `tm_*` 存储键，不自动注入或覆盖演示记录。浏览器记录与当前访问来源绑定；更换域名/端口后不会自动迁移。侧栏可导出 JSON 备份；当前没有导入入口。`js/app.js` 与 `css/styles.css` 保留作为原型功能参考，新版入口仅加载 `src/`。

## 验证与构建

```bash
npm run build
npm run format:check
npm run test:e2e
```

端到端测试需要已安装的后端虚拟环境和 Chromium。默认使用 `/usr/bin/chromium`，可通过 `CHROMIUM_PATH` 指定路径。测试自行启动独立后端（8001）、前端（5174），每次创建临时 SQLite 数据库，不使用日常开发数据库。

测试覆盖桌面/平板/手机布局、训练记录增删改与刷新、历史键兼容、蛋白与饮食份量、社区关注、排行榜、市场复刻/发布/留言、方案应用、AI 演示、手机导航及失败重试。

构建产物在 `dist/`。`npm run preview` 在 `4173` 启动本地生产预览，并提供相同 API 代理。正式部署需将 `dist/` 作为静态资源，反向代理 `/api` 到 FastAPI，或配置 `VITE_API_BASE` 并设置对应 CORS。采用 hash 路由，无需服务端为页面路由配置回退。

## 代码结构

- `src/views/`：六个主要业务页面。
- `src/components/`：图标与无障碍弹窗。
- `src/store.js`：响应式本地状态、历史存储兼容与统计。
- `src/api.js`：统一 API 调用与错误处理。
- `src/data.js`：原型训练计划、阶段规则与演示数据。
- `src/style.css`：桌面及移动端样式。
