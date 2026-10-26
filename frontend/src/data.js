export const PLAN = {
  1: {
    type: 'push',
    label: '推日',
    badge: 'push',
    am: [
      { name: '板俯卧撑', sets: 3, reps: '4–6', note: '难则抬手，易则垫脚' },
      { name: '哑铃卧推', sets: 3, reps: '4–6', note: '肩胛稳定' },
      { name: '哑铃肩推', sets: 3, reps: '4–6', note: '核心收紧' },
    ],
    pm: [
      { name: '哑铃飞鸟 / 窄距板俯卧撑', sets: '3–4', reps: '8–12', note: '胸辅助' },
      { name: '哑铃侧平举', sets: '3–4', reps: '8–12', note: '宁轻勿甩' },
      { name: '哑铃三头屈伸', sets: 3, reps: '8–12', note: '肘固定' },
      { name: '跳绳', sets: '—', reps: '10–15 分钟', note: '可分段', noSets: true },
    ],
  },
  2: {
    type: 'rest',
    label: '恢复日',
    badge: 'rest',
    am: [
      { name: '热身', sets: '—', reps: '5 分钟', note: '', noSets: true },
      { name: '跳绳间歇', sets: '—', reps: '累计 15–20 分钟', note: '', noSets: true },
      { name: '轻度活动', sets: '2', reps: '徒手深蹲×10 等', note: '非力竭' },
    ],
    pm: [{ name: '散步 / 拉伸', sets: '—', reps: '20–30 分钟', note: '不追加力竭', noSets: true }],
  },
  3: {
    type: 'pull',
    label: '拉日',
    badge: 'pull',
    am: [
      { name: '引体向上（可辅助）', sets: 3, reps: '4–6', note: '满组再减辅助' },
      { name: '反向划船 / 哑铃划船', sets: 3, reps: '4–6', note: '肩胛后收' },
      { name: '哑铃弯举', sets: 3, reps: '4–6', note: '控离心' },
    ],
    pm: [
      { name: '哑铃划船', sets: '3–4', reps: '8–12', note: '背宽辅助' },
      { name: '反向飞鸟 / 俯身外旋', sets: 3, reps: '8–12', note: '肩后束' },
      { name: '锤式弯举', sets: 3, reps: '8–12', note: '肱肌' },
      { name: '跳绳', sets: '—', reps: '10–15 分钟', note: '', noSets: true },
    ],
  },
  4: {
    type: 'rest',
    label: '恢复日',
    badge: 'rest',
    am: [
      { name: '热身', sets: '—', reps: '5 分钟', note: '', noSets: true },
      { name: '跳绳间歇', sets: '—', reps: '累计 15–20 分钟', note: '', noSets: true },
      { name: '轻度活动', sets: '2', reps: '非力竭', note: '' },
    ],
    pm: [{ name: '散步 / 拉伸', sets: '—', reps: '20–30 分钟', note: '', noSets: true }],
  },
  5: {
    type: 'leg',
    label: '腿+体态',
    badge: 'leg',
    am: [
      { name: '哑铃深蹲', sets: 3, reps: '4–6', note: '膝脚尖同向' },
      { name: '哑铃罗马尼亚硬拉', sets: 3, reps: '4–6', note: '髋铰链' },
      { name: '保加利亚分腿蹲', sets: 3, reps: '4–6/腿', note: '可扶墙' },
    ],
    pm: [
      { name: '哑铃提踵', sets: '3–4', reps: '8–12', note: '小腿' },
      { name: '臀桥', sets: 3, reps: '8–12', note: '可负重' },
      { name: '靠墙天使 / Y-T-W', sets: 3, reps: '8–12', note: '体态' },
      { name: '平板支撑', sets: 3, reps: '20–45 秒', note: '核心', timed: true },
      { name: '跳绳', sets: '—', reps: '8–12 分钟', note: '腿日略减', noSets: true },
    ],
  },
  6: {
    type: 'rest',
    label: '恢复日',
    badge: 'rest',
    am: [
      { name: '热身', sets: '—', reps: '5 分钟', note: '', noSets: true },
      { name: '跳绳间歇', sets: '—', reps: '累计 15–20 分钟', note: '', noSets: true },
    ],
    pm: [{ name: '散步 / 拉伸', sets: '—', reps: '20–30 分钟', note: '', noSets: true }],
  },
  7: {
    type: 'rest',
    label: '轻松日',
    badge: 'rest',
    am: [{ name: '散步或短跳绳', sets: '—', reps: '轻松', note: '不力竭', noSets: true }],
    pm: [{ name: '休息 / 拉伸', sets: '—', reps: '可选', note: '', noSets: true }],
  },
}

