const PLAN = {
  1: { type: "push", label: "推日", badge: "push", am: [
    { name: "板俯卧撑", sets: 3, reps: "4–6", note: "难则抬手，易则垫脚" },
    { name: "哑铃卧推", sets: 3, reps: "4–6", note: "肩胛稳定" },
    { name: "哑铃肩推", sets: 3, reps: "4–6", note: "核心收紧" },
  ], pm: [
    { name: "哑铃飞鸟 / 窄距板俯卧撑", sets: "3–4", reps: "8–12", note: "胸辅助" },
    { name: "哑铃侧平举", sets: "3–4", reps: "8–12", note: "宁轻勿甩" },
    { name: "哑铃三头屈伸", sets: 3, reps: "8–12", note: "肘固定" },
    { name: "跳绳", sets: "—", reps: "10–15 分钟", note: "可分段", noSets: true },
  ]},
  2: { type: "rest", label: "恢复日", badge: "rest", am: [
    { name: "热身", sets: "—", reps: "5 分钟", note: "", noSets: true },
    { name: "跳绳间歇", sets: "—", reps: "累计 15–20 分钟", note: "", noSets: true },
    { name: "轻度活动", sets: "2", reps: "徒手深蹲×10 等", note: "非力竭" },
  ], pm: [
    { name: "散步 / 拉伸", sets: "—", reps: "20–30 分钟", note: "不追加力竭", noSets: true },
  ]},
  3: { type: "pull", label: "拉日", badge: "pull", am: [
    { name: "引体向上（可辅助）", sets: 3, reps: "4–6", note: "满组再减辅助" },
    { name: "反向划船 / 哑铃划船", sets: 3, reps: "4–6", note: "肩胛后收" },
    { name: "哑铃弯举", sets: 3, reps: "4–6", note: "控离心" },
  ], pm: [
    { name: "哑铃划船", sets: "3–4", reps: "8–12", note: "背宽辅助" },
    { name: "反向飞鸟 / 俯身外旋", sets: 3, reps: "8–12", note: "肩后束" },
    { name: "锤式弯举", sets: 3, reps: "8–12", note: "肱肌" },
    { name: "跳绳", sets: "—", reps: "10–15 分钟", note: "", noSets: true },
  ]},
  4: { type: "rest", label: "恢复日", badge: "rest", am: [
    { name: "热身", sets: "—", reps: "5 分钟", note: "", noSets: true },
    { name: "跳绳间歇", sets: "—", reps: "累计 15–20 分钟", note: "", noSets: true },
    { name: "轻度活动", sets: "2", reps: "非力竭", note: "" },
  ], pm: [
    { name: "散步 / 拉伸", sets: "—", reps: "20–30 分钟", note: "", noSets: true },
  ]},
  5: { type: "leg", label: "腿+体态", badge: "leg", am: [
    { name: "哑铃深蹲", sets: 3, reps: "4–6", note: "膝脚尖同向" },
    { name: "哑铃罗马尼亚硬拉", sets: 3, reps: "4–6", note: "髋铰链" },
    { name: "保加利亚分腿蹲", sets: 3, reps: "4–6/腿", note: "可扶墙" },
  ], pm: [
    { name: "哑铃提踵", sets: "3–4", reps: "8–12", note: "小腿" },
    { name: "臀桥", sets: 3, reps: "8–12", note: "可负重" },
    { name: "靠墙天使 / Y-T-W", sets: 3, reps: "8–12", note: "体态" },
    { name: "平板支撑", sets: 3, reps: "20–45 秒", note: "核心", timed: true },
    { name: "跳绳", sets: "—", reps: "8–12 分钟", note: "腿日略减", noSets: true },
  ]},
  6: { type: "rest", label: "恢复日", badge: "rest", am: [
    { name: "热身", sets: "—", reps: "5 分钟", note: "", noSets: true },
    { name: "跳绳间歇", sets: "—", reps: "累计 15–20 分钟", note: "", noSets: true },
  ], pm: [
    { name: "散步 / 拉伸", sets: "—", reps: "20–30 分钟", note: "", noSets: true },
  ]},
  7: { type: "rest", label: "轻松日", badge: "rest", am: [
    { name: "散步或短跳绳", sets: "—", reps: "轻松", note: "不力竭", noSets: true },
  ], pm: [
    { name: "休息 / 拉伸", sets: "—", reps: "可选", note: "", noSets: true },
  ]},
};