/** 用户自录短视频：B站可内嵌试播；抖音/小红书以跳转为主（平台限制，小程序内亦然） */
export const VIDEO_LIB = {
  哑铃飞鸟: [
    { platform: 'dy', title: '飞鸟离心控制', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  窄距板俯卧撑: [
    {
      platform: 'bili',
      title: '窄距板俯卧撑',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  哑铃侧平举: [
    {
      platform: 'xhs',
      title: '侧平举宁轻勿甩',
      url: 'https://www.xiaohongshu.com/',
      note: '跳转小红书',
    },
  ],
  哑铃三头屈伸: [
    { platform: 'dy', title: '三头屈伸肘固定', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  哑铃划船: [
    {
      platform: 'bili',
      title: '哑铃划船肩胛后收',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  锤式弯举: [
    { platform: 'dy', title: '锤式弯举', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  保加利亚分腿蹲: [
    {
      platform: 'bili',
      title: '保加利亚分腿蹲',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  哑铃提踵: [
    {
      platform: 'xhs',
      title: '提踵顶峰停顿',
      url: 'https://www.xiaohongshu.com/',
      note: '跳转小红书',
    },
  ],
  臀桥: [
    { platform: 'dy', title: '臀桥髋部发力', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  平板支撑: [
    {
      platform: 'bili',
      title: '平板支撑',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  板俯卧撑: [
    {
      platform: 'bili',
      title: '板俯卧撑动作示范（自录）',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示 BV，上线换成你的稿',
    },
    {
      platform: 'dy',
      title: '俯卧撑节奏提示',
      url: 'https://www.douyin.com/',
      note: '跳转抖音打开',
    },
  ],
  哑铃卧推: [
    {
      platform: 'bili',
      title: '哑铃卧推肩胛稳定',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
    {
      platform: 'xhs',
      title: '卧推常见错误',
      url: 'https://www.xiaohongshu.com/',
      note: '跳转小红书',
    },
  ],
  哑铃肩推: [
    { platform: 'dy', title: '肩推核心收紧', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  '引体向上（可辅助）': [
    {
      platform: 'bili',
      title: '引体辅助与离心',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  哑铃深蹲: [
    {
      platform: 'xhs',
      title: '高脚杯深蹲要点',
      url: 'https://www.xiaohongshu.com/',
      note: '跳转小红书',
    },
    {
      platform: 'bili',
      title: '深蹲膝脚尖同向',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
  跳绳: [
    { platform: 'dy', title: '跳绳间歇示范', url: 'https://www.douyin.com/', note: '跳转抖音' },
  ],
  哑铃罗马尼亚硬拉: [
    {
      platform: 'bili',
      title: 'RDL 髋铰链',
      url: 'https://www.bilibili.com/video/BV1GJ411x7h7',
      bilibiliId: 'BV1GJ411x7h7',
      note: '演示用',
    },
  ],
}
export const PLAT_LABEL = { bili: 'B站', dy: '抖音', xhs: '小红书' }

export const PHASES = {
  1: {
    title: '第 1 周·适应',
    focus: '熟悉动作与节奏；可控重量把动作做标准，完成全部组数即可。',
    amSetsHint: '先保证完成度',
    pmSetsBoost: false,
    overload: '不追求加重',
  },
  2: {
    title: '第 2 周·加量',
    focus: '优先加次数；核心满 4–6×3 后再加重或减引体辅助；辅助可到 4 组。',
    amSetsHint: '次数优先，满目标再加重',
    pmSetsBoost: true,
    overload: '辅助可加到 4 组',
  },
  3: {
    title: '第 3 周·加量',
    focus: '继续加次数/减辅助；辅助动作维持 3–4 组高完成度。',
    amSetsHint: '满组再加重或减辅助',
    pmSetsBoost: true,
    overload: '保持渐进超负荷',
  },
  4: {
    title: '第 4 周·巩固',
    focus: '巩固或轻微加难：维持高完成度；能稳做再 +1 次/组或微加重。',
    amSetsHint: '稳做再微加重',
    pmSetsBoost: true,
    overload: '巩固为主，微加难',
  },
}

export const WEEK_LABEL = ['一', '二', '三', '四', '五', '六', '日']
export const PROTEIN_GOAL = 155

export const AI_MOCK = {
  status: 'done',
  score: 78,
  reps: 12,
  summary:
    '整体节奏稳定，下蹲深度够；主要问题是第 8 次后膝盖内扣、起身时含胸。先减 2kg 把后 4 次做标准。',
  issues: [
    {
      timestamp: 14.2,
      frame_url: '',
      problem: '膝盖内扣（第 8 次起）',
      fix: '下蹲时想象膝盖往外推，与脚尖同向；疲劳时减重。',
    },
    {
      timestamp: 21.6,
      frame_url: '',
      problem: '起身含胸、背部前倾',
      fix: '哑铃贴胸，起身先挺胸再伸髋。',
    },
    {
      timestamp: 33.0,
      frame_url: '',
      problem: '最后 2 次幅度变浅',
      fix: '保持同样深度，做不到就提前结束该组。',
    },
  ],
}

export const MEAL_MOCK_FOOD = {
  status: 'done',
  source: 'food',
  title: '鸡胸饭 + 西兰花',
  base_kcal: 520,
  base_protein_g: 42,
  base_carb_g: 48,
  base_fat_g: 12,
  portion: 1,
  sugar_warn: false,
  advice: '蛋白够扎实，主食偏多一点。按小幅缺口，建议米饭再减约 1/4，或晚训后留着吃。',
  tips: ['优先保证蛋白目标 150–155g', '油脂少炒少淋', '禁添加糖饮料'],
}
export const MEAL_MOCK_LABEL = {
  status: 'done',
  source: 'label',
  title: '某品牌蛋白棒（成分表 OCR）',
  base_kcal: 148,
  base_protein_g: 15,
  base_carb_g: 12,
  base_fat_g: 5,
  portion: 1,
  sugar_warn: true,
  per: '每份 40g',
  advice: '单份蛋白 15g，适合加餐补缺口。配料有糖浆，按计划禁添加糖——偶尔可换无糖版或鸡蛋牛奶。',
  tips: ['记入加餐补蛋白', '若全天主食已够可不叠加这份碳水', '对比同类看每份蛋白密度'],
}