/** 用户自录短视频：B站可内嵌试播；抖音/小红书以跳转为主（平台限制，小程序内亦然） */
const VIDEO_LIB = {
  "哑铃飞鸟": [
    { platform: "dy", title: "飞鸟离心控制", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "窄距板俯卧撑": [
    { platform: "bili", title: "窄距板俯卧撑", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "哑铃侧平举": [
    { platform: "xhs", title: "侧平举宁轻勿甩", url: "https://www.xiaohongshu.com/", note: "跳转小红书" }
  ],
  "哑铃三头屈伸": [
    { platform: "dy", title: "三头屈伸肘固定", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "哑铃划船": [
    { platform: "bili", title: "哑铃划船肩胛后收", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "锤式弯举": [
    { platform: "dy", title: "锤式弯举", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "保加利亚分腿蹲": [
    { platform: "bili", title: "保加利亚分腿蹲", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "哑铃提踵": [
    { platform: "xhs", title: "提踵顶峰停顿", url: "https://www.xiaohongshu.com/", note: "跳转小红书" }
  ],
  "臀桥": [
    { platform: "dy", title: "臀桥髋部发力", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "平板支撑": [
    { platform: "bili", title: "平板支撑", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "板俯卧撑": [
    { platform: "bili", title: "板俯卧撑动作示范（自录）", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示 BV，上线换成你的稿" },
    { platform: "dy", title: "俯卧撑节奏提示", url: "https://www.douyin.com/", note: "跳转抖音打开" }
  ],
  "哑铃卧推": [
    { platform: "bili", title: "哑铃卧推肩胛稳定", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" },
    { platform: "xhs", title: "卧推常见错误", url: "https://www.xiaohongshu.com/", note: "跳转小红书" }
  ],
  "哑铃肩推": [
    { platform: "dy", title: "肩推核心收紧", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "引体向上（可辅助）": [
    { platform: "bili", title: "引体辅助与离心", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "哑铃深蹲": [
    { platform: "xhs", title: "高脚杯深蹲要点", url: "https://www.xiaohongshu.com/", note: "跳转小红书" },
    { platform: "bili", title: "深蹲膝脚尖同向", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ],
  "跳绳": [
    { platform: "dy", title: "跳绳间歇示范", url: "https://www.douyin.com/", note: "跳转抖音" }
  ],
  "哑铃罗马尼亚硬拉": [
    { platform: "bili", title: "RDL 髋铰链", url: "https://www.bilibili.com/video/BV1GJ411x7h7", bilibiliId: "BV1GJ411x7h7", note: "演示用" }
  ]
};
const PLAT_LABEL = { bili: "B站", dy: "抖音", xhs: "小红书" };

const PHASES = {
  1: { title: "第 1 周·适应", focus: "熟悉动作与节奏；可控重量把动作做标准，完成全部组数即可。", amSetsHint: "先保证完成度", pmSetsBoost: false, overload: "不追求加重" },
  2: { title: "第 2 周·加量", focus: "优先加次数；核心满 4–6×3 后再加重或减引体辅助；辅助可到 4 组。", amSetsHint: "次数优先，满目标再加重", pmSetsBoost: true, overload: "辅助可加到 4 组" },
  3: { title: "第 3 周·加量", focus: "继续加次数/减辅助；辅助动作维持 3–4 组高完成度。", amSetsHint: "满组再加重或减辅助", pmSetsBoost: true, overload: "保持渐进超负荷" },
  4: { title: "第 4 周·巩固", focus: "巩固或轻微加难：维持高完成度；能稳做再 +1 次/组或微加重。", amSetsHint: "稳做再微加重", pmSetsBoost: true, overload: "巩固为主，微加难" },
};

const WEEK_LABEL = ["一","二","三","四","五","六","日"];
const PROTEIN_GOAL = 155;

function mondayOf(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function weekId(d = new Date()) { return ymd(mondayOf(d)); }
function planWeekday(d = new Date()) {
  const n = d.getDay();
  return n === 0 ? 7 : n;
}

const state = {
  marketKind: "all",
  rankPeriod: "week",
  rankExpanded: false,
  rankDim: "strength",
  marketCycle: "all",
  nodeFilter: "all",
  listKind: "plan",
  listCycle: "week",

  tab: "home",
  weekId: weekId(),
  weekday: planWeekday(),
  session: "am",
  protein: 0,
  phase: Number(localStorage.getItem("tm_phase") || 1),
  logs: JSON.parse(localStorage.getItem("tm_logs_v2") || "{}"),
  doneDays: JSON.parse(localStorage.getItem("tm_done_v2") || "{}"),
  proteinHits: JSON.parse(localStorage.getItem("tm_pro_hits_v2") || "{}"),
  proteinGrams: JSON.parse(localStorage.getItem("tm_pro_g_v2") || "{}"),
  exChecks: JSON.parse(localStorage.getItem("tm_ex_checks_v2") || "{}"),
  logExercise: null,
  editing: null,
  videoBinds: JSON.parse(localStorage.getItem("tm_video_bind_v1") || "{}"),
};

function ensureWeekBags() {
  const w = state.weekId;
  if (!state.doneDays[w]) state.doneDays[w] = {};
  if (!state.proteinHits[w]) state.proteinHits[w] = {};
  if (!state.proteinGrams[w]) state.proteinGrams[w] = {};
  if (!state.exChecks[w]) state.exChecks[w] = {};
}
function wdKey(d) { return String(d); }
function sessionKey(weekday = state.weekday, session = state.session, w = state.weekId) {
  return `${w}|${weekday}-${session}`;
}
function loadTodayProtein() {
  ensureWeekBags();
  const g = state.proteinGrams[state.weekId][wdKey(state.weekday)];
  state.protein = typeof g === "number" ? g : 0;
}
function save() {
  ensureWeekBags();
  state.proteinGrams[state.weekId][wdKey(state.weekday)] = state.protein;
  if (state.protein >= 150) state.proteinHits[state.weekId][wdKey(state.weekday)] = true;
  else delete state.proteinHits[state.weekId][wdKey(state.weekday)];
  localStorage.setItem("tm_logs_v2", JSON.stringify(state.logs));
  localStorage.setItem("tm_done_v2", JSON.stringify(state.doneDays));
  localStorage.setItem("tm_phase", String(state.phase));
  localStorage.setItem("tm_pro_hits_v2", JSON.stringify(state.proteinHits));
  localStorage.setItem("tm_pro_g_v2", JSON.stringify(state.proteinGrams));
  localStorage.setItem("tm_ex_checks_v2", JSON.stringify(state.exChecks));
  localStorage.setItem("tm_video_bind_v1", JSON.stringify(state.videoBinds));
}
function planFor(d) { return PLAN[d]; }
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

function normalizeExName(name) {
  return String(name || "").replace(/[（(].*?[）)]/g, "").replace(/\s+/g, "").replace(/[／/]/g, "/");
}
function videosFor(name) {
  const custom = (state.videoBinds || {})[name];
  if (custom && custom.length) return custom.slice();
  if (VIDEO_LIB[name]) return VIDEO_LIB[name].slice();
  const n = normalizeExName(name);
  for (const key of Object.keys(VIDEO_LIB)) {
    const k = normalizeExName(key);
    if (n === k || n.includes(k) || k.includes(n)) return VIDEO_LIB[key].slice();
  }
  for (const part of String(name).split(/\s*\/\s*|\s*或\s*/)) {
    const p = part.trim();
    if (!p) continue;
    if (VIDEO_LIB[p]) return VIDEO_LIB[p].slice();
    const pn = normalizeExName(p);
    for (const key of Object.keys(VIDEO_LIB)) {
      const k = normalizeExName(key);
      if (pn === k || pn.includes(k) || k.includes(pn)) return VIDEO_LIB[key].slice();
    }
  }
  return [];
}
function detectPlatform(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes("bilibili.com") || u.includes("b23.tv")) return "bili";
  if (u.includes("douyin.com") || u.includes("iesdouyin.com")) return "dy";
  if (u.includes("xiaohongshu.com") || u.includes("xhslink.com")) return "xhs";
  return null;
}
function extractBvid(url) {
  const m = String(url).match(/BV[\w]+/i);
  return m ? m[0] : "";
}
function saveVideoBindFromForm() {
  const name = state.videoExercise;
  if (!name) return;
  const title = (document.getElementById("bind-title") || {}).value || "我的自录示范";
  const url = ((document.getElementById("bind-url") || {}).value || "").trim();
  if (!url) { toast("请粘贴视频链接"); return; }
  const platform = detectPlatform(url);
  if (!platform) { toast("不支持的链接，仅支持 B站 / 抖音 / 小红书"); return; }
  state.videoBinds[name] = [{
    platform,
    title: String(title).trim() || "我的自录示范",
    url,
    note: "用户自录绑定",
    bilibiliId: platform === "bili" ? extractBvid(url) : ""
  }];
  save();
  toast("已绑定自录稿");
  renderVideoPage();
}
function clearVideoBind() {
  const name = state.videoExercise;
  if (!name) return;
  delete state.videoBinds[name];
  save();
  toast("已恢复默认演示稿");
  renderVideoPage();
}
function openVideoPage(name, back) {
  state.videoExercise = name;
  state.videoBack = back || "today";
  showTab("video");
}
function jumpVideo(url) {
  window.open(url, "_blank", "noopener,noreferrer");
  toast("已尝试跳转外部播放");
}
function videoCardHtml(v, opts) {
  opts = opts || {};
  const plat = PLAT_LABEL[v.platform] || v.platform;
  const embed = opts.embed && v.platform === "bili" && v.bilibiliId
    ? `<div class="video-frame"><iframe src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(v.bilibiliId)}&high_quality=1&danmaku=0" allowfullscreen="true" scrolling="no" allow="fullscreen"></iframe></div>`
    : "";
  const cover = (!opts.embed)
    ? `<button type="button" class="video-cover" data-act="${v.platform === "bili" && v.bilibiliId ? "embed" : "jump"}"><span class="play-ico">▶</span><span>${plat} · 点击播放</span></button>`
    : "";
  let actions = "";
  if (v.platform === "bili" && v.bilibiliId) {
    actions += `<button class="btn" type="button" data-act="embed">内嵌播放</button>`;
    actions += `<button class="btn ghost" type="button" data-act="jump">B站打开</button>`;
  } else {
    actions += `<button class="btn" type="button" data-act="jump">跳转${plat}播放</button>`;
  }
  return `<div class="video-card" data-url="${String(v.url).replace(/"/g, "&quot;")}" data-bvid="${v.bilibiliId || ""}">
    <span class="plat ${v.platform}">${plat}</span>
    <div class="vtitle">${v.title}</div>
    <div class="vmeta">${v.note || ""}</div>
    ${cover}${embed}
    <div class="video-actions">${actions}</div>
  </div>`;
}
function bindVideoCards(root) {
  if (!root) return;
  root.querySelectorAll(".video-card").forEach(card => {
    const url = card.getAttribute("data-url");
    const bvid = card.getAttribute("data-bvid");
    card.querySelectorAll("[data-act]").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const act = btn.getAttribute("data-act");
        if (act === "jump") jumpVideo(url);
        if (act === "embed") {
          if (bvid) {
            const slot = card.querySelector(".video-cover, .video-frame");
            const frame = `<div class="video-frame"><iframe src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&high_quality=1&danmaku=0" allowfullscreen="true" scrolling="no" allow="fullscreen"></iframe></div>`;
            if (slot) slot.outerHTML = frame;
            else card.insertAdjacentHTML("beforeend", frame);
          } else jumpVideo(url);
        }
      };
    });
  });
}
function renderVideoPage() {
  const name = state.videoExercise || "";
  const title = document.getElementById("video-page-title");
  const sub = document.getElementById("video-page-sub");
  const body = document.getElementById("video-page-body");
  if (!body) return;
  if (title) title.textContent = name || "动作示范";
  if (sub) sub.textContent = "B站可内嵌；抖音 / 小红书跳转 · 可绑定自录稿";
  const list = videosFor(name);
  const cards = list.length
    ? list.map((v) => videoCardHtml(v)).join("")
    : `<div class="card muted small">该动作暂未绑定短视频，请在下方粘贴自录链接。</div>`;
  const bound = !!(state.videoBinds[name] && state.videoBinds[name].length);
  const bt = bound ? (state.videoBinds[name][0].title || "") : "";
  const bu = bound ? (state.videoBinds[name][0].url || "") : "";
  body.innerHTML = cards + `
    <div class="card" style="margin-top:12px">
      <strong>绑定 / 替换自录视频</strong>
      <p class="muted small" style="margin-top:6px">支持 B站 / 抖音 / 小红书链接。绑定后覆盖该动作默认演示稿。</p>
      <div class="field" style="margin-top:10px"><label>标题</label><input id="bind-title" placeholder="我的自录示范" value="${bt.replace(/"/g, "&quot;")}" /></div>
      <div class="field" style="margin-top:8px"><label>视频链接</label><input id="bind-url" placeholder="https://..." value="${bu.replace(/"/g, "&quot;")}" /></div>
      <button class="btn block" type="button" onclick="saveVideoBindFromForm()">保存绑定</button>
      ${bound ? '<button class="btn block ghost" type="button" onclick="clearVideoBind()">清除绑定 · 恢复默认</button>' : ""}
    </div>`;
  bindVideoCards(body);
}


/* AI 动作评测：字段对齐数据师草稿
   eval_id / exercise / created_at / status / score / reps / issues[timestamp, frame_url, problem, fix] / summary */
const AI_MAX_SEC = 60;
const AI_MAX_MB = 100;
const AI_MOCK = {
  status: "done",
  score: 78,
  reps: 12,
  summary: "整体节奏稳定，下蹲深度够；主要问题是第 8 次后膝盖内扣、起身时含胸。先减 2kg 把后 4 次做标准。",
  issues: [
    { timestamp: 14.2, frame_url: "", problem: "膝盖内扣（第 8 次起）", fix: "下蹲时想象膝盖往外推，与脚尖同向；疲劳时减重。" },
    { timestamp: 21.6, frame_url: "", problem: "起身含胸、背部前倾", fix: "哑铃贴胸，起身先挺胸再伸髋。" },
    { timestamp: 33.0, frame_url: "", problem: "最后 2 次幅度变浅", fix: "保持同样深度，做不到就提前结束该组。" }
  ]
};
function aiHistoryAll() { return JSON.parse(localStorage.getItem("tm_ai_hist_v1") || "[]"); }
function aiHistorySave(list) { localStorage.setItem("tm_ai_hist_v1", JSON.stringify(list)); }
function aiExercise() { const el = document.getElementById("ai-ex"); return el ? el.value : "哑铃深蹲"; }
function openAi(back) {
  state.aiBack = back || "today";
  showTab("ai");
}
function fmtTs(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function aiUpdateSubmit() {
  const btn = document.getElementById("ai-submit");
  const ok = !!(state.aiFileOk && document.getElementById("ai-consent")?.checked);
  if (btn) btn.disabled = !ok;
}
function aiPickFile(input) {
  const f = input.files && input.files[0];
  const info = document.getElementById("ai-file-info");
  state.aiFileOk = false;
  state.aiFileName = null;
  if (state.aiVideoUrl) { URL.revokeObjectURL(state.aiVideoUrl); state.aiVideoUrl = null; }
  if (!f) { info.innerHTML = ""; aiUpdateSubmit(); return; }
  const mb = f.size / 1024 / 1024;
  if (mb > AI_MAX_MB) {
    info.innerHTML = `<div class="file-err">文件 ${mb.toFixed(1)}MB，超过 ${AI_MAX_MB}MB 上限，请剪短或压缩后再传。</div>`;
    input.value = ""; aiUpdateSubmit(); return;
  }
  const url = URL.createObjectURL(f);
  const v = document.createElement("video");
  v.preload = "metadata"; v.muted = true; v.src = url;
  v.onloadedmetadata = () => {
    const dur = v.duration || 0;
    if (dur > AI_MAX_SEC) {
      info.innerHTML = `<div class="file-err">视频 ${Math.round(dur)} 秒，超过 ${AI_MAX_SEC} 秒上限，请剪成一组动作再传。</div>`;
      URL.revokeObjectURL(url); input.value = ""; aiUpdateSubmit(); return;
    }
    state.aiFileOk = true; state.aiFileName = f.name; state.aiVideoUrl = url;
    info.innerHTML = `<div class="file-card"><video src="${url}#t=0.5" muted playsinline></video>
      <div><div class="small" style="font-weight:700">${f.name}</div><div class="muted small">${fmtTs(dur)} · ${mb.toFixed(1)}MB</div></div></div>`;
    aiUpdateSubmit();
  };
  v.onerror = () => {
    info.innerHTML = `<div class="file-err">无法读取该视频，请换 MP4 / MOV 格式。</div>`;
    URL.revokeObjectURL(url); input.value = ""; aiUpdateSubmit();
  };
}
const AI_STEPS = ["上传视频", "姿态识别", "生成反馈"];
function aiSubmit(demo) {
  if (!demo && !(state.aiFileOk && document.getElementById("ai-consent")?.checked)) return;
  state.aiResult = { status: "processing", step: 0 };
  renderAi();
  const tick = (i) => setTimeout(() => {
    if (i < AI_STEPS.length) { state.aiResult = { status: "processing", step: i }; renderAi(); tick(i + 1); }
    else {
      const r = JSON.parse(JSON.stringify(AI_MOCK));
      r.eval_id = "E" + Date.now();
      r.exercise = aiExercise();
      r.created_at = new Date().toISOString();
      r.file_name = state.aiFileName || "演示视频.mp4";
      state.aiResult = r;
      const h = aiHistoryAll(); h.unshift(r); aiHistorySave(h.slice(0, 50));
      renderAi();
    }
  }, 700);
  tick(1);
}
function aiReset() {
  state.aiResult = null;
  renderAi();
}
function aiSeek(t) {
  const v = document.getElementById("ai-player");
  if (v) { v.currentTime = t; v.play().catch(() => {}); v.scrollIntoView({ behavior: "smooth", block: "center" }); }
  else toast(`演示数据无原视频 · 真实接入后跳到 ${fmtTs(t)} 播放`);
}
function aiSaveToLog() {
  const r = state.aiResult;
  if (!r || r.status !== "done") return;
  const key = sessionKey();
  if (!state.logs[key]) state.logs[key] = [];
  state.logs[key].push({
    id: "L" + Date.now(), name: r.exercise, weight: "—", sets: "1", reps: String(r.reps), rpe: "—",
    at: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }), source: "ai", eval_id: r.eval_id
  });
  r.saved = true;
  const h = aiHistoryAll(); const i = h.findIndex(x => x.eval_id === r.eval_id);
  if (i >= 0) { h[i].saved = true; aiHistorySave(h); }
  save();
  toast(`已记入训练记录：${r.exercise} ${r.reps} 次`);
  renderAi();
}
function aiPrevFor(r) {
  return aiHistoryAll().find(x => x.exercise === r.exercise && x.eval_id !== r.eval_id && new Date(x.created_at) < new Date(r.created_at));
}
function renderAiHistory() {
  const box = document.getElementById("ai-history");
  const lab = document.getElementById("ai-history-ex");
  if (!box) return;
  const ex = aiExercise();
  if (lab) lab.textContent = ex;
  const list = aiHistoryAll().filter(x => x.exercise === ex);
  box.innerHTML = list.length ? list.slice(0, 6).map((x, i) => {
    const prev = list[i + 1];
    const d = prev ? x.score - prev.score : null;
    const delta = d == null ? "" : `<span class="${d >= 0 ? "up" : "down"}">${d >= 0 ? "↑" : "↓"}${Math.abs(d)}</span>`;
    const t = new Date(x.created_at);
    return `<div class="list-item"><span>${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")} · ${x.reps} 次</span><span><strong>${x.score}</strong> 分 ${delta}</span></div>`;
  }).join("") : `<div class="muted small" style="padding:8px 0">这个动作还没有评测记录。</div>`;
}
function renderAi() {
  const box = document.getElementById("ai-result");
  if (!box) return;
  const r = state.aiResult;
  const up = document.getElementById("ai-upload-card");
  const col = document.getElementById("ai-collapsed");
  const showCollapsed = r && r.status === "done";
  if (up) up.style.display = showCollapsed ? "none" : "";
  if (col) col.style.display = showCollapsed ? "" : "none";
  renderAiHistory();
  if (!r) { box.innerHTML = ""; return; }
  if (r.status === "processing") {
    const steps = AI_STEPS.map((s, i) => `<div class="ai-step ${i < r.step ? "done" : i === r.step ? "on" : ""}"><span class="dot">${i < r.step ? "✓" : i + 1}</span>${s}</div>`).join("");
    box.innerHTML = `<div class="card"><div class="row" style="gap:10px"><div class="spinner"></div><strong>评测中…</strong></div><div class="ai-steps">${steps}</div><div class="muted small" style="margin-top:8px">约 30–60 秒，可先离开，结果会保存在评测历史。</div></div>`;
    return;
  }
  if (r.status === "failed") {
    box.innerHTML = `<div class="card"><strong style="color:var(--danger)">评测失败</strong><div class="muted small" style="margin-top:6px">视频不清晰或人物不完整，请侧面拍全身后重试。</div><button class="btn block ghost" onclick="aiReset()">重新上传</button></div>`;
    return;
  }
  document.getElementById("ai-collapsed-ex").textContent = r.exercise;
  document.getElementById("ai-collapsed-file").textContent = r.file_name || "";
  const prev = aiPrevFor(r);
  const cmp = prev
    ? `<div class="small ${r.score >= prev.score ? "up" : "down"}" style="margin-top:4px">比上次 ${r.score >= prev.score ? "↑" : "↓"}${Math.abs(r.score - prev.score)} 分（上次 ${prev.score}）</div>`
    : `<div class="muted small" style="margin-top:4px">首次评测该动作</div>`;
  const player = state.aiVideoUrl ? `<div class="video-frame" style="margin-top:0"><video id="ai-player" src="${state.aiVideoUrl}" controls playsinline></video></div>` : "";
  const issues = (r.issues || []).map(it => `
    <button type="button" class="ai-issue" onclick="aiSeek(${it.timestamp})">
      <div class="ai-frame">${it.frame_url ? `<img src="${it.frame_url}" alt="">` : `<span class="mini-play">▶</span>`}<em>${fmtTs(it.timestamp)}</em></div>
      <div class="ai-issue-body">
        <div class="ai-prob">${it.problem}</div>
        <div class="ai-fix">改：${it.fix}</div>
      </div>
    </button>`).join("");
  box.innerHTML = `
    <div class="card ai-score-card">
      <div class="ring big" style="--p:${r.score}"><span>${r.score}</span></div>
      <div style="flex:1">
        <div class="muted small">${r.exercise} · 动作评分</div>
        <div class="ai-reps">${r.reps}<small> 次</small></div>
        ${cmp}
      </div>
    </div>
    <button class="btn block ${r.saved ? "ghost" : ""}" ${r.saved ? "disabled" : ""} onclick="aiSaveToLog()">${r.saved ? "已记入训练记录" : `一键记入训练记录（${r.reps} 次）`}</button>
    <div class="card"><strong>总评</strong><p class="ai-summary">${r.summary}</p></div>
    ${player ? `<div class="card">${player}</div>` : ""}
    <div class="card"><div class="row space"><strong>问题动作</strong><span class="muted small">点截帧跳到该时间点</span></div>${issues}</div>
    <p class="muted small" style="margin:8px 2px 0">AI 反馈仅供参考；有疼痛请停止并咨询专业人士。</p>`;
}


/* 餐食 / 营养成分表分析
   字段：meal_id, source(food|label), kcal/protein_g/carb_g/fat_g(按 portion 缩放), advice, logged_to_protein, created_at, daily_kcal_total */
const MEAL_MAX_MB = 10;
const MEAL_MOCK_FOOD = {
  status: "done", source: "food",
  title: "鸡胸饭 + 西兰花",
  base_kcal: 520, base_protein_g: 42, base_carb_g: 48, base_fat_g: 12,
  portion: 1, sugar_warn: false,
  advice: "蛋白够扎实，主食偏多一点。按小幅缺口，建议米饭再减约 1/4，或晚训后留着吃。",
  tips: ["优先保证蛋白目标 150–155g", "油脂少炒少淋", "禁添加糖饮料"]
};
const MEAL_MOCK_LABEL = {
  status: "done", source: "label",
  title: "某品牌蛋白棒（成分表 OCR）",
  base_kcal: 148, base_protein_g: 15, base_carb_g: 12, base_fat_g: 5,
  portion: 1, sugar_warn: true, per: "每份 40g",
  advice: "单份蛋白 15g，适合加餐补缺口。配料有糖浆，按计划禁添加糖——偶尔可换无糖版或鸡蛋牛奶。",
  tips: ["记入加餐补蛋白", "若全天主食已够可不叠加这份碳水", "对比同类看每份蛋白密度"]
};
function mealHist() { return JSON.parse(localStorage.getItem("tm_meal_hist_v1") || "[]"); }
function mealHistSave(list) { localStorage.setItem("tm_meal_hist_v1", JSON.stringify(list)); }
function mealScaled(r) {
  const p = Number(r.portion) || 1;
  return {
    kcal: Math.round((r.base_kcal || r.kcal || 0) * p),
    protein_g: Math.round((r.base_protein_g || r.protein_g || 0) * p),
    carb_g: Math.round((r.base_carb_g || r.carb_g || 0) * p),
    fat_g: Math.round((r.base_fat_g || r.fat_g || 0) * p)
  };
}
function mealDailyKcal() {
  return mealHist().filter(x => x.logged_to_protein && x.status === "done")
    .reduce((s, x) => s + mealScaled(x).kcal, 0);
}
function mealDailyProteinFromMeals() {
  return mealHist().filter(x => x.logged_to_protein && x.status === "done")
    .reduce((s, x) => s + mealScaled(x).protein_g, 0);
}
function openMeal(back) {
  state.mealBack = back || "protein";
  if (!state.mealMode) state.mealMode = "food";
  showTab("meal");
}
function setMealMode(m) {
  state.mealMode = m;
  document.getElementById("meal-mode-food")?.classList.toggle("on", m === "food");
  document.getElementById("meal-mode-label")?.classList.toggle("on", m === "label");
  const t = document.getElementById("meal-drop-txt");
  if (t) t.textContent = m === "label" ? "拍摄营养成分表" : "拍摄餐盘 / 餐盒";
}
function mealUpdateSubmit() {
  const btn = document.getElementById("meal-submit");
  const busy = state.mealResult && state.mealResult.status === "processing";
  const ok = !busy && !!(state.mealFileOk && document.getElementById("meal-consent")?.checked);
  if (btn) { btn.disabled = !ok; btn.textContent = busy ? "分析中…" : "开始分析"; }
}
function mealPickFile(input) {
  const f = input.files && input.files[0];
  const box = document.getElementById("meal-preview");
  state.mealFileOk = false;
  if (state.mealImgUrl) { URL.revokeObjectURL(state.mealImgUrl); state.mealImgUrl = null; }
  if (!f) { box.innerHTML = ""; mealUpdateSubmit(); return; }
  const mb = f.size / 1024 / 1024;
  if (mb > MEAL_MAX_MB) {
    box.innerHTML = `<div class="file-err">图片 ${mb.toFixed(1)}MB，超过 ${MEAL_MAX_MB}MB，请压缩后再传。</div>`;
    input.value = ""; mealUpdateSubmit(); return;
  }
  if (!f.type.startsWith("image/")) {
    box.innerHTML = `<div class="file-err">请上传图片（JPG / PNG / HEIC）。</div>`;
    input.value = ""; mealUpdateSubmit(); return;
  }
  const url = URL.createObjectURL(f);
  state.mealImgUrl = url; state.mealFileOk = true; state.mealFileName = f.name;
  box.innerHTML = `<div class="file-card meal-prev"><img src="${url}" alt=""><div><div class="small" style="font-weight:700">${f.name}</div><div class="muted small">${mb.toFixed(1)}MB · ${state.mealMode === "label" ? "成分表" : "餐食"}</div></div></div>`;
  mealUpdateSubmit();
}
function mealSubmit() {
  if (!(state.mealFileOk && document.getElementById("meal-consent")?.checked)) return;
  if (state.mealResult && state.mealResult.status === "processing") return;
  state.mealResult = { status: "processing", step: 0 };
  mealUpdateSubmit();
  renderMeal();
  const tick = (i) => setTimeout(() => {
    if (i < 3) { state.mealResult = { status: "processing", step: i }; mealUpdateSubmit(); renderMeal(); tick(i + 1); }
    else {
      const base = state.mealMode === "label" ? MEAL_MOCK_LABEL : MEAL_MOCK_FOOD;
      const r = Object.assign(JSON.parse(JSON.stringify(base)), {
        meal_id: "M" + Date.now(),
        created_at: new Date().toISOString(),
        file_name: state.mealFileName || "餐食.jpg",
        thumb: state.mealImgUrl || "",
        logged_to_protein: false,
        portion: 1
      });
      // flatten scaled fields for storage convenience
      Object.assign(r, mealScaled(r));
      state.mealResult = r;
      const h = mealHist(); h.unshift(r); mealHistSave(h.slice(0, 40));
      mealUpdateSubmit();
      renderMeal();
    }
  }, 650);
  tick(1);
}
function mealReset() {
  state.mealResult = null;
  mealUpdateSubmit();
  renderMeal();
}
function mealSetPortion(p) {
  const r = state.mealResult;
  if (!r || r.status !== "done") return;
  const was = !!r.logged_to_protein;
  const old = mealScaled(r);
  r.portion = p;
  Object.assign(r, mealScaled(r));
  if (was) {
    // adjust protein total by delta
    state.protein = Math.max(0, (state.protein || 0) - old.protein_g + r.protein_g);
    save();
  }
  const h = mealHist();
  const i = h.findIndex(x => x.meal_id === r.meal_id);
  if (i >= 0) { h[i] = JSON.parse(JSON.stringify(r)); mealHistSave(h); }
  renderMeal();
  if (was) renderProtein();
}
function mealAddProtein() {
  const r = state.mealResult;
  if (!r || r.status !== "done" || r.logged_to_protein) return;
  const g = mealScaled(r).protein_g;
  state.protein = Math.max(0, (state.protein || 0) + g);
  r.logged_to_protein = true;
  Object.assign(r, mealScaled(r));
  const h = mealHist(); const i = h.findIndex(x => x.meal_id === r.meal_id);
  if (i >= 0) { h[i] = JSON.parse(JSON.stringify(r)); mealHistSave(h); }
  save();
  toast(`已计入今日蛋白 +${g} g · 热量 ${mealScaled(r).kcal} kcal`);
  renderMeal(); renderProtein();
}
function mealUndoProtein(id) {
  const h = mealHist();
  const i = h.findIndex(x => x.meal_id === id);
  if (i < 0) return;
  const r = h[i];
  if (!r.logged_to_protein) return;
  const g = mealScaled(r).protein_g;
  state.protein = Math.max(0, (state.protein || 0) - g);
  r.logged_to_protein = false;
  h[i] = r; mealHistSave(h);
  if (state.mealResult && state.mealResult.meal_id === id) state.mealResult.logged_to_protein = false;
  save();
  toast(`已撤销计入 −${g} g 蛋白`);
  renderMeal(); renderProtein();
}
function mealOpenHist(id) {
  const r = mealHist().find(x => x.meal_id === id);
  if (!r) return;
  state.mealResult = JSON.parse(JSON.stringify(r));
  state.mealMode = r.source === "label" ? "label" : "food";
  renderMeal();
  document.getElementById("meal-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderMealHistory() {
  const box = document.getElementById("meal-history");
  if (!box) return;
  const list = mealHist();
  box.innerHTML = list.length ? list.slice(0, 10).map(x => {
    const t = new Date(x.created_at);
    const sc = mealScaled(x);
    const tag = x.logged_to_protein ? `<button class="hist-undo" type="button" onclick="event.stopPropagation();mealUndoProtein('${x.meal_id}')">撤销计入</button>` : `<span class="muted small">未计入</span>`;
    return `<button type="button" class="meal-hist-item" onclick="mealOpenHist('${x.meal_id}')">
      <div class="row space"><span>${t.getMonth()+1}/${t.getDate()} · ${x.title}</span><span>${sc.kcal} kcal</span></div>
      <div class="row space" style="margin-top:4px"><span class="muted small">蛋白 ${sc.protein_g}g · ${x.portion||1} 份</span>${tag}</div>
    </button>`;
  }).join("") : `<div class="muted small" style="padding:8px 0">还没有分析记录。</div>`;
}
function renderMeal() {
  setMealMode(state.mealMode || "food");
  renderMealHistory();
  const r = state.mealResult;
  const up = document.getElementById("meal-upload-card");
  const col = document.getElementById("meal-collapsed");
  const seg = document.getElementById("meal-mode-seg");
  const box = document.getElementById("meal-result");
  if (!box) return;
  const showCol = r && r.status === "done";
  if (up) up.style.display = showCol ? "none" : "";
  if (col) col.style.display = showCol ? "" : "none";
  if (seg) seg.style.display = showCol ? "none" : "";
  mealUpdateSubmit();
  if (!r) { box.innerHTML = ""; return; }
  if (r.status === "processing") {
    const labs = ["上传图片", "识别成分 / 估餐", "生成建议"];
    const steps = labs.map((s, i) => `<div class="ai-step ${i < r.step ? "done" : i === r.step ? "on" : ""}"><span class="dot">${i < r.step ? "✓" : i + 1}</span>${s}</div>`).join("");
    box.innerHTML = `<div class="card"><div class="row" style="gap:10px"><div class="spinner"></div><strong>分析中…</strong></div><div class="ai-steps">${steps}</div></div>`;
    return;
  }
  const sc = mealScaled(r);
  const daily = mealDailyKcal();
  document.getElementById("meal-collapsed-lab").textContent = `${r.title} · ${sc.kcal} kcal`;
  const afterP = (state.protein || 0);
  const portionSeg = [0.5, 1, 2].map(p =>
    `<button type="button" class="${Number(r.portion) === p ? "on" : ""}" onclick="mealSetPortion(${p})">${p === 0.5 ? "半份" : p === 1 ? "1 份" : "2 份"}</button>`
  ).join("");
  box.innerHTML = `
    <div class="card meal-macros">
      <div class="meal-kcal"><div class="muted small">本餐热量（按所选份数）</div><div class="num">${sc.kcal}<small> kcal</small></div></div>
      <div class="seg portion-seg">${portionSeg}</div>
      <div class="meal-macro-grid">
        <div class="pro"><em>蛋白</em><b>${sc.protein_g}g</b></div>
        <div><em>碳水</em><b>${sc.carb_g}g</b></div>
        <div><em>脂肪</em><b>${sc.fat_g}g</b></div>
      </div>
      <div class="daily-kcal">今日已计入餐食 <strong>${daily}</strong> kcal<span class="muted"> · 蛋白今日 ${afterP}g / 155g</span></div>
    </div>
    ${r.sugar_warn ? `<div class="card warn-card">配料含添加糖相关成分，按计划尽量避开。</div>` : ""}
    <div class="card"><strong>建议</strong><p class="ai-summary">${r.advice || r.summary || ""}</p>
      <ul class="meal-tips">${(r.tips||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
    </div>
    <button class="btn block ${r.logged_to_protein ? "ghost" : ""}" ${r.logged_to_protein ? "disabled" : ""} onclick="mealAddProtein()">${r.logged_to_protein ? "已计入今日蛋白" : `计入今日蛋白 +${sc.protein_g}g`}</button>
    ${r.logged_to_protein ? `<button class="btn block ghost" onclick="mealUndoProtein('${r.meal_id}')">撤销计入</button>` : ""}
    <p class="muted small" style="margin:8px 2px 0">识别结果为估算，包装以实际标签为准；不构成医疗建议。</p>`;
}







/* ===== 首页 API：stats / rank / follows / feed ===== */
const HOME_API = "http://127.0.0.1:8000/api/v1/home";
async function homeApi(path, opts = {}) {
  const res = await fetch(HOME_API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": API_USER,
      ...(opts.headers || {})
    }
  });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || (`HTTP ${res.status}`);
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}


function formatDelta(u) {
  // 读接口 rank_delta / trend；rank_delta>0 表示名次上升（数字变小）
  if (!u || u.rank_delta == null && !u.trend) return `<span class="rank-delta flat">—</span>`;
  const trend = u.trend || (u.rank_delta > 0 ? "up" : u.rank_delta < 0 ? "down" : "flat");
  const d = Number(u.rank_delta) || 0;
  if (trend === "up" || d > 0) return `<span class="rank-delta up">↑${Math.abs(d || u.rank_delta)}</span>`;
  if (trend === "down" || d < 0) return `<span class="rank-delta down">↓${Math.abs(d || u.rank_delta)}</span>`;
  return `<span class="rank-delta flat">—</span>`;
}

function ensureRankPoller() {
  if (window._rankPoller) return;
  window._rankPoller = setInterval(() => {
    // 每小时轮询刷新排名快照
    if (state.tab === "home" || state.tab === "rank") {
      refreshRankSnapshot(true);
    } else {
      refreshRankSnapshot(false);
    }
  }, 60 * 60 * 1000);
}
function refreshRankSnapshot(rerender) {
  const period = rankPeriod();
  const dim = rankDim();
  // 系统级小时更新以后端快照为准；前端只拉取展示
  homeApi(`/rank?period=${encodeURIComponent(period)}&dim=${encodeURIComponent(dim)}`).then(raw => {
    state._rankCache = raw;
    state._rankPolledAt = Date.now();
    if (rerender) {
      if (state.tab === "home") renderHomeSocial();
      if (state.tab === "rank") renderRankPage();
    }
  }).catch(() => {});
}


const RANK_DIMS = [
  { id: "strength", label: "力量日完成率", unit: "%", tip: "本周期力量日完成占比", board: "总榜" },
  { id: "overload", label: "超负荷次数", unit: "次", tip: "重量/次数上涨的动作数", board: "总榜" },
  { id: "protein", label: "蛋白达标天", unit: "天", tip: "≥150g 记一天", board: "总榜" },
  { id: "streak", label: "连续有效周", unit: "周", tip: "当周力量日≥2/3 才续周", board: "总榜" },
  { id: "weight_class", label: "同体重区间", unit: "kg↑", tip: "仅同区间比相对加重量", board: "小榜" }
];

function liveMyAgg() {
  const s = strengthDoneCount();
  const o = countOverloadMoves();
  const p = proteinHitCount();
  const streak = streakWeeks();
  return {
    strength_rate: Math.round((s / 3) * 100),
    strength_done: s,
    strength_total: 3,
    overload_count: o,
    protein_days: p,
    streak_weeks: streak,
    load_up_kg: o * 2, // 原型：用超负荷次数估相对加重量，打通训练记录
    body_band: "70–85kg",
    streak_rule: "当周力量日 ≥2/3 才续周"
  };
}
function liveScore(dim, agg) {
  if (dim === "strength") return agg.strength_rate;
  if (dim === "overload") return agg.overload_count;
  if (dim === "protein") return agg.protein_days;
  if (dim === "streak") return agg.streak_weeks;
  if (dim === "weight_class") return agg.load_up_kg;
  return 0;
}
function rankPeriod() { return state.rankPeriod || "week"; }
function rankDim() { return state.rankDim || "strength"; }
function unitOf(dim) { return (RANK_DIMS.find(d => d.id === dim) || RANK_DIMS[0]).unit; }

function renderRankRows(list, unit, limit) {
  const rows = limit ? list.slice(0, limit) : list;
  return rows.map(u => {
    const posCls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
    const label = u.rank_label || (u.tied ? `并列第 ${u.rank}` : `第 ${u.rank}`);
    return `<div class="rank-row${u.is_me ? " me" : ""}">
      <span class="rank-pos ${posCls}">${u.rank}</span>
      <span>${u.is_me ? "我" : u.name}<div class="muted small">${u.body_band || ""} · ${label} ${formatDelta(u)}</div></span>
      <span class="rank-score">${u.score}<small>${unit}</small></span>
    </div>`;
  }).join("");
}

function renderHomeRank() {
  const box = document.getElementById("home-rank");
  if (!box) return;
  const period = rankPeriod();
  const dim = rankDim();
  const meta = RANK_DIMS.find(d => d.id === dim) || RANK_DIMS[0];
  const expanded = !!state.rankExpanded;
  box.innerHTML = `<div class="rank-summary" id="rank-summary-loading"><div class="muted small">加载排名…</div></div>`;

  ensureRankPoller();
  homeApi(`/rank?period=${encodeURIComponent(period)}&dim=${encodeURIComponent(dim)}`).then(raw => {
    const data = raw; // 升降以后端小时快照为准
    state._rankCache = data;
    const me = data.me;
    const unit = meta.unit;
    const isMini = dim === "weight_class";
    const dlt = me ? formatDelta(me) : "";
    const hint = data.compare_hint || "较上一小时";
    const summary = `<div class="rank-summary" onclick="state.rankExpanded=!state.rankExpanded;renderHomeSocial()">
      <div class="row space">
        <span><strong>训练排名</strong>${isMini ? `<span class="mini-tag">小榜</span>` : ""}
          <div class="muted small" style="margin-top:4px">${meta.label} · ${period==="week"?"本周":"本月"} · 我${me ? me.rank_label : "暂无"} ${dlt} · ${me ? me.score : "—"}${unit}</div>
        </span>
        <span class="muted small">${expanded ? "收起 ▴" : "展开 ▾"}</span>
      </div>
    </div>`;
    if (!expanded) { box.innerHTML = summary; return; }

    box.innerHTML = `
    ${summary}
    <div class="rank-card" style="margin-top:8px">
      <div class="row space">
        <strong>Top3${isMini ? `<span class="mini-tag">小榜</span>` : ""}</strong>
        <button class="act-chip" type="button" onclick="event.stopPropagation();showTab('rank')">完整榜</button>
      </div>
      <div class="seg rank-seg" style="grid-template-columns:1fr 1fr" onclick="event.stopPropagation()">
        <button type="button" class="${period==="week"?"on":""}" onclick="state.rankPeriod='week';renderHomeSocial()">本周</button>
        <button type="button" class="${period==="month"?"on":""}" onclick="state.rankPeriod='month';renderHomeSocial()">本月</button>
      </div>
      <div class="rank-dim" onclick="event.stopPropagation()">
        ${RANK_DIMS.map(d => `<button type="button" class="${dim===d.id?"on":""} ${d.board==="小榜"?"mini-board":""}" onclick="state.rankDim='${d.id}';renderHomeSocial()">${d.label}${d.board==="小榜"?" · 小榜":""}</button>`).join("")}
      </div>
      <p class="muted small" style="margin-top:8px">${meta.tip}${isMini && data.body_band ? " · "+data.body_band : ""} · 「我」已跟本地硬进度同步</p>
      ${renderRankRows(data.top3 || [], unit)}
      <div class="rank-me-bar" onclick="event.stopPropagation();showTab('rank')">
        <div><strong>我的名次 ${me ? formatDelta(me) : ""}</strong><div class="muted small">${me ? me.rank_label : "—"} · ${hint}</div></div>
        <span class="rank-score">${me ? me.score : "—"}<small>${unit}</small></span>
      </div>
    </div>`;
  }).catch(err => {
    box.innerHTML = `<div class="file-err">排名加载失败：${err.message}</div>`;
  });
}

function renderRankPage() {
  const box = document.getElementById("rank-body");
  if (!box) return;
  const period = rankPeriod();
  const dim = rankDim();
  const meta = RANK_DIMS.find(d => d.id === dim) || RANK_DIMS[0];
  const isMini = dim === "weight_class";
  box.innerHTML = `<div class="muted small">加载完整榜…</div>`;
  ensureRankPoller();
  homeApi(`/rank?period=${encodeURIComponent(period)}&dim=${encodeURIComponent(dim)}`).then(raw => {
    const data = raw;
    const me = data.me;
    const hint = data.compare_hint || "较上一小时";
    box.innerHTML = `
    <div class="seg" style="grid-template-columns:1fr 1fr">
      <button type="button" class="${period==="week"?"on":""}" onclick="state.rankPeriod='week';renderRankPage()">本周</button>
      <button type="button" class="${period==="month"?"on":""}" onclick="state.rankPeriod='month';renderRankPage()">本月</button>
    </div>
    <div class="rank-dim">${RANK_DIMS.map(d => `<button type="button" class="${dim===d.id?"on":""} ${d.board==="小榜"?"mini-board":""}" onclick="state.rankDim='${d.id}';renderRankPage()">${d.label}${d.board==="小榜"?" · 小榜":""}</button>`).join("")}</div>
    <div class="card" style="margin-top:10px">
      <strong>${meta.label}${isMini ? `<span class="mini-tag">小榜</span>` : " · 总榜"}</strong>
      <div class="muted small" style="margin-top:4px">${meta.tip}${isMini && data.body_band ? " · "+data.body_band : ""} · 不做绝对大重量总榜</div>
      ${renderRankRows(data.full || [], meta.unit)}
    </div>
    <div class="rank-me-bar" style="margin-top:10px">
      <div><strong>我的名次 · ${me ? me.rank_label : "—"} ${me ? formatDelta(me) : ""}</strong><div class="muted small">${hint}</div></div>
      <span class="rank-score">${me ? me.score : "—"}<small>${meta.unit}</small></span>
    </div>`;
  }).catch(e => { box.innerHTML = `<div class="file-err">${e.message}</div>`; });
}

function streakWeeks() {
  let n = 0;
  let w = state.weekId;
  for (let i = 0; i < 12; i++) {
    const bag = (state.doneDays && state.doneDays[w]) || {};
    const hits = ["1","3","5"].filter(d => bag[d]).length;
    if (hits >= 2) { n++; w = previousWeekId(w); }
    else break;
  }
  return n;
}

function renderHomeSocial() {
  const charts = document.getElementById("home-charts");
  const feed = document.getElementById("home-feed");
  const rail = document.getElementById("home-live-rail");
  if (!charts || !feed) return;

  // 图表优先本地硬进度（勾选/蛋白立刻变），并拉后端 stats 作对照提示
  const live = liveMyAgg();
  charts.innerHTML = `
    <div class="chart-grid">
      <div class="chart-card m-strength">
        <div class="label">本周力量日</div>
        <div class="value">${live.strength_done}<small>/3 · ${live.strength_rate}%</small></div>
        <div class="bar-track"><div class="bar-fill" style="width:${live.strength_rate}%"></div></div>
      </div>
      <div class="chart-card m-overload">
        <div class="label">渐进超负荷</div>
        <div class="value">${live.overload_count}<small> 个动作</small></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,live.overload_count*20)}%"></div></div>
      </div>
      <div class="chart-card m-protein">
        <div class="label">蛋白达标天</div>
        <div class="value">${live.protein_days}<small>/7</small></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(live.protein_days/7*100)}%"></div></div>
      </div>
      <div class="chart-card m-streak">
        <div class="label">连续打卡周</div>
        <div class="value">${live.streak_weeks}<small> 周</small></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,live.streak_weeks*25)}%"></div></div>
        <div class="muted small" style="margin-top:8px">${live.streak_rule}</div>
      </div>
    </div>
    <button class="btn block ghost" style="margin-top:10px" onclick="showTab('pulse')">打开详细成果看板</button>`;

  renderHomeRank();

  feed.innerHTML = `<div class="muted small" style="padding:12px 0">加载关注流…</div>`;
  homeApi("/feed").then(data => {
    const liveItems = data.live_rail || [];
    if (rail) {
      const base = liveItems.length ? liveItems : [{ user: "系统", text: "关注后这里滚动好友动态" }];
      const chips = base.concat(base).map(c => `<span class="chip"><b>${c.user}</b> ${c.text}</span>`).join("");
      rail.innerHTML = `<div class="track">${chips}</div>`;
    }
    if (data.empty) {
      feed.innerHTML = `<div class="follow-empty">
        <div class="ico-big">👀</div>
        <div style="font-weight:800">还没有关注的人</div>
        <div class="muted small" style="margin-top:6px">${data.empty_hint || "去发现"}</div>
        <button class="btn block" style="margin-top:14px" onclick="showTab('follows')">去发现</button>
      </div>`;
      return;
    }
    const items = data.items || [];
    feed.innerHTML = items.map(f => {
      const gains = (f.gains || []).map(g => `<div>· ${g.replace(/(\d+→\d+kg|\d+→\d+\s*次|减一档|双侧对称|跪姿→标准|\d+\/\d\s*天达标)/g, '<em>$1</em>')}</div>`).join("");
      const cmts = (f.comments || []).slice(-5).map(c => `<div><b style="color:var(--text)">${c.user}</b> ${c.text}</div>`).join("");
      const open = state.feedCommentFor === f.post_id;
      return `<div class="feed-card">
        <div class="row space">
          <div class="who">${f.user}<div class="muted small">关注 · 本周硬进步</div></div>
          <button type="button" class="follow-btn on" onclick="toggleFollowApi(${f.user_id})">已关注</button>
        </div>
        <div class="gain">${gains}</div>
        <div class="feed-actions">
          <button class="act-chip" type="button" onclick="toggleFeedLikeApi(${f.post_id})">${f.liked_by_me ? "♥" : "♡"} ${f.likes || 0}</button>
          <button class="act-chip" type="button" onclick="openFeedComment(${f.post_id})">留言</button>
        </div>
        ${open ? `<div class="feed-cmt-box">
          <input id="feed-cmt-input" placeholder="写句激励…" maxlength="80" />
          <button class="btn" type="button" onclick="submitFeedCommentApi(${f.post_id})">发送</button>
        </div>` : ""}
        <div class="feed-cmt">${cmts || `<div class="muted">还没有评论</div>`}</div>
      </div>`;
    }).join("");
    if (state.feedCommentFor) setTimeout(() => document.getElementById("feed-cmt-input")?.focus(), 30);
  }).catch(e => { feed.innerHTML = `<div class="file-err">${e.message}</div>`; });
}

function openFeedComment(id) {
  state.feedCommentFor = state.feedCommentFor === id ? null : id;
  renderHomeSocial();
}
function toggleFeedLikeApi(postId) {
  homeApi(`/feed/${postId}/like`, { method: "POST", body: "{}" }).then(() => renderHomeSocial()).catch(e => toast(e.message));
}
function submitFeedCommentApi(postId) {
  const input = document.getElementById("feed-cmt-input");
  const text = (input?.value || "").trim();
  if (!text) { toast("写点什么再发"); return; }
  homeApi(`/feed/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) }).then(() => {
    state.feedCommentFor = null;
    toast("已发送");
    renderHomeSocial();
  }).catch(e => toast(e.message));
}
function toggleFollowApi(uid) {
  homeApi(`/follows/${uid}`, { method: "POST", body: "{}" }).then(res => {
    toast(res.following ? "已关注" : "已取关");
    if (state.tab === "home") renderHomeSocial();
    if (state.tab === "follows") renderFollows();
  }).catch(e => toast(e.message));
}
function renderFollows() {
  const box = document.getElementById("follows-body");
  if (!box) return;
  box.innerHTML = `<div class="muted small">加载…</div>`;
  Promise.all([homeApi("/follows"), homeApi("/discover")]).then(([fol, disc]) => {
    const following = fol.items || [];
    const discover = disc.items || [];
    box.innerHTML = `
      <div class="card"><strong>我的关注 · ${following.length}</strong>
        <p class="muted small" style="margin-top:6px">取关后首页不再展示对方成果</p>
      </div>
      ${following.map(p => `<div class="feed-card">
        <div class="row space">
          <div class="who">${p.name}<div class="muted small">${p.body_band || ""}</div></div>
          <button type="button" class="follow-btn on" onclick="toggleFollowApi(${p.user_id})">已关注</button>
        </div>
      </div>`).join("") || `<div class="muted small" style="padding:8px">还没有关注</div>`}
      <div class="card" style="margin-top:12px"><strong>去发现</strong></div>
      ${discover.map(p => `<div class="feed-card">
        <div class="row space">
          <div class="who">${p.name}<div class="muted small">${p.body_band || ""}</div></div>
          <button type="button" class="follow-btn ${p.following?"on":""}" onclick="toggleFollowApi(${p.user_id})">${p.following?"已关注":"+ 关注"}</button>
        </div>
      </div>`).join("")}`;
  }).catch(e => { box.innerHTML = `<div class="file-err">${e.message}</div>`; });
}

/* 健身市场 v2b：接后端字段表 · 拼装上下布局 · 学法挂动作 · 应用双勾 */
const MARKET_FEE_RATE = 0.15;
const API_BASE = "http://127.0.0.1:8000/api/v1/market";
const API_USER = "4";
const CYCLE_LABEL = { week: "整周", month: "整月", full: "全程" };

async function api(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": API_USER,
      ...(opts.headers || {})
    }
  });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || (`HTTP ${res.status}`);
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}
function yuan(fen) {
  return (Number(fen) / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
function priceOf(p) { return yuan(p.price_fen || 0); }
function mediaCount(media) {
  const m = media || [];
  return {
    images: m.filter(x => x.type === "image").length,
    videos: m.filter(x => x.type === "video").length,
    audio: m.filter(x => x.type === "audio").length
  };
}
function listingBadge(p) {
  if (p.badge) return p.badge;
  if (p.kind === "lesson") return "教学";
  const c = CYCLE_LABEL[p.cycle] || "方案";
  return p.week_index ? `${c} · 第 ${p.week_index} 周` : c;
}
function marketQuery() {
  const q = [];
  if (state.marketKind && state.marketKind !== "all") q.push(`kind=${encodeURIComponent(state.marketKind)}`);
  if (state.marketCycle && state.marketCycle !== "all") q.push(`cycle=${encodeURIComponent(state.marketCycle)}`);
  if (state.marketFilter && state.marketFilter !== "all") q.push(`level=${encodeURIComponent(state.marketFilter)}`);
  return q.length ? "?" + q.join("&") : "";
}
function composeDraft() {
  return state._compose || (state._compose = { slots: { push: null, pull: null, legs: null } });
}
function feeBreakFen(fen) {
  const fee = Number(fen) / 100;
  const platform = Math.round(fee * MARKET_FEE_RATE * 100) / 100;
  const creator = Math.round((fee - platform) * 100) / 100;
  return { fee, platform, creator };
}

function toggleMarketMore() {
  const el = document.getElementById("mkt-more");
  const btn = document.getElementById("mkt-more-btn");
  if (!el) return;
  const on = el.style.display === "none" || !el.style.display;
  el.style.display = on ? "block" : "none";
  btn?.classList.toggle("mkt-more-on", on);
}
function setMarketKind(k) {
  state.marketKind = k;
  ["all","plan","lesson"].forEach(x => document.getElementById("mkt-k-" + x)?.classList.toggle("on", k === x));
  renderMarket();
}
function setMarketCycle(c) {
  state.marketCycle = c;
  ["all","week","month","full"].forEach(x => document.getElementById("mkt-c-" + x)?.classList.toggle("on", c === x));
  renderMarket();
}
function setMarketFilter(f) {
  state.marketFilter = f;
  document.getElementById("mkt-f-all")?.classList.toggle("on", f === "all");
  document.getElementById("mkt-f-beginner")?.classList.toggle("on", f === "入门");
  document.getElementById("mkt-f-adv")?.classList.toggle("on", f === "进阶");
  renderMarket();
}
function setNodeFilter(f) {
  state.nodeFilter = f;
  document.getElementById("node-f-all")?.classList.toggle("on", f === "all");
  document.getElementById("node-f-plan")?.classList.toggle("on", f === "plan");
  document.getElementById("node-f-lesson")?.classList.toggle("on", f === "lesson");
  renderNodes();
}
function openMarketPost(id) {
  state.marketPostId = id;
  showTab("mkt-detail");
}

function renderMarket() {
  const box = document.getElementById("mkt-grid");
  if (!box) return;
  box.innerHTML = `<div class="card muted small" style="grid-column:1/-1;text-align:center;padding:20px">加载市场中…</div>`;
  api("/listings" + marketQuery()).then(data => {
    const list = data.items || [];
    state._marketCache = list;
    if (!list.length) {
      box.innerHTML = `<div class="card muted small" style="grid-column:1/-1;text-align:center;padding:28px 12px">没有符合筛选的商品，试试放宽筛选。</div>`;
      return;
    }
    box.innerHTML = list.map(p => {
      const mc = mediaCount(p.media);
      const isLesson = p.kind === "lesson";
      const cover = isLesson
        ? `<div class="mkt-cover lesson-thumb" aria-hidden="true">▶</div>`
        : `<div class="mkt-cover week-stripes" aria-hidden="true"></div>`;
      return `<button type="button" class="mkt-card ${isLesson ? "cover-lesson" : "cover-week"}" onclick="openMarketPost('${p.listing_id}')">
        ${cover}
        <div class="mkt-badge ${isLesson ? "lesson" : ""}">${listingBadge(p)}</div>
        <div class="mkt-title">${p.title}</div>
        <div class="mkt-user">${p.user || ""} · ${p.level} · ${p.body_range || ""}</div>
        <div class="mkt-meta"><span>♡ ${p.likes || 0}</span><span class="price-chip">¥${priceOf(p)} 复刻</span></div>
        <div class="mkt-media-hint">${mc.images}图/${mc.videos}视频/${mc.audio}音频 · 复刻全保留</div>
      </button>`;
    }).join("");
  }).catch(err => {
    box.innerHTML = `<div class="card file-err" style="grid-column:1/-1">市场加载失败：${err.message}<br/><button class="btn ghost" style="margin-top:8px" onclick="renderMarket()">重试</button></div>`;
  });
}

function toggleLike(id) {
  api(`/listings/${id}/like`, { method: "POST", body: "{}" }).then(() => {
    if (state.tab === "mkt-detail") renderMarketDetail();
    renderMarket();
  }).catch(e => toast(e.message));
}
function submitComment() {
  const id = state.marketPostId;
  const input = document.getElementById("mkt-cmt-input");
  const text = (input?.value || "").trim();
  if (!text) { toast("写点什么再发"); return; }
  api(`/listings/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }).then(() => {
    input.value = "";
    toast("留言已发");
    renderMarketDetail();
  }).catch(e => toast(e.message));
}
function openReplicatePay() {
  state.payAckWeight = false;
  state.payAckLevel = false;
  showTab("mkt-pay");
}
function confirmReplicatePay() {
  if (!(state.payAckWeight && state.payAckLevel)) { toast("请先勾选适配确认"); return; }
  api(`/listings/${state.marketPostId}/replicate`, {
    method: "POST",
    body: JSON.stringify({ ack_weight: true, ack_level: true })
  }).then(() => {
    state.payAckWeight = false; state.payAckLevel = false;
    toast("支付成功 · 已写入训练节点库");
    showTab("nodes");
  }).catch(e => toast(e.message));
}

function renderMarketDetail() {
  const box = document.getElementById("mkt-detail");
  if (!box) return;
  box.innerHTML = `<div class="muted small">加载详情…</div>`;
  document.querySelector(".phone")?.classList.add("mkt-detail-mode");
  api(`/listings/${state.marketPostId}`).then(p => {
    state._marketDetail = p;
    const mc = mediaCount(p.media);
    const comments = p.comments || [];
    const bought = !!p.bought_by_me || !!p.in_nodes;
    let bodyHtml = "";
    if (p.kind === "plan") {
      const dayName = { push: "推日", pull: "拉日", legs: "腿日", rest: "恢复" };
      bodyHtml = (p.days || []).map(d => {
        const rows = (d.exercises || []).map(m =>
          `<div class="list-item"><span>${m.name}</span><span class="muted">${m.load||"—"} · ${m.sets}×${m.reps}</span></div>`
        ).join("");
        return `<div class="card" style="margin-top:8px"><strong>${dayName[d.day_type]||d.day_type} · ${d.session}</strong>${rows}</div>`;
      }).join("");
    } else {
      bodyHtml = `
        <div class="card"><strong>主题 · ${p.topic || ""}</strong>
          <div class="muted small" style="margin-top:6px">${(p.skill_tags||[]).map(t=>`#${t}`).join(" ")}</div>
        </div>
        <div class="card"><strong>步骤</strong><ol class="meal-tips">${(p.steps||[]).map(s=>`<li>${s}</li>`).join("")}</ol></div>
        <div class="card"><strong>关键提示</strong><ul class="meal-tips">${(p.cues||[]).map(s=>`<li>${s}</li>`).join("")}</ul></div>`;
    }
    box.innerHTML = `
    <div class="mkt-detail-scroll">
      <div class="h1">${p.title}</div>
      <div class="sub">${p.user || ""} · ${listingBadge(p)} · ${p.level} · ${p.body_range || ""}</div>
      <div class="card">
        <div class="small">${p.body_text || ""}</div>
        ${p.kind === "plan" ? `<div class="muted small" style="margin-top:8px">周节奏</div><div style="margin-top:4px;font-weight:600">${p.rhythm || "—"}</div>` : ""}
      </div>
      ${bodyHtml}
      <div class="card" style="color:var(--text)">媒体 ${mc.images} 图 / ${mc.videos} 视频 / ${mc.audio} 音频。<strong>复刻后全部保留</strong>进节点库。</div>
      <div class="card">
        <strong>留言</strong>
        <div id="mkt-cmt-list">${comments.length ? comments.map(c => `<div class="list-item"><span><b>${c.user}</b> ${c.text}</span></div>`).join("") : `<div class="muted small" style="padding:8px 0">还没有留言</div>`}</div>
        <div class="row" style="gap:8px;margin-top:8px">
          <input id="mkt-cmt-input" placeholder="说点什么…" style="flex:1;background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:10px;color:var(--text);padding:10px;" />
          <button class="btn" type="button" onclick="submitComment()">发送</button>
        </div>
      </div>
    </div>
    <div class="mkt-sticky">
      <button class="act-chip like-sticky" type="button" onclick="toggleLike('${p.listing_id}')">${p.liked_by_me ? "♥ 已赞" : "♡ 点赞"} · ${p.likes || 0}</button>
      <button class="btn sticky-buy" type="button" onclick="${bought ? "showTab('nodes')" : "openReplicatePay()"}">${bought ? "已在节点库" : `¥${priceOf(p)} 复刻`}</button>
    </div>`;
  }).catch(err => { box.innerHTML = `<div class="file-err">详情加载失败：${err.message}</div>`; });
}

function renderMarketPay() {
  const box = document.getElementById("mkt-pay");
  if (!box) return;
  const p = state._marketDetail;
  if (!p || String(p.listing_id) !== String(state.marketPostId)) {
    box.innerHTML = `<div class="muted small">加载中…</div>`;
    api(`/listings/${state.marketPostId}`).then(d => { state._marketDetail = d; renderMarketPay(); }).catch(e => {
      box.innerHTML = `<div class="file-err">${e.message}</div>`;
    });
    return;
  }
  const { fee, platform, creator } = feeBreakFen(p.price_fen);
  const ok = !!(state.payAckWeight && state.payAckLevel);
  box.innerHTML = `
    <div class="card">
      <div class="muted small">将复刻为训练节点 · ${p.kind}</div>
      <div style="font-weight:800;font-size:18px;margin-top:4px">${p.title}</div>
      <div class="muted small" style="margin-top:4px">创作者 ${p.user || ""}</div>
      <div class="small" style="margin-top:8px">${p.body_text || ""}</div>
    </div>
    <div class="card">
      <div class="list-item"><span>标价（买家实付）</span><span><strong>¥${fee.toFixed(2)}</strong></span></div>
      <div class="list-item"><span>其中创作者收入</span><span>¥${creator.toFixed(2)}</span></div>
      <div class="list-item"><span>市场抽成 15%</span><span>¥${platform.toFixed(2)}</span></div>
    </div>
    <div class="card">
      <strong>复刻前强制确认</strong>
      <label class="consent"><input type="checkbox" ${state.payAckWeight?"checked":""} onchange="state.payAckWeight=this.checked;renderMarketPay()" /><span>我确认自身体重大致落在适配区间（${p.body_range || "—"}）</span></label>
      <label class="consent"><input type="checkbox" ${state.payAckLevel?"checked":""} onchange="state.payAckLevel=this.checked;renderMarketPay()" /><span>我确认训练水平匹配（${p.level}），不会盲目上大重量</span></label>
    </div>
    <button class="btn block" ${ok ? "" : "disabled"} onclick="confirmReplicatePay()">确认支付并写入节点库 · ¥${fee.toFixed(2)}</button>`;
}

function validateListable(post) {
  const issues = [];
  if (!post.title) issues.push("缺标题");
  if (post.kind === "lesson") {
    if (!(post.demo_media || []).length) issues.push("教学模块须至少 1 个示范媒体");
    if (!post.topic) issues.push("缺主题 topic");
  } else {
    if (!["week","month","full"].includes(post.cycle)) issues.push("方案须选周期");
    if (!post.rhythm) issues.push("缺节奏说明");
    const types = (post.days || []).map(d => d.day_type);
    ["push","pull","legs"].forEach(t => { if (!types.includes(t)) issues.push(`缺 ${t} 日`); });
  }
  return issues;
}
function dayMovesFromPlan(d, sess) {
  const plan = planFor(d);
  if (!plan || plan.type === "rest") return [];
  const list = sess === "am" ? plan.am : plan.pm;
  const key = sessionKey(d, sess);
  const logs = state.logs[key] || [];
  return list.slice(0, 3).map(ex => {
    const hit = logs.find(l => l.name === ex.name);
    return {
      name: ex.name,
      sets: String(hit?.sets || (String(ex.sets).match(/\d+/) || ["3"])[0]),
      reps: String(hit?.reps || String(ex.reps).replace(/分钟|秒.*/, "10") || "8"),
      load: hit?.weight || "自重",
      notes: ""
    };
  });
}
function buildListDraftFromLogs(kind, cycle) {
  if (kind === "lesson") {
    return {
      kind: "lesson", title: "如何做俯卧撑 · 我的要点", level: "入门", body_range: "不限",
      price_fen: 990, media: [{ type: "video", url: "https://cdn.example.com/local-demo.mp4", title: "示范" }],
      body_text: "教学模块示例", topic: "俯卧撑", skill_tags: ["推"],
      steps: ["手略宽于肩", "身体一条线下放", "稳定推起"], cues: ["核心收紧"],
      demo_media: [{ type: "video", url: "https://cdn.example.com/local-demo.mp4", title: "示范" }]
    };
  }
  const days = [
    { day_type: "push", session: "both", exercises: dayMovesFromPlan(1, "am").concat(dayMovesFromPlan(1, "pm")) },
    { day_type: "pull", session: "both", exercises: dayMovesFromPlan(3, "am").concat(dayMovesFromPlan(3, "pm")) },
    { day_type: "legs", session: "both", exercises: dayMovesFromPlan(5, "am").concat(dayMovesFromPlan(5, "pm")) }
  ];
  return {
    kind: "plan", title: `我的${CYCLE_LABEL[cycle] || "周"}方案 · 第${state.phase || 1}周`,
    level: "进阶", body_range: "70–85kg", price_fen: 1290, media: [],
    body_text: "来自本周推/拉/腿计划", cycle: cycle || "week", week_index: state.phase || 1,
    rhythm: "周一推 / 周三拉 / 周五腿 · 早晚两练", days
  };
}
function renderMarketList() {
  const box = document.getElementById("mkt-list-body");
  if (!box) return;
  const kind = state.listKind || "plan";
  const cycle = state.listCycle || "week";
  const draft = buildListDraftFromLogs(kind, cycle);
  const issues = validateListable(draft);
  const ok = issues.length === 0;
  box.innerHTML = `
    <div class="card">
      <strong>上架类型</strong>
      <div class="seg" style="margin-top:8px">
        <button type="button" class="${kind==="plan"?"on":""}" onclick="state.listKind='plan';renderMarketList()">可执行方案</button>
        <button type="button" class="${kind==="lesson"?"on":""}" onclick="state.listKind='lesson';renderMarketList()">教学模块</button>
      </div>
      ${kind==="plan" ? `<div class="seg" style="margin-top:8px">
        <button type="button" class="${cycle==="week"?"on":""}" onclick="state.listCycle='week';renderMarketList()">周</button>
        <button type="button" class="${cycle==="month"?"on":""}" onclick="state.listCycle='month';renderMarketList()">月</button>
        <button type="button" class="${cycle==="full"?"on":""}" onclick="state.listCycle='full';renderMarketList()">全程</button>
      </div>` : `<p class="muted small" style="margin-top:8px">教学须带示范媒体；禁止带 days 负荷方案。</p>`}
    </div>
    <div class="card">
      <div style="font-weight:700">${draft.title}</div>
      <div class="muted small" style="margin-top:4px">${draft.kind} · ${draft.level}</div>
      <div class="field" style="margin-top:10px"><label>水平</label>
        <select id="list-level" class="ai-select"><option>进阶</option><option>入门</option></select></div>
      <div class="field" style="margin-top:10px"><label>标价（元）</label>
        <input id="list-fee" type="number" min="1" step="0.1" value="${(draft.price_fen/100).toFixed(1)}" style="width:100%;background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:10px;color:var(--text);padding:10px;" />
      </div>
      ${ok ? `<div class="muted small" style="margin-top:8px;color:var(--accent)">已通过上架校验</div>` : `<div class="file-err">未通过：${issues.join("；")}</div>`}
      <button class="btn block" ${ok ? "" : "disabled"} onclick="publishListing()">确认上架到市场</button>
    </div>`;
}
function publishListing() {
  const kind = state.listKind || "plan";
  const cycle = state.listCycle || "week";
  const draft = buildListDraftFromLogs(kind, cycle);
  const fee = Number(document.getElementById("list-fee")?.value || draft.price_fen / 100);
  draft.level = document.getElementById("list-level")?.value || draft.level;
  draft.price_fen = Math.round(fee * 100);
  const issues = validateListable(draft);
  if (issues.length) { toast(issues[0]); return; }
  api("/listings", { method: "POST", body: JSON.stringify(draft) }).then(() => {
    toast("已上架到健身市场");
    showTab("home");
  }).catch(e => toast(e.message));
}

function renderNodes() {
  const host = document.getElementById("nodes-list");
  if (!host) return;
  host.innerHTML = `<div class="muted small">加载节点库…</div>`;
  const f = state.nodeFilter || "all";
  api("/nodes").then(data => {
    state._nodesCache = data.items || [];
    let list = state._nodesCache;
    if (f !== "all") list = list.filter(n => n.kind === f);
    if (!list.length) {
      host.innerHTML = `<div class="card muted small" style="text-align:center;padding:24px">节点库还空着，去市场复刻。</div>`;
      return;
    }
    host.innerHTML = list.map(n => {
      const mc = mediaCount(n.media);
      const actions = n.kind === "plan"
        ? `<button class="btn block" style="margin-top:8px" onclick="addPlanToCompose('${n.node_id}')">拼进计划</button>`
        : `<button class="btn block ghost" style="margin-top:8px" onclick="openLessonNode('${n.node_id}')">查看学动作</button>
           <button class="btn block ghost" onclick="pickLessonForAttach('${n.node_id}')">挂到某动作学法位</button>`;
      return `<div class="node-card">
        <div class="row space">
          <span class="kind-pill ${n.kind}">${n.kind === "plan" ? "方案 plan" : "教学 lesson"}</span>
          <span class="muted small">${mc.images}图/${mc.videos}视频</span>
        </div>
        <div style="font-weight:800;margin-top:8px">${n.title}</div>
        <div class="muted small" style="margin-top:4px">${n.level || ""} · ${n.body_range || ""}</div>
        ${actions}
      </div>`;
    }).join("");
  }).catch(e => { host.innerHTML = `<div class="file-err">${e.message}</div>`; });
}
function openLessonNode(id) {
  state.lessonNodeId = id;
  showTab("lesson-view");
}
function renderLessonView() {
  const box = document.getElementById("lesson-view");
  if (!box) return;
  const n = (state._nodesCache || []).find(x => String(x.node_id) === String(state.lessonNodeId));
  if (!n) {
    api("/nodes").then(data => {
      state._nodesCache = data.items || [];
      renderLessonView();
    }).catch(e => { box.innerHTML = `<div class="file-err">${e.message}</div>`; });
    return;
  }
  box.innerHTML = `
    <div class="h1">${n.title}</div>
    <div class="sub">${n.topic || ""} · ${(n.skill_tags||[]).map(t=>"#"+t).join(" ")}</div>
    <div class="card"><strong>步骤</strong><ol class="meal-tips">${(n.steps||[]).map(s=>`<li>${s}</li>`).join("")}</ol></div>
    <div class="card"><strong>关键提示</strong><ul class="meal-tips">${(n.cues||[]).map(s=>`<li>${s}</li>`).join("")}</ul></div>
    <div class="card"><strong>示范媒体</strong>
      ${(n.demo_media||n.media||[]).map(m=>`<div class="list-item"><span>${m.type}</span><span class="muted">${m.title||m.url}</span></div>`).join("")}
    </div>
    <button class="btn block" onclick="pickLessonForAttach('${n.node_id}')">挂到某动作学法位</button>`;
}

function addPlanToCompose(nodeId) {
  const n = (state._nodesCache || []).find(x => String(x.node_id) === String(nodeId));
  const go = (node) => {
    if (!node || node.kind !== "plan") { toast("仅可执行方案可填力量日"); return; }
    const draft = composeDraft();
    (node.days || []).forEach(d => {
      if (!["push","pull","legs"].includes(d.day_type)) return;
      draft.slots[d.day_type] = {
        from_plan_node_id: node.node_id,
        title: node.title,
        level: node.level,
        body_range: node.body_range,
        day_type: d.day_type,
        session: d.session || "both",
        exercises: (d.exercises || []).map(ex => ({
          name: ex.name, sets: ex.sets, reps: ex.reps, load: ex.load, notes: ex.notes || "",
          from_plan_node_id: node.node_id,
          lesson_node_id: null,
          lesson_title: null
        }))
      };
    });
    state.assembleAckWeight = false;
    state.assembleAckLevel = false;
    toast("已填入推/拉/腿");
    showTab("compose");
  };
  if (n) go(n);
  else api("/nodes").then(data => {
    state._nodesCache = data.items || [];
    go(state._nodesCache.find(x => String(x.node_id) === String(nodeId)));
  }).catch(e => toast(e.message));
}
function pickLessonForAttach(lessonNodeId) {
  state.pendingLessonId = lessonNodeId;
  const draft = composeDraft();
  const has = ["push","pull","legs"].some(s => draft.slots[s] && (draft.slots[s].exercises||[]).length);
  if (!has) { toast("先拼进一个方案，再把教学挂到具体动作"); showTab("compose"); return; }
  toast("点动作右侧「学」芯片挂上");
  showTab("compose");
}
function attachLessonToExercise(dayType, exIndex) {
  const lessonId = state.pendingLessonId;
  if (!lessonId) { toast("先从节点库选一个教学再点「学」"); return; }
  const lesson = (state._nodesCache || []).find(x => String(x.node_id) === String(lessonId));
  const draft = composeDraft();
  const slot = draft.slots[dayType];
  if (!slot || !slot.exercises[exIndex]) return;
  slot.exercises[exIndex].lesson_node_id = Number(lessonId);
  slot.exercises[exIndex].lesson_title = lesson?.title || ("lesson#" + lessonId);
  state.pendingLessonId = null;
  toast(`已挂到 ${slot.exercises[exIndex].name}`);
  renderCompose();
}
function clearLessonOnExercise(dayType, exIndex) {
  const draft = composeDraft();
  const slot = draft.slots[dayType];
  if (!slot || !slot.exercises[exIndex]) return;
  slot.exercises[exIndex].lesson_node_id = null;
  slot.exercises[exIndex].lesson_title = null;
  renderCompose();
}
function clearComposeSlot(slot) {
  composeDraft().slots[slot] = null;
  renderCompose();
}
function renderCompose() {
  const box = document.getElementById("compose-body");
  if (!box) return;
  const draft = composeDraft();
  const dayName = { push: "推日", pull: "拉日", legs: "腿日" };
  const slotsHtml = ["push","pull","legs"].map(s => {
    const hit = draft.slots[s];
    if (!hit) {
      return `<div class="slot-day"><strong>${dayName[s]}</strong><div class="muted small" style="margin-top:6px">空 · 从下方节点库点「拼进」</div></div>`;
    }
    const rows = (hit.exercises || []).map((ex, i) => {
      const on = !!ex.lesson_node_id;
      return `<div class="ex-row-lesson">
        <span>${ex.name}<div class="muted small">${ex.load||"—"} · ${ex.sets}×${ex.reps}${on ? ` · 学：${ex.lesson_title||""}` : ""}</div></span>
        <button type="button" class="learn-chip ${on?"on":""}" onclick="${on ? `clearLessonOnExercise('${s}',${i})` : `attachLessonToExercise('${s}',${i})`}">${on ? "学✓" : "学"}</button>
      </div>`;
    }).join("");
    return `<div class="slot-day">
      <div class="row space"><strong>${dayName[s]} · ${hit.title}</strong>
        <button class="act-chip" type="button" onclick="clearComposeSlot('${s}')">移除</button></div>
      ${rows}
    </div>`;
  }).join("");

  const pending = state.pendingLessonId
    ? `<div class="card warn-card" style="color:var(--text)">已选教学 #${state.pendingLessonId}，点动作右侧「学」挂上；lesson 不能单独填满力量日。</div>`
    : `<p class="muted small">教学请先「挂到某动作学法位」，再点动作行「学」芯片。</p>`;

  const ok = !!(state.assembleAckWeight && state.assembleAckLevel);
  const hasDays = ["push","pull","legs"].some(s => draft.slots[s]);

  box.innerHTML = `
    <div class="compose-stack">
      <div class="card compose-slots">
        <strong>已选推 / 拉 / 腿</strong>
        <div style="margin-top:8px">${slotsHtml}</div>
      </div>
      ${pending}
      <div class="card">
        <strong>节点库</strong>
        <div class="muted small" style="margin-top:4px">横滑选择</div>
        <div class="nodes-drawer" id="compose-drawer" style="margin-top:8px"><div class="muted small">加载中…</div></div>
      </div>
      <div class="card">
        <strong>应用到本周前确认</strong>
        <label class="consent"><input type="checkbox" ${state.assembleAckWeight?"checked":""} onchange="state.assembleAckWeight=this.checked;renderCompose()" /><span>ack_weight · 我确认体重落在方案适配区间</span></label>
        <label class="consent"><input type="checkbox" ${state.assembleAckLevel?"checked":""} onchange="state.assembleAckLevel=this.checked;renderCompose()" /><span>ack_level · 我确认训练水平匹配</span></label>
      </div>
      <button class="btn block" ${ok && hasDays ? "" : "disabled"} onclick="applyComposeToWeek()">应用到本周训练</button>
    </div>`;

  api("/nodes").then(data => {
    state._nodesCache = data.items || [];
    const drawer = document.getElementById("compose-drawer");
    if (!drawer) return;
    const items = state._nodesCache;
    drawer.innerHTML = items.length ? items.map(n => {
      const onclick = n.kind === "plan"
        ? `addPlanToCompose('${n.node_id}')`
        : `pickLessonForAttach('${n.node_id}')`;
      return `<button type="button" class="compose-item" onclick="${onclick}"><b>${n.kind}</b><br/>${n.title}</button>`;
    }).join("") : `<div class="muted small">先去复刻节点</div>`;
  }).catch(e => {
    const drawer = document.getElementById("compose-drawer");
    if (drawer) drawer.innerHTML = `<div class="file-err">${e.message}</div>`;
  });
}

function applyComposeToWeek() {
  if (!(state.assembleAckWeight && state.assembleAckLevel)) { toast("请先勾选体重与水平确认"); return; }
  const draft = composeDraft();
  const days = ["push","pull","legs"].map(s => draft.slots[s]).filter(Boolean).map(slot => ({
    day_type: slot.day_type,
    session: slot.session || "both",
    exercises: (slot.exercises || []).map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      load: ex.load,
      notes: ex.notes || "",
      from_plan_node_id: ex.from_plan_node_id || null,
      lesson_node_id: ex.lesson_node_id || null
    }))
  }));
  if (!days.length) { toast("请先拼进方案"); return; }
  api("/assemble", {
    method: "POST",
    body: JSON.stringify({
      title: "我的拼装方案",
      cycle: "week",
      days,
      ack_weight: true,
      ack_level: true
    })
  }).then(res => {
    // 同步本地一周力量日，便于训练页立刻可见
    const map = { push: 1, pull: 3, legs: 5 };
    days.forEach(d => {
      const weekday = map[d.day_type];
      if (!weekday) return;
      const exs = d.exercises || [];
      const mid = Math.ceil(exs.length / 2) || 1;
      ["am","pm"].forEach((sess, i) => {
        const chunk = i === 0 ? exs.slice(0, mid) : exs.slice(mid);
        const key = sessionKey(weekday, sess);
        state.logs[key] = (state.logs[key] || []).filter(x => x.source !== "compose");
        chunk.forEach(m => {
          state.logs[key].push({
            id: "C" + Date.now() + Math.random().toString(16).slice(2,5),
            name: m.name, weight: m.load || "自重", sets: String(m.sets), reps: String(m.reps),
            rpe: "—", at: new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),
            source: "compose", lesson_node_id: m.lesson_node_id || null
          });
        });
      });
    });
    save();
    state.assembleAckWeight = false;
    state.assembleAckLevel = false;
    toast(res.message || "已应用到本周");
    showTab("week");
  }).catch(e => toast(e.message));
}

function applyBoughtPlan(id) { addPlanToCompose(id); }
function renderMinePurchases() {
  const host = document.getElementById("mine-purchases");
  if (!host) return;
  host.innerHTML = `<div class="muted small">加载…</div>`;
  api("/nodes").then(data => {
    const list = (data.items || []).slice(0, 3);
    host.innerHTML = list.length ? list.map(b => `
      <div class="buy-item">
        <div class="row space"><span>${b.title}<div class="muted small">${b.kind}</div></span></div>
        <button class="btn block ghost" style="margin-top:8px" onclick="showTab('nodes')">在节点库查看</button>
      </div>`).join("") : `<div class="muted small" style="padding:8px 0">还没有节点，去市场复刻。</div>`;
  }).catch(e => { host.innerHTML = `<div class="file-err">${e.message}</div>`; });
}


function showTab(name) {
  state.tab = name;
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + name));
  document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  const phone = document.querySelector(".phone");
  if (phone) {
    phone.classList.toggle("video-mode", name === "video" || name === "ai" || name === "meal" || name === "compose" || name === "nodes" || name === "lesson-view" || name === "mkt-list" || name === "mkt-pay");
    phone.classList.toggle("mkt-detail-mode", name === "mkt-detail");
  }
  render();
}
function setPhase(n) {
  state.phase = Math.min(4, Math.max(1, Number(n) || 1));
  save();
  toast(PHASES[state.phase].title);
  render();
}
function phaseMeta() { return PHASES[state.phase] || PHASES[1]; }
function isNoSetsExercise(ex) {
  if (!ex) return false;
  if (ex.noSets || ex.timed) return true;
  const s = String(ex.sets);
  const r = String(ex.reps || "");
  return s === "—" || /分钟|秒/.test(r);
}
function decorateExercise(ex, isPm) {
  const ph = phaseMeta();
  let sets = ex.sets;
  if (!isNoSetsExercise(ex) && isPm && ph.pmSetsBoost && (sets === "3–4" || sets === 3)) sets = "4";
  const extra = isNoSetsExercise(ex) ? "" :
    (ph.amSetsHint && !isPm ? ` · ${ph.amSetsHint}` : (isPm && ph.pmSetsBoost ? ` · ${ph.overload}` : ""));
  return { ...ex, sets, note: (ex.note || "") + extra };
}


function exCheckKey(weekday, session, name) {
  return `${weekday}-${session}::${name}`;
}
function isExChecked(weekday, session, name) {
  ensureWeekBags();
  return !!(state.exChecks[state.weekId] || {})[exCheckKey(weekday, session, name)];
}
function toggleExCheck(weekday, session, name, checked) {
  ensureWeekBags();
  const bag = state.exChecks[state.weekId];
  const k = exCheckKey(weekday, session, name);
  if (checked) bag[k] = true;
  else delete bag[k];
  syncStrengthDayFromChecks(weekday);
  save();
  if (state.tab === "week") renderWeek();
  if (state.tab === "today") renderToday();
  if (state.tab === "market") renderMarket();
  if (state.tab === "pulse") renderHome();
  if (state.tab === "home") renderHomeSocial();
  if (state.tab === "rank") renderRankPage();
  if (state.tab === "mkt-detail") renderMarketDetail();
  if (state.tab === "mkt-pay") renderMarketPay();
  if (state.tab === "protein") renderMinePurchases();
}
function syncStrengthDayFromChecks(weekday) {
  ensureWeekBags();
  if (![1, 3, 5].includes(Number(weekday))) return;
  const p = planFor(weekday);
  if (!p) return;
  const all = [...p.am.map(e => ["am", e.name]), ...p.pm.map(e => ["pm", e.name])];
  const complete = all.length > 0 && all.every(([s, n]) => isExChecked(weekday, s, n));
  if (complete) state.doneDays[state.weekId][wdKey(weekday)] = true;
  else delete state.doneDays[state.weekId][wdKey(weekday)];
}
function checkAllToday() {
  ensureWeekBags();
  const p = planFor(state.weekday);
  if (!p) return;
  const bag = state.exChecks[state.weekId];
  for (const ex of p.am) bag[exCheckKey(state.weekday, "am", ex.name)] = true;
  for (const ex of p.pm) bag[exCheckKey(state.weekday, "pm", ex.name)] = true;
  syncStrengthDayFromChecks(state.weekday);
  save();
  toast("已按清单全部勾选");
  renderToday();
  renderHome();
}
function dayCheckStats(weekday) {
  const p = planFor(weekday);
  if (!p) return { done: 0, total: 0 };
  const all = [...p.am.map(e => ["am", e.name]), ...p.pm.map(e => ["pm", e.name])];
  const done = all.filter(([s, n]) => isExChecked(weekday, s, n)).length;
  return { done, total: all.length };
}

function parseLoad(entry) {
  const w = parseFloat(String(entry.weight).replace(/[^0-9.]/g, ""));
  const r = parseFloat(String(entry.reps).replace(/[^0-9.]/g, ""));
  const weight = Number.isFinite(w) ? w : 0;
  const reps = Number.isFinite(r) ? r : 0;
  return weight * 1000 + reps;
}

function keysForWeek(w = state.weekId) {
  return Object.keys(state.logs).filter(k => k.startsWith(w + "|")).sort();
}
function bestByName(keys) {
  const best = {};
  for (const key of keys) {
    for (const e of state.logs[key] || []) {
      const score = parseLoad(e);
      if (best[e.name] == null || score > best[e.name]) best[e.name] = score;
    }
  }
  return best;
}
function previousWeekId(w = state.weekId) {
  const [y, m, d] = w.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  mon.setDate(mon.getDate() - 7);
  return ymd(mon);
}
/** 本周上涨：本周最佳 > 上周最佳；若无上周，则本周内后记优于先记 */
function countOverloadMoves() {
  const thisKeys = keysForWeek(state.weekId);
  const thisBest = bestByName(thisKeys);
  const prevBest = bestByName(keysForWeek(previousWeekId()));
  const improved = new Set();
  for (const name of Object.keys(thisBest)) {
    if (prevBest[name] != null) {
      if (thisBest[name] > prevBest[name]) improved.add(name);
    }
  }
  // within-week progression when no prev week baseline
  const chronological = {};
  for (const key of thisKeys) {
    for (const e of state.logs[key] || []) {
      const score = parseLoad(e);
      if (chronological[e.name] != null && score > chronological[e.name]) {
        if (prevBest[e.name] == null) improved.add(e.name);
      }
      if (chronological[e.name] == null || score > chronological[e.name]) chronological[e.name] = score;
    }
  }
  return improved.size;
}
function strengthDoneCount() {
  ensureWeekBags();
  const bag = state.doneDays[state.weekId] || {};
  return [1, 3, 5].filter(d => bag[wdKey(d)]).length;
}
function proteinHitCount() {
  ensureWeekBags();
  return Object.values(state.proteinHits[state.weekId] || {}).filter(Boolean).length;
}
function isDayDone(d) {
  ensureWeekBags();
  return !!(state.doneDays[state.weekId] || {})[wdKey(d)];
}
function markDayDone(d) {
  ensureWeekBags();
  state.doneDays[state.weekId][wdKey(d)] = true;
  save();
}

function lastSameExercise(name, beforeKey, beforeId) {
  const keys = Object.keys(state.logs).sort();
  let prev = null;
  for (const key of keys) {
    for (const e of state.logs[key] || []) {
      if (e.name !== name) continue;
      if (beforeKey && beforeId && key === beforeKey && e.id === beforeId) return prev;
      prev = { ...e, _key: key };
    }
  }
  return prev;
}

function renderHome() {
  const s = strengthDoneCount();
  const o = countOverloadMoves();
  const p = proteinHitCount();
  const ph = phaseMeta();
  const elS = document.getElementById("m-strength");
  if (!elS) return;
  elS.innerHTML = `${s}<small>/3</small>`;
  document.getElementById("m-overload").innerHTML = `${o}<small> 个动作</small>`;
  document.getElementById("m-protein").innerHTML = `${p}<small>/7</small>`;
  document.getElementById("m-week").innerHTML = `${state.phase}<small>/4</small>`;
  const foot = document.getElementById("m-week-foot");
  if (foot) foot.textContent = ph.title;
  const ht = document.getElementById("home-hero-title");
  if (ht) ht.textContent = ph.title;
  const sub = document.getElementById("home-hero-sub");
  if (sub) sub.textContent = `本周起始 ${state.weekId} · 环内为综合完成度`;
  const pulse = Math.round(((s / 3) * 0.4 + (Math.min(o, 6) / 6) * 0.3 + (p / 7) * 0.2 + (state.phase / 4) * 0.1) * 100);
  const ring = document.getElementById("home-ring");
  const ringTxt = document.getElementById("home-ring-txt");
  if (ring) ring.style.setProperty("--p", String(pulse));
  if (ringTxt) ringTxt.textContent = pulse + "%";
}

function seedDemoStats(silent) {
  const w = state.weekId;
  const prev = previousWeekId(w);
  state.phase = 2;
  state.doneDays[w] = { "1": true, "3": true };
  state.proteinHits[w] = { "1": true, "2": true, "3": true, "4": true };
  state.proteinGrams[w] = { "1": 152, "2": 150, "3": 155, "4": 151, [wdKey(state.weekday)]: 152 };
  state.logs = {
    [`${prev}|1-am`]: [
      { id: "demo-p1", name: "哑铃卧推", weight: "16", sets: "3", reps: "5", rpe: "7", at: "07:20" },
      { id: "demo-p2", name: "板俯卧撑", weight: "自重", sets: "3", reps: "5", rpe: "8", at: "07:35" },
    ],
    [`${w}|1-am`]: [
      { id: "demo-1", name: "哑铃卧推", weight: "16", sets: "3", reps: "5", rpe: "7", at: "07:20" },
      { id: "demo-2", name: "板俯卧撑", weight: "自重", sets: "3", reps: "5", rpe: "8", at: "07:35" },
    ],
    [`${w}|3-am`]: [
      { id: "demo-3", name: "哑铃卧推", weight: "18", sets: "3", reps: "5", rpe: "8", at: "07:18" },
      { id: "demo-4", name: "引体向上（可辅助）", weight: "辅助", sets: "3", reps: "5", rpe: "8", at: "07:40" },
      { id: "demo-5", name: "板俯卧撑", weight: "自重", sets: "3", reps: "6", rpe: "8", at: "07:50" },
    ],
  };
  loadTodayProtein();
  save();
  if (!silent) toast("演示数据已填入（按本周结算）");
  if (state.tab === "home") renderHomeSocial();
  else renderHome();
}

function renderToday() {
  const p = planFor(state.weekday);
  const raw = state.session === "am" ? p.am : p.pm;
  const isPm = state.session === "pm";
  const list = raw.map(ex => decorateExercise(ex, isPm));
  const ph = phaseMeta();
  document.getElementById("today-badge").className = "badge " + p.badge;
  document.getElementById("today-badge").textContent = p.label;
  document.getElementById("today-sub").textContent =
    (state.session === "am" ? "早训 · 主复合 / 核心力量" : "晚训 · 辅助 + 有氧/体态") + " · 约 50–60 分钟";
  const tp = document.getElementById("today-phase");
  if (tp) tp.textContent = ph.title + " · " + ph.focus;
  document.getElementById("seg-am").classList.toggle("on", state.session === "am");
  document.getElementById("seg-pm").classList.toggle("on", state.session === "pm");
  const box = document.getElementById("ex-list");
  box.innerHTML = list.map((ex, i) => {
    const meta = isNoSetsExercise(ex)
      ? `${ex.reps}${ex.note ? " · " + ex.note : ""}`
      : `${ex.sets} 组 · ${ex.reps} 次${ex.note ? " · " + ex.note : ""}`;
    const checked = isExChecked(state.weekday, state.session, ex.name);
    const safe = ex.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const hasV = videosFor(ex.name).length > 0;
    const vchip = `<button class="vid-chip ${hasV ? "" : "ghost"}" type="button" onclick="openVideoPage('${safe}','today')"><span class="vid-play">${hasV ? "▶" : "＋"}</span>${hasV ? "视频" : "绑视频"}</button>`;
    return `<div class="ex-block ${checked ? "done" : ""}">
      <label class="ex-main">
        <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleExCheck(state.weekday,state.session,'${safe}',this.checked)" />
        <div class="body"><div class="name">${ex.name}</div><div class="meta">${meta}</div></div>
      </label>
      <div class="ex-actions">${vchip}<button class="act-chip" type="button" onclick="openLog(${i})">记录</button></div>
    </div>`;
  }).join("");
  const key = sessionKey();
  const logged = state.logs[key] || [];
  document.getElementById("logged-count").textContent = `本时段已记 ${logged.length} 条`;
}

function fillLogForm(ex, entry) {
  document.getElementById("log-title").textContent = ex.name;
  const noSets = isNoSetsExercise(ex);
  document.getElementById("log-meta").textContent = noSets
    ? `目标 ${ex.reps}`
    : `目标 ${ex.sets} 组 × ${ex.reps}`;
  const setsField = document.getElementById("in-sets");
  setsField.disabled = false;
  if (entry) {
    document.getElementById("in-weight").value = entry.weight === "自重" ? "" : entry.weight;
    document.getElementById("in-sets").value = entry.sets === "—" ? "" : entry.sets;
    document.getElementById("in-reps").value = entry.reps === "—" ? "" : entry.reps;
    document.getElementById("in-rpe").value = entry.rpe === "—" ? "" : entry.rpe;
  } else {
    document.getElementById("in-weight").value = "";
    document.getElementById("in-sets").value = noSets ? "" : (String(ex.sets).match(/^\d+/) || [""])[0];
    document.getElementById("in-reps").value = "";
    document.getElementById("in-rpe").value = "7";
  }
  if (noSets) {
    setsField.placeholder = "可不填";
    document.getElementById("in-reps").placeholder = "分钟或秒";
  } else {
    setsField.placeholder = "3";
    document.getElementById("in-reps").placeholder = "5";
  }
  const prev = lastSameExercise(ex.name, entry && state.editing ? state.editing.key : null, entry && state.editing ? state.editing.id : null);
  const cmp = document.getElementById("log-compare");
  if (cmp) {
    cmp.textContent = prev
      ? `上次同动作：${prev.weight} · ${prev.sets}×${prev.reps} · RPE ${prev.rpe}`
      : "上次同动作：暂无记录";
  }
}

function openLog(i) {
  const p = planFor(state.weekday);
  const raw = state.session === "am" ? p.am : p.pm;
  const list = raw.map(ex => decorateExercise(ex, state.session === "pm"));
  state.logExercise = list[i];
  state.editing = null;
  fillLogForm(state.logExercise, null);
  showTab("log");
}

function saveLog() {
  if (!state.logExercise && state.editing) {
    const arr = state.logs[state.editing.key] || [];
    const cur = arr.find(e => e.id === state.editing.id);
    if (cur) state.logExercise = { name: cur.name, sets: cur.sets, reps: cur.reps, noSets: cur.sets === "—" || /分钟|秒/.test(String(cur.reps)) };
  }
  if (!state.logExercise) return;
  const noSets = isNoSetsExercise(state.logExercise);
  const setsRaw = document.getElementById("in-sets").value.trim();
  const entry = {
    id: state.editing ? state.editing.id : `L${Date.now()}`,
    name: state.logExercise.name,
    weight: document.getElementById("in-weight").value.trim() || "自重",
    sets: setsRaw || (noSets ? "—" : "3"),
    reps: document.getElementById("in-reps").value.trim() || "—",
    rpe: document.getElementById("in-rpe").value.trim() || "—",
    at: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };
  if (state.editing) {
    const arr = state.logs[state.editing.key] || [];
    const idx = arr.findIndex(e => e.id === state.editing.id);
    if (idx >= 0) arr[idx] = entry;
    state.editing = null;
    state.logExercise = null;
    save();
    toast("已更新记录");
    showTab("hist");
    return;
  }
  const key = sessionKey();
  if (!state.logs[key]) state.logs[key] = [];
  state.logs[key].push(entry);
  save();
  state.logExercise = null;
  toast("已记录（力量日请用勾选确认）");
  showTab("today");
}

function editLog(key, id) {
  const arr = state.logs[key] || [];
  const entry = arr.find(e => e.id === id);
  if (!entry) return;
  state.editing = { key, id };
  state.logExercise = { name: entry.name, sets: entry.sets, reps: entry.reps, noSets: entry.sets === "—" || /分钟|秒/.test(String(entry.reps)) };
  fillLogForm(state.logExercise, entry);
  showTab("log");
}
function deleteLog(key, id) {
  if (!confirm("删除这条记录？")) return;
  state.logs[key] = (state.logs[key] || []).filter(e => e.id !== id);
  if (!(state.logs[key] || []).length) delete state.logs[key];
  save();
  toast("已删除");
  renderHistory();
}

function renderWeek() {
  const box = document.getElementById("week-grid");
  box.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d => {
    const p = planFor(d);
    const short = p.type === "push" ? "推" : p.type === "pull" ? "拉" : p.type === "leg" ? "腿" : "休";
    const st = dayCheckStats(d);
    const frac = st.total ? `${st.done}/${st.total}` : "";
    return `<div class="day ${d === state.weekday ? "on" : ""} ${isDayDone(d) ? "done" : ""}" onclick="pickDay(${d})">
      <div class="d">周${WEEK_LABEL[d - 1]}</div><div class="t">${short}</div>
      <div class="muted" style="font-size:10px;margin-top:4px">${frac}</div></div>`;
  }).join("");
  const strengthDone = strengthDoneCount();
  document.getElementById("week-check").textContent = `本周力量日 ${strengthDone}/3 · 周起始 ${state.weekId}`;
  document.getElementById("week-bar").style.width = `${(strengthDone / 3) * 100}%`;
  const ph = phaseMeta();
  const tag = document.getElementById("phase-tag");
  if (tag) tag.textContent = ph.title;
  const hint = document.getElementById("phase-hint");
  if (hint) hint.textContent = ph.focus;
  document.querySelectorAll(".phase-seg button").forEach(b => {
    b.classList.toggle("on", Number(b.dataset.phase) === state.phase);
  });
  renderWeekDetail();
}
function renderWeekDetail() {
  const d = state.weekday;
  const p = planFor(d);
  const title = document.getElementById("week-detail-title");
  const sub = document.getElementById("week-detail-sub");
  const box = document.getElementById("week-detail");
  if (!box || !p) return;
  const st = dayCheckStats(d);
  if (title) title.textContent = `周${WEEK_LABEL[d - 1]} · ${p.label}`;
  if (sub) sub.textContent = `已勾 ${st.done}/${st.total}`;
  const block = (sess, label, list) => {
    const rows = list.map(ex => {
      const deco = decorateExercise(ex, sess === "pm");
      const checked = isExChecked(d, sess, ex.name);
      const meta = isNoSetsExercise(deco)
        ? deco.reps
        : `${deco.sets} 组 · ${deco.reps}`;
      const safe = ex.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const hasV = videosFor(ex.name).length > 0;
      const vchip = `<button class="vid-chip ${hasV ? "" : "ghost"}" type="button" onclick="event.preventDefault();openVideoPage('${safe}','week')"><span class="vid-play">${hasV ? "▶" : "＋"}</span>${hasV ? "视频" : "绑视频"}</button>`;
      return `<div class="check-row ${checked ? "done" : ""}">
        <label class="ex-main" style="flex:1;min-width:0">
          <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleExCheck(${d},'${sess}','${safe}',this.checked)" />
          <div class="body"><div class="name">${ex.name}</div><div class="meta">${meta}${deco.note ? " · " + deco.note : ""}</div></div>
        </label>
        ${vchip}
      </div>`;
    }).join("");
    return `<div class="check-block"><div class="sess">${label}</div>${rows}</div>`;
  };
  box.innerHTML = block("am", "早上", p.am) + block("pm", "晚上", p.pm) +
    `<div class="day-progress">勾选确认是否完成；力量日全部勾完会自动记入本周力量完成。</div>`;
}
function pickDay(d) {
  state.weekday = d;
  loadTodayProtein();
  if (state.tab === "week") renderWeek();
  else showTab("today");
}
function renderProtein() {
  loadTodayProtein();
  const g = PROTEIN_GOAL;
  const cur = state.protein;
  const pct = Math.min(100, Math.round((cur / g) * 100));
  document.getElementById("pro-num").textContent = `${cur} / ${g} g`;
  document.getElementById("pro-bar").style.width = pct + "%";
  document.getElementById("pro-hint").textContent = cur >= 150
    ? "已达标并已落盘 · 刷新不丢"
    : `还差约 ${Math.max(0, 150 - cur)} g · 每次加减都会保存`;
  const el = document.getElementById("home-pro-bar");
  if (el) el.style.width = pct + "%";
}
function addProtein(n) {
  state.protein = Math.max(0, state.protein + n);
  save();
  renderProtein();
  if (state.tab === "market") renderMarket();
  toast(n > 0 ? `+${n} g 蛋白` : `${n} g`);
}
function renderHistory() {
  const box = document.getElementById("hist-list");
  const keys = Object.keys(state.logs).sort().reverse();
  if (!keys.length) {
    box.innerHTML = `<div class="muted small">还没有记录。从训练页点「记录」开始。</div>`;
    return;
  }
  box.innerHTML = keys.map(k => {
    const [w, rest] = k.split("|");
    const [d, sess] = (rest || "").split("-");
    const p = planFor(Number(d)) || { label: "—" };
    const items = (state.logs[k] || []).map(e => {
      const prev = lastSameExercise(e.name, k, e.id);
      const cmp = prev
        ? `<div class="muted small">对照上次：${prev.weight} · ${prev.sets}×${prev.reps}</div>`
        : `<div class="muted small">对照上次：暂无</div>`;
      return `<div class="list-item" style="flex-direction:column;align-items:stretch;gap:6px">
        <div class="row space"><span>${e.name}</span><span class="muted">${e.weight} · ${e.sets}×${e.reps} · RPE ${e.rpe}</span></div>
        ${cmp}
        <div class="row" style="gap:8px">
          <button class="btn ghost" onclick="editLog('${k}','${e.id}')">改</button>
          <button class="btn ghost" onclick="deleteLog('${k}','${e.id}')">删</button>
        </div>
      </div>`;
    }).join("");
    return `<div class="card"><div class="row space"><strong>周${WEEK_LABEL[Number(d) - 1] || "?"} · ${p.label}</strong><span class="muted small">${w} · ${sess === "am" ? "早训" : "晚训"}</span></div>${items}</div>`;
  }).join("");
}


ensureWeekBags();
loadTodayProtein();
/* AUTO_SEED_HOME: 演示首页图表非空 */
(function(){
  try {
    if (!localStorage.getItem('tm_home_seeded')) {
      if (typeof seedDemoStats === 'function') seedDemoStats(true);
      localStorage.setItem('tm_home_seeded','1');
    }
  } catch(e) {}
})();

function render() {
  if (state.tab === "home") renderHomeSocial();
  if (state.tab === "rank") renderRankPage();
  if (state.tab === "follows") renderFollows();
  if (state.tab === "market") renderMarket();
  if (state.tab === "pulse") renderHome();
  if (state.tab === "home") renderHomeSocial();
  if (state.tab === "rank") renderRankPage();
  if (state.tab === "today") renderToday();
  if (state.tab === "week") renderWeek();
  if (state.tab === "log") (typeof renderLog==="function") && renderLog();
  if (state.tab === "hist") renderHistory();
  if (state.tab === "mkt-detail") renderMarketDetail();
  if (state.tab === "mkt-pay") renderMarketPay();
  if (state.tab === "mkt-list") renderMarketList();
  if (state.tab === "nodes") renderNodes();
  if (state.tab === "compose") renderCompose();
  if (state.tab === "lesson-view") renderLessonView();
  if (state.tab === "protein") { renderProtein(); renderMinePurchases(); }
  if (state.tab === "ai") (typeof renderAi==="function") && renderAi();
  if (state.tab === "meal") (typeof renderMeal==="function") && renderMeal();
  if (state.tab === "video") (typeof renderVideo==="function") && renderVideo();
}

document.addEventListener("DOMContentLoaded", () => {
  const qs = new URLSearchParams(location.search);
  if (qs.get("day")) { state.weekday = Number(qs.get("day")); loadTodayProtein(); }
  if (qs.get("ai") === "done") {
    const prev = Object.assign(JSON.parse(JSON.stringify(AI_MOCK)), { eval_id: "E1", exercise: "哑铃深蹲", created_at: new Date(Date.now() - 3 * 864e5).toISOString(), score: 71, reps: 10, file_name: "上周深蹲.mp4" });
    const cur = Object.assign(JSON.parse(JSON.stringify(AI_MOCK)), { eval_id: "E2", exercise: "哑铃深蹲", created_at: new Date().toISOString(), file_name: "深蹲第2周.mp4" });
    aiHistorySave([cur, prev]);
    state.aiResult = cur;
  }
  if (qs.get("mf")) state.marketFilter = qs.get("mf");
  if (qs.get("dim")) state.rankDim = qs.get("dim");
  if (qs.get("period")) state.rankPeriod = qs.get("period");
  if (qs.get("rank") === "1") state.rankExpanded = true;
  if (qs.get("post")) { state.marketPostId = qs.get("post"); }
  if (qs.get("meal") === "food") {
    state.mealMode = "food";
    const r = Object.assign(JSON.parse(JSON.stringify(MEAL_MOCK_FOOD)), { meal_id: "Mdemo", created_at: new Date().toISOString(), file_name: "午餐.jpg", logged_to_protein: false, portion: 1 });
    Object.assign(r, mealScaled(r)); state.mealResult = r; mealHistSave([r]);
  }
  if (qs.get("meal") === "label") {
    state.mealMode = "label";
    const r = Object.assign(JSON.parse(JSON.stringify(MEAL_MOCK_LABEL)), { meal_id: "Mlab", created_at: new Date().toISOString(), file_name: "成分表.jpg", logged_to_protein: true, portion: 1 });
    Object.assign(r, mealScaled(r)); state.mealResult = r;
    const older = Object.assign(JSON.parse(JSON.stringify(MEAL_MOCK_FOOD)), { meal_id: "Mold", created_at: new Date(Date.now()-864e5).toISOString(), logged_to_protein: true, portion: 1 });
    Object.assign(older, mealScaled(older)); mealHistSave([r, older]);
  }
  if (qs.get("meal") === "proc") { state.mealResult = { status: "processing", step: 1 }; }
  if (qs.get("ai") === "processing") state.aiResult = { status: "processing", step: 1 };
  if (qs.get("ex")) { state.videoExercise = qs.get("ex"); state.videoBack = qs.get("tab") === "week" ? "week" : "today"; }
  if (location.search.includes("demo=1")) {
    seedDemoStats(true);
    ensureWeekBags();
    const b = state.exChecks[state.weekId];
    ["板俯卧撑","哑铃卧推","哑铃肩推"].forEach(n => b[exCheckKey(1,"am",n)] = true);
    ["哑铃飞鸟 / 窄距板俯卧撑","哑铃侧平举"].forEach(n => b[exCheckKey(1,"pm",n)] = true);
    save();
  }
  setTimeout(() => { if (qs.get("scroll")) { const a = document.querySelector(".app"); if (a) a.scrollTop = Number(qs.get("scroll")); } }, 50);
  showTab(location.search.includes("tab=")
    ? (new URLSearchParams(location.search).get("tab") || "home")
    : "home");
});
