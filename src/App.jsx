import { useState, useEffect } from 'react'
import { KNOWLEDGE_BASE } from './knowledge_base.js'

/* ====================================================================
   Config
   ==================================================================== */
const PLATFORMS = [
  { key: 'taobao',      name: '淘宝天猫', color: '#f0883e', desc: '人货匹配 · 品牌资产' },
  { key: 'jd',          name: '京东',     color: '#e4393c', desc: '品质信任 · 搜索驱动' },
  { key: 'douyin',      name: '抖音电商', color: '#ff2e5e', desc: '内容驱动 · 兴趣电商' },
  { key: 'pdd',         name: '拼多多',   color: '#f9a825', desc: '价格力为王 · 坑产赛马' },
  { key: 'xiaohongshu', name: '小红书',   color: '#ff3b5c', desc: '种草社区 · CES评分' },
]

const COMMON_TABS = [
  { key: 'overview',   name: '用户画像与痛点', icon: 'chart',    group: '商品通用分析' },
  { key: 'competitor', name: '竞品分析',       icon: 'search',   group: '商品通用分析' },
  { key: 'shortvideo', name: '短视频脚本 ×5',  icon: 'film',     group: '内容创作' },
  { key: 'livestream', name: '直播话术 ×8',    icon: 'radio',    group: '内容创作' },
  { key: 'xhs',        name: '小红书笔记 ×5',  icon: 'book',     group: '内容创作' },
  { key: 'matrix',     name: '内容矩阵',       icon: 'grid',     group: '内容创作' },
]

const PLATFORM_TABS = [
  { key: 'titles',     name: '标题方案',       icon: 'text',     group: '平台规则分析' },
  { key: 'images',     name: '主图提示词',      icon: 'image',    group: '平台规则分析' },
  { key: 'videos',     name: '视频提示词',      icon: 'video',    group: '平台规则分析' },
  { key: 'detail',     name: '详情页提示词',    icon: 'doc',      group: '平台规则分析' },
  { key: 'lifecycle',  name: '生命周期策略',    icon: 'calendar', group: '平台规则分析' },
  { key: 'banned',     name: '违禁词检查',      icon: 'shield',   group: '平台规则分析' },
]

const ALL_TABS = [...COMMON_TABS, ...PLATFORM_TABS]

/* ====================================================================
   Competitor parser — handles multiple field name variations and bad data
   ==================================================================== */
function parseCompetitors(data) {
  if (!data || typeof data !== 'object') return { types: '', list: [], diff: '', benchmark: '', gap: '' }
  const c = data.competitorAnalysis || data.competitor || data.CompetitorAnalysis || data || {}
  const list = c.topCompetitors || c.competitors || c.topCompetitorList || c.mainCompetitors || c.竞品列表 || []
  const safeList = (Array.isArray(list) ? list : [])
    .map(x => ({
      name: String(x?.name || x?.竞品名 || x?.brand || '').trim(),
      price: String(x?.price || x?.价格 || x?.priceRange || '').trim(),
      strength: String(x?.strength || x?.优势 || x?.coreAdvantage || '').trim(),
      weakness: String(x?.weakness || x?.短板 || x?.weakPoint || '').trim(),
    }))
    .filter(x => x.name && x.name !== '—' && x.name !== 'undefined')
  return {
    types: c.competitorTypes || c.types || c.competitorType || '',
    list: safeList,
    diff: c.differentiation || c.diff || c.差异化 || '',
    benchmark: c.priceBenchmark || c.benchmark || c.价格带 || '',
    gap: c.opportunityGap || c.gap || c.机会 || '',
  }
}

function hasCompetitorData(data) {
  const p = parseCompetitors(data)
  return p.list.length > 0 || (p.types && p.types.length > 10)
}
const API_KEY = 'sk-ba0219fb9677478081deaf4f6d7931ca'
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

/* ====================================================================
   Search keyword enhancement instruction (shared)
   ==================================================================== */
const SEARCH_KEYWORD_INSTRUCTION = `
## 搜索关键词要求（重要）
你必须结合该平台的搜索规则和该类目的热搜词来生成标题和关键词：
1. 使用「属性词+品类词+场景词+人群词」的结构
2. 参考该平台搜索下拉框推荐词和类目热搜词
3. 每个关键词要能对应真实搜索量，避免自造词
4. 仅当该品类确实存在国家标准/行业标准时（如食品的GB/T标准号、电子产品的3C认证等），才将标准号作为搜索词。不要给所有产品强行加国标号`


/* ====================================================================
   Platform-specific lifecycle enrichment
   ==================================================================== */
function buildLifecycleInstruction(platformKey) {
  const kb = KNOWLEDGE_BASE[platformKey]
  // Build platform-specific channel/tool references based on knowledge base
  const platformSpecifics = {
    taobao: {
      tagging: '天猫新品标、天猫黑标、品牌新享打标',
      trials: '天猫U先试用',
      launchChannels: '天猫小黑盒新品首发、品牌新享',
      growthChannels: '聚划算、百亿补贴、超级品牌日、淘金币',
      ads: '万相台无界版（关键词推广/精准人群推广/全站推广）、淘客',
      creators: '淘客团长、逛逛达人、淘宝直播达人',
      content: '逛逛内容种草、淘宝直播',
      burstChannels: '618/双11主会场、百亿补贴核心坑位、小黑盒超级新品',
      privateDomain: '淘宝粉丝群、店铺会员',
    },
    jd: {
      tagging: '京东新品标、京东黑标、京东超市打标',
      trials: '京东试用频道',
      launchChannels: '京东新品首发频道、京东小魔方',
      growthChannels: '京东秒杀、京东PLUS会员价、品牌闪购',
      ads: '京准通（快车/海投/京速推/购物触点）',
      creators: '京东达人（达人平台）、京东直播达人',
      content: '京东短视频、京东直播、京东发现好货',
      burstChannels: '618/双11主会场、京东秒杀核心位、超级品牌日',
      privateDomain: '京东店铺会员、京东粉丝群',
    },
    douyin: {
      tagging: '抖音新品扶持标签、抖音好物标签',
      trials: '抖音免费试用、极速退款体验',
      launchChannels: '抖音新品扶持计划、抖音商城新品频道',
      growthChannels: '抖音超值购、抖音商城活动、品牌馆',
      ads: '巨量千川（全域推广/标准推广）、巨量引擎',
      creators: '精选联盟达人、巨量星图达人',
      content: '带货短视频、抖音直播、商品卡优化',
      burstChannels: '618/双11/年货节大促、抖音好物节、品牌BigDay',
      privateDomain: '抖音粉丝群、抖音私信',
    },
    pdd: {
      tagging: '拼多多新品标、品牌黑标',
      trials: '免费试用活动、0元试',
      launchChannels: '百万爆款计划、限时秒杀',
      growthChannels: '9块9特卖、百亿补贴、品牌秒杀',
      ads: '全站推广、商品推广（搜索oCPX/场景oCPX）、多多进宝',
      creators: '多多进宝推手、多多直播达人',
      content: '多多短视频、多多直播',
      burstChannels: '百亿补贴核心坑位、秒杀频道、断码清仓',
      privateDomain: '店铺关注、拼小圈',
    },
    xiaohongshu: {
      tagging: '小红书品牌号认证、商品笔记标签',
      trials: '小红书体验官、免费试用活动',
      launchChannels: '小红书商品笔记、薯店新品首发',
      growthChannels: '小红书福利社、品牌合作专区',
      ads: '聚光平台（种草/拉新）、乘风（电商收割）、薯条（加热）',
      creators: '蒲公英平台达人(买手)',
      content: '商品笔记、图文种草、买手直播、视频笔记',
      burstChannels: '小红书大促活动、友好市集、品牌BigDay',
      privateDomain: '小红书群聊、私信互动',
    },
  }

  const ps = platformSpecifics[platformKey]
  if (!ps) return ''

  return `
## ${kb.name}平台专属生命周期策略（严格只使用${kb.name}平台的方法和工具）

以下所有动作、工具、频道名称必须严格仅属于${kb.name}平台。绝不可使用其他平台的工具或方法（如京东分析中绝不能用万相台、千川、聚划算；小红书分析中绝不能用京东打标、天猫试用）。

**准备期**：
- 打标申请：${ps.tagging}
- 资质准备：品牌授权/检测报告/专利证书
- 主图AB测试3-5版 + 短视频素材弹药3-5条
- 竞品TOP20调研 + 定价策略（引流款/利润款/形象款）

**导入期**：
- 破零策略：老客专享价/亲友单/${ps.trials}
- 打标确认
- 基础评价积累（评价有礼/带图好评）
- 直播冷启动 + 短视频测款
- 付费测款（标准计划小预算测转化率）
- 频道报名：${ps.launchChannels}

**成长期**：
- 付费放量：${ps.ads}，阶梯加预算
- 活动报名：${ps.growthChannels}
- 达人建联：${ps.creators}
- 内容种草：${ps.content}
- 评价积累目标100+ + 店铺评分维护 ≥ 4.8

**爆发期**：
- 大促冲刺：${ps.burstChannels}
- 直播专场（达人/BOSS/明星）
- 内容爆发 + 付费拉满日预算≥3000
- 私域联动：${ps.privateDomain}

**稳定期**：
- 降费吃自然流（阶梯式降付费占比）
- 多链接赛马2-3个 + 全店动销一拖多
- 私域沉淀：${ps.privateDomain}
- 复购激励（会员专享价/积分兑换）+ 产品迭代优化`
}

/* ====================================================================
   Prompt Builders
   ==================================================================== */
function buildCommonPrompt(productName) {
  return `你是资深电商操盘手。为产品"${productName}"制定商品级通用方案，不区分平台。

只输出JSON，不要markdown代码块。每个字段必须详实、具体、可执行：

${SEARCH_KEYWORD_INSTRUCTION}

{
  "productAnalysis": {
    "productCategory": "产品类目和赛道定位",
    "marketSize": "市场规模和增长趋势（含数据参考）",
    "targetUsers": "目标用户画像 ≥ 250字（年龄/性别/地域/消费力/购物习惯/决策路径）",
    "userPainPoints": ["痛点1（场景+程度）","痛点2","痛点3","痛点4"],
    "sellingPoints": ["卖点1（优势+支撑）","卖点2","卖点3","卖点4"],
    "priceStrategy": "定价策略（引流款/利润款/形象款 + 竞品参考）",
    "searchKeywords": ["核心词1","核心词2","长尾词1","长尾词2","长尾词3","长尾词4","行业标准号如GB/T","行业专属词"]
  },
  "competitorAnalysis": {
    "competitorTypes": "竞品类型分析（头部品牌/腰部品牌/白牌竞品，各有什么特征和市场份额，必须写满100字）",
    "topCompetitors": [
      {"name":"竞品1名称（品牌+具体型号，必须是真实存在的产品）","price":"价格区间","strength":"核心优势（至少20字，说明为什么这个竞品强）","weakness":"明显短板（至少20字，说明可攻击的薄弱点）"},
      {"name":"竞品2名称","price":"价格","strength":"核心优势","weakness":"明显短板"},
      {"name":"竞品3名称","price":"价格","strength":"核心优势","weakness":"明显短板"},
      {"name":"竞品4名称","price":"价格","strength":"核心优势","weakness":"明显短板"},
      {"name":"竞品5名称","price":"价格","strength":"核心优势","weakness":"明显短板"}
    ],
    "differentiation": "差异化策略（产品/价格/视觉/内容/服务5个维度，每维度≥50字）",
    "priceBenchmark": "价格带参考（低价/中价/高价区间及对应产品特征）",
    "opportunityGap": "机会缺口（市场空白点、用户未被满足的需求、可切入的差异化角度，≥100字）"
  },
  "shortVideoScripts": [
    {
      "style":"痛点反转型","title":"标题","duration":"30s",
      "hook":"前3秒钩子（画面+台词）",
      "scenes":[{"time":"0-3s","action":"画面","voiceover":"配音","text":"字幕"},{"time":"3-10s","action":"画面","voiceover":"配音","text":"字幕"},{"time":"10-20s","action":"画面","voiceover":"配音","text":"字幕"},{"time":"20-30s","action":"画面","voiceover":"配音","text":"字幕"}],
      "cta":"行动号召","bgm":"BGM","notes":"拍摄注意"
    },
    {"style":"产品展示型","title":"标题","duration":"30s","hook":"钩子","scenes":[{"time":"0-3s","action":"","voiceover":"","text":""},{"time":"3-15s","action":"","voiceover":"","text":""},{"time":"15-30s","action":"","voiceover":"","text":""}],"cta":"","bgm":"","notes":""},
    {"style":"场景故事型","title":"","duration":"","hook":"","scenes":[{"time":"0-3s","action":"","voiceover":"","text":""},{"time":"3-15s","action":"","voiceover":"","text":""},{"time":"15-30s","action":"","voiceover":"","text":""}],"cta":"","bgm":"","notes":""},
    {"style":"测评对比型","title":"","duration":"","hook":"","scenes":[{"time":"0-3s","action":"","voiceover":"","text":""},{"time":"3-15s","action":"","voiceover":"","text":""},{"time":"15-30s","action":"","voiceover":"","text":""}],"cta":"","bgm":"","notes":""},
    {"style":"用户证言型","title":"","duration":"","hook":"","scenes":[{"time":"0-3s","action":"","voiceover":"","text":""},{"time":"3-15s","action":"","voiceover":"","text":""},{"time":"15-30s","action":"","voiceover":"","text":""}],"cta":"","bgm":"","notes":""}
  ],
  "liveStreamScript": {
    "opening":"开场话术 ≥120字","productIntro":"产品介绍 ≥180字","painPointResonance":"痛点共鸣 ≥120字",
    "sellingPointDemo":"卖点演示 ≥180字","priceReveal":"价格揭晓 ≥120字","urgencyCreate":"逼单话术 ≥120字",
    "interactionGuide":"互动引导 ≥100字","closing":"收尾话术 ≥100字"
  },
  "xiaohongshuNotes": [
    {"style":"干货教程型","title":"标题 ≤20字","coverPrompt":"封面提示词","content":"正文 800-1200字","tags":["标签1","标签2","标签3","标签4","标签5"],"interactionGuide":"互动引导","publishTime":"发布时间","expectedMetrics":"预期互动数据"},
    {"style":"真实体验型","title":"","coverPrompt":"","content":"","tags":[],"interactionGuide":"","publishTime":"","expectedMetrics":""},
    {"style":"对比测评型","title":"","coverPrompt":"","content":"","tags":[],"interactionGuide":"","publishTime":"","expectedMetrics":""},
    {"style":"情绪故事型","title":"","coverPrompt":"","content":"","tags":[],"interactionGuide":"","publishTime":"","expectedMetrics":""},
    {"style":"专业科普型","title":"","coverPrompt":"","content":"","tags":[],"interactionGuide":"","publishTime":"","expectedMetrics":""}
  ],
  "contentMatrix": {
    "shortVideo":["选题1","选题2","选题3","选题4","选题5"],
    "liveTopics":["主题1","主题2","主题3"],
    "notes":["选题1","选题2","选题3","选题4"],
    "images":["选题1","选题2","选题3"]
  }
}

竞品分析要求：必须输出topCompetitors数组包含5个真实存在的竞品，每个竞品必须填写完整的name/price/strength/weakness。不可返回空数组或缺失字段。`
}

function buildPlatformPrompt(productName, platformKey) {
  const kb = KNOWLEDGE_BASE[platformKey]
  return `你是${kb.name}平台资深操盘手。为"${productName}"制定平台规则适配方案。

## ${kb.name}平台规则
- 底层逻辑：${kb.coreLogic}
- 核心公式：${kb.coreFormula}
- 标题规则：${kb.titleRule}
- 主图规则：${kb.mainImageRule}
- 详情页规则：${kb.detailRule}
- SKU规则：${kb.skuRule}
- 付费推广：${kb.paidPromotion}
- 活动策略：${kb.activityRule}
- 内容技巧：${kb.contentTips}
- 用户画像：${kb.userPersona}
- 违禁词：${kb.bannedWords.join('、')}
- 红线：${kb.redLines.join('；')}

## ${kb.name}平台特有约束（严格遵守）
${platformKey === 'jd' ? '- 京东标题中绝不可出现"顺丰"、"顺丰冷链"、"顺丰物流"等非京东物流关键词。京东自营=京东物流。' : ''}
${platformKey === 'jd' ? '- 是否在标题中加入"京东自营"、"京东物流"等关键词，需根据该品类在京东的搜索下拉词和热搜词来判断——如果该类目用户高频搜索这些词，则可以加；否则不要强制添加。' : ''}
${platformKey === 'taobao' ? '- 淘宝天猫标题不可用京东/顺丰物流关键词，可基于品类热搜词判断是否加"天猫"、"菜鸟物流"等阿里系标签。' : ''}
${platformKey === 'pdd' ? '- 拼多多标题不可用京东/天猫系服务标签，可基于品类热搜词判断是否加"极速退款"等拼多多系标签。' : ''}
${platformKey === 'douyin' ? '- 抖音电商标题可基于品类热搜词强调"抖音商城"、"官方旗舰店"等标签。' : ''}
${platformKey === 'xiaohongshu' ? '- 小红书标题要符合种草社区调性，突出真实体验感，不可用过于硬广的电商平台标签。' : ''}

## 参考信息
- 准备期-${kb.lifecycle.prepare}
- 导入期-${kb.lifecycle.launch}
- 成长期-${kb.lifecycle.growth}
- 爆发期-${kb.lifecycle.burst}
- 稳定期-${kb.lifecycle.stable}

${SEARCH_KEYWORD_INSTRUCTION}
${buildLifecycleInstruction(platformKey)}

输出纯JSON不要markdown：

{
  "titleSuggestions":["标题1（含平台热搜词+精准搜索词+卖点，结构：品牌词+核心品类词+热搜属性词+长尾场景词）","标题2","标题3","标题4","标题5"],
  "mainImagePrompts":[
    {"position":"主图1-首图","prompt":"提示词 ≥100字（构图/色彩/角度/文字/背景/光影）","ctrTarget":"预计CTR"},
    {"position":"主图2-卖点图","prompt":"","ctrTarget":""},
    {"position":"主图3-场景图","prompt":"","ctrTarget":""},
    {"position":"主图4-细节图","prompt":"","ctrTarget":""},
    {"position":"主图5-评价图","prompt":"","ctrTarget":""}
  ],
  "videoPrompts":[
    {"type":"主图视频","duration":"15-30秒","prompt":"拍摄提示词 ≥150字"},
    {"type":"带货短视频","duration":"30-60秒","prompt":"拍摄提示词 ≥150字"}
  ],
  "detailPagePrompts":["模块1-首屏 ≥80字","模块2-卖点解析","模块3-使用场景","模块4-对比优势","模块5-信任背书","模块6-FAQ/售后"],
  "lifecycleStrategy":{
    "prepare":{"actions":["具体行动"],"tagging":"本平台打标方案","qualifications":"所需资质","budget":"预算","kpi":"指标","timeline":"时间","tools":"本平台工具"},
    "launch":{"actions":["具体行动"],"trialChannel":"本平台试用方案","channelActivity":"本平台活动报名","budget":"","kpi":"","timeline":"","tools":""},
    "growth":{"actions":["具体行动"],"budget":"","kpi":"","timeline":"","tools":""},
    "burst":{"actions":["具体行动"],"budget":"","kpi":"","timeline":"","tools":""},
    "stable":{"actions":["具体行动"],"budget":"","kpi":"","timeline":"","tools":""}
  },
  "bannedWordCheck":{"riskLevel":"低/中/高风险","checkedContent":"检查范围","warnings":["风险点"],"suggestions":["合规建议"],"platformSpecificRules":"${kb.name}特有合规规则"}
}

不使用违禁词。标题符合平台字数规则（含该平台热搜词）。所有生命周期策略严格只使用本平台工具。输出合法JSON。`
}

/* ====================================================================
   API Helpers
   ==================================================================== */
async function callAPI(prompt, maxTokens) {
    const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: '当前时间为2026年7月。输出纯JSON，不要markdown。使用你最新的知识库数据，内容详实可执行。' }, { role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`API 错误 ${res.status}`)
  const json = await res.json()
  const text = json.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(text)
}

const callCommon = (n) => callAPI(buildCommonPrompt(n), 12000)
const callPlatform = (n, k) => callAPI(buildPlatformPrompt(n, k), 12000)

/* ====================================================================
   Icons (inline SVG)
   ==================================================================== */
function Icon({ name, size = 18 }) {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }
  const mk = (d) => <svg {...s} viewBox="0 0 24 24"><path d={d}/></svg>
  const icons = {
    chart:    mk('M3 3v18h18M7 13l4-4 4 4 5-5'),
    text:     mk('M4 7V5h16v2M8 5v14M7 19h6'),
    search:   mk('M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3'),
    image:    mk('M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21'),
    video:    mk('M15 10l4.5-4.5M15 14l4.5 4.5M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z'),
    doc:      mk('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h8'),
    calendar: mk('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z'),
    film:     mk('M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5'),
    radio:    mk('M19 5L5 19M6.5 9a5.5 5.5 0 000 6M9.5 12a2.5 2.5 0 000 2M14.5 12a2.5 2.5 0 000 2M17.5 9a5.5 5.5 0 010 6'),
    book:     mk('M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z'),
    grid:     mk('M3 3h7v7H3V3zM14 3h7v7h-7V3zM3 14h7v7H3v-7zM14 14h7v7h-7v-7z'),
    shield:   mk('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
    copy:     mk('M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1M16 4h2a2 2 0 012 2v4M11 11l4 4M15 11l-4 4'),
    check:    mk('M20 6L9 17l-5-5'),
    rocket:   mk('M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z'),
    sparkles: mk('M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z'),
    chevronDown: mk('M6 9l6 6 6-6'),
    chevronUp: mk('M18 15l-6-6-6 6'),
    user: mk('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z'),
    settings: mk('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'),
    download: mk('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'),
    logOut: mk('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9'),
  }
  return icons[name] || <span className="text-sm">?</span>
}

/* ====================================================================
   Data storage — API + LocalStorage hybrid
   ==================================================================== */
const API_BASE = '/api' // same origin when served by our Node server

const LS_KEY = 'promo_system_user'

function loadUser() { try { return JSON.parse(localStorage.getItem(LS_KEY)) } catch { return null } }
function saveUser(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)) }
function clearUser() { localStorage.removeItem(LS_KEY) }

// Cloud-backed: users
async function saveUserRecord(record) {
  try {
    await fetch(`${API_BASE}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
  } catch (e) {
    console.warn('Cloud save failed, fallback to localStorage')
    const existing = loadAllUsersLocal()
    existing.push(record)
    localStorage.setItem('promo_system_users', JSON.stringify(existing))
  }
}

async function loadAllUsers() {
  try {
    const res = await fetch(`${API_BASE}/data`)
    const data = await res.json()
    return data.users || []
  } catch {
    return loadAllUsersLocal()
  }
}
function loadAllUsersLocal() { try { return JSON.parse(localStorage.getItem('promo_system_users')) || [] } catch { return [] } }

// Cloud-backed: cases
async function logCase(user, productName, platforms) {
  try {
    await fetch(`${API_BASE}/cases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: user.name || user.account, phone: user.phone, company: user.company,
        category: user.category, product: productName, platforms,
      }),
    })
  } catch (e) {
    console.warn('Cloud case log failed, fallback to localStorage')
    const cases = loadCasesLocal()
    cases.unshift({ user: user.name || user.account, phone: user.phone, company: user.company, category: user.category, product: productName, platforms, time: new Date().toISOString() })
    localStorage.setItem('promo_system_cases', JSON.stringify(cases))
  }
}

async function loadCases() {
  try {
    const res = await fetch(`${API_BASE}/data`)
    const data = await res.json()
    return data.cases || []
  } catch {
    return loadCasesLocal()
  }
}
function loadCasesLocal() { try { return JSON.parse(localStorage.getItem('promo_system_cases')) || [] } catch { return [] } }

// Unified admin data load — one request, no race condition
async function loadAdminData() {
  try {
    const res = await fetch(`${API_BASE}/data`)
    const text = await res.text()
    // Guard against cold-start HTML pages
    if (text.startsWith('<!doctype') || text.startsWith('<html')) throw new Error('cold start')
    const data = JSON.parse(text)
    return { users: data.users || [], cases: data.cases || [] }
  } catch {
    return { users: loadAllUsersLocal(), cases: loadCasesLocal() }
  }
}

/* ====================================================================
   CSV Export
   ==================================================================== */
async function exportUsersCSV() {
  const users = await loadAllUsers()
  if (users.length === 0) { alert('暂无用户数据'); return }
  const header = '姓名,电话,公司,分析品类,账号,注册时间\n'
  const rows = users.map(u => `${u.name||''},${u.phone||''},${u.company||''},${u.category||''},${u.account||''},${u.createdAt || u.time||''}`).join('\n')
  downloadCSV(header + rows, `用户数据_${new Date().toISOString().slice(0,10)}`)
}

async function exportCasesCSV() {
  const cases = await loadCases()
  if (cases.length === 0) { alert('暂无分析案例数据'); return }
  const header = '用户,电话,公司,分析品类,分析产品,分析平台,分析时间\n'
  const rows = cases.map(c => `${c.user||''},${c.phone||''},${c.company||''},${c.category||''},${c.product||''},${c.platforms||''},${c.time||''}`).join('\n')
  downloadCSV(header + rows, `分析案例_${new Date().toISOString().slice(0,10)}`)
}

function downloadCSV(csvContent, filename) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ====================================================================
   UI Atoms
   ==================================================================== */
function CopyBtn({ text, label }) {
  const [ok, set] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text || ''); set(true); setTimeout(() => set(false), 2000) }}
      className="btn btn-ghost btn-sm gap-1"
    >
      {ok ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}
      {ok ? '已复制' : (label || '复制')}
    </button>
  )
}

function SectionCard({ title, subtitle, children, platformInfo, iconName, badge, badgeColor = 'blue', actions }) {
  return (
    <div className="card card-hover overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-muted)] flex items-center gap-3">
        <div className="sec-head-icon"><Icon name={iconName} size={18} /></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-[var(--text)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-dim)] mt-0.5">{subtitle}</p>}
        </div>
        {actions}
        {badge && <span className={`tag tag-${badgeColor}`}>{badge}</span>}
        {platformInfo && (
          <span className="tag tag-slate flex items-center gap-1.5">
            <span className="platform-dot" style={{ background: platformInfo.color }} />{platformInfo.name}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function EmptyState({ text = '暂无数据' }) {
  return <div className="card p-12 text-center"><p className="text-sm text-[var(--text-dim)]">{text}</p></div>
}

/* ====================================================================
   Login Page
   ==================================================================== */
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    setErr('')
    if (!account.trim() || !password.trim()) { setErr('请输入账号和密码'); return }
    setLoading(true)

    if (mode === 'admin') {
      if (account.trim() === 'qaq' && password.trim() === 'qaq881205') {
        onLogin({ name: '管理员', account: 'admin', isAdmin: true })
      } else { setErr('管理员账号或密码错误') }
      setLoading(false)
      return
    }

    setTimeout(async () => {
      setLoading(false)
      if (mode === 'login') {
        const users = await loadAllUsers()
        const found = users.find(u => u.account === account.trim() && u.password === password.trim())
        if (!found) { setErr('账号或密码错误，请先注册'); return }
        saveUser(found)
        onLogin(found)
      } else {
        if (!phone.trim()) { setErr('手机号为必填项'); return }
        const users = await loadAllUsers()
        if (users.find(u => u.account === account.trim())) { setErr('该账号已被注册'); return }
        const user = { name, phone, company, category: industry, account: account.trim(), password: password.trim(), time: new Date().toISOString() }
        saveUser(user)
        await saveUserRecord(user)
        onLogin(user)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative login-gradient" style={{ background: 'var(--ink-900)' }}>
      <div className="card p-10 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4" style={{ borderColor: 'var(--ink-500)', background: 'var(--ink-800)' }}>
            <span className="status-dot" />
            <span className="text-xs text-[var(--text-dim)] font-medium">全平台产品推广分析系统</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text)] tracking-tight">
            {mode === 'admin' ? '后台管理' : mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-2">
            {mode === 'admin' ? '管理员身份验证' : mode === 'login' ? '登录您的账号开始分析' : '注册后即可分析全平台推广方案'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-6 border rounded-lg p-0.5" style={{ borderColor: 'var(--ink-500)', background: 'var(--ink-800)' }}>
          {[
            ['login', '登录'],
            ['register', '注册'],
            ['admin', '管理员'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setMode(k); setErr(''); setPassword('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                mode === k ? 'text-white shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
              style={mode === k ? { background: 'var(--primary)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">姓名</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="您的姓名" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">手机号 <span className="text-[var(--danger)]">*</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号码" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">公司</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="公司名称" className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">所属行业 / 分析品类</label>
                <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="例如：食品、美妆、3C数码…" className="input" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">
              {mode === 'admin' ? '管理员账号' : '账号'} <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text" value={account} onChange={e => setAccount(e.target.value)}
              placeholder={mode === 'admin' ? '管理员账号' : '输入账号'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">
              密码 <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '设置密码' : '输入密码'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>

          {err && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base mt-2"
          >
            {loading ? (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" opacity="0.75" />
              </svg>
            ) : (
              mode === 'admin' ? '登录后台' : mode === 'login' ? '登录' : '注册并登录'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ====================================================================
   Admin Panel
   ==================================================================== */
function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const doRefresh = async () => {
    setLoading(true)
    setError('')
    try {
      const { users: u, cases: c } = await loadAdminData()
      if (u.length === 0 && c.length === 0) {
        // Both empty — might be first load; silently retry once
        setError('数据加载中，请稍候...')
        setTimeout(async () => {
          const retry = await loadAdminData()
          setUsers(retry.users); setCases(retry.cases)
          setLoading(false)
          setError(retry.users.length === 0 && retry.cases.length === 0 ? '暂无数据 — 可能是服务器冷启动中，请稍后点击🔄刷新' : '')
        }, 3000)
        return
      }
      setUsers(u); setCases(c)
    } catch (e) {
      setError('加载失败: ' + e.message)
    }
    setLoading(false)
  }

  useEffect(() => { doRefresh() }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="card p-8 w-full max-w-5xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(130,80,223,0.1))', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Icon name="shield" size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text)]">管理后台</h2>
              <p className="text-xs text-[var(--text-dim)]">
                {loading ? '加载中...' : `用户 ${users.length} 人 · 分析案例 ${cases.length} 条`}
                {error && <span className="ml-2" style={{color:'var(--warning)'}}>{error}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={doRefresh} className="btn btn-outline btn-sm gap-1">🔄 刷新</button>
            <button onClick={tab === 'cases' ? (() => { exportCasesCSV(); doRefresh() }) : (() => { exportUsersCSV(); doRefresh() })} className="btn btn-primary btn-sm gap-1">
              <Icon name="download" size={14} />导出 CSV
            </button>
            <button onClick={onClose} className="btn btn-outline btn-sm">关闭</button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--ink-800)', border: '1px solid var(--ink-500)' }}>
          {[
            ['users', '📋 用户管理'],
            ['cases', '🔍 分析案例'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === k ? 'text-white' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
              style={tab === k ? { background: 'var(--primary)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {tab === 'users' && (
          <div className="table-wrap flex-1 overflow-auto">
            <table>
              <thead><tr><th>姓名</th><th>手机号</th><th>公司</th><th>品类</th><th>账号</th><th>注册时间</th></tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td className="font-bold text-[var(--text)]">{u.name || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.company || '—'}</td>
                    <td>{u.category || '—'}</td>
                    <td className="font-bold" style={{ color: 'var(--primary)' }}>{u.account || '—'}</td>
                    <td className="text-xs text-[var(--text-dim)]">{u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : u.time ? new Date(u.time).toLocaleString('zh-CN') : '—'}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="text-center text-[var(--text-dim)] py-12">暂无用户 — 刷新或等待新用户注册后点击🔄</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Cases Table */}
        {tab === 'cases' && (
          <div className="table-wrap flex-1 overflow-auto">
            <table>
              <thead><tr><th>用户</th><th>手机号</th><th>公司</th><th>品类</th><th>分析产品</th><th>平台</th><th>时间</th></tr></thead>
              <tbody>
                {cases.map((c, i) => (
                  <tr key={i}>
                    <td className="font-bold text-[var(--text)]">{c.user || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.company || '—'}</td>
                    <td>{c.category || '—'}</td>
                    <td className="font-bold" style={{ color: 'var(--primary)' }}>{c.product || '—'}</td>
                    <td className="text-xs">{c.platforms || '—'}</td>
                    <td className="text-xs text-[var(--text-dim)]">{c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN') : c.time ? new Date(c.time).toLocaleString('zh-CN') : '—'}</td>
                  </tr>
                ))}
                {cases.length === 0 && <tr><td colSpan={7} className="text-center text-[var(--text-dim)] py-12">暂无分析案例 — 用户分析产品后自动记录</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-4 pt-3 border-t text-[11px] text-[var(--text-faint)] flex items-center justify-between" style={{ borderColor: 'var(--ink-500)' }}>
          <span>📌 数据存储在浏览器本地（同域名同设备可见）。定期导出 CSV 永久保存。</span>
          <span>刷新于 {new Date().toLocaleTimeString('zh-CN')}</span>
        </div>
      </div>
    </div>
  )
}

/* ====================================================================
   Main App
   ==================================================================== */
function App() {
  // --- Auth ---
  const [user, setUser] = useState(() => loadUser())
  const [showAdmin, setShowAdmin] = useState(false)

  // --- Analysis ---
  const [productName, setProductName] = useState('')
  const [platform, setPlatform] = useState('taobao')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [commonResult, setCommonResult] = useState(null)
  const [platformResults, setPlatformResults] = useState({})
  const [allPlatform, setAllPlatform] = useState(true)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('')
  const [focused, setFocused] = useState(false)

  const handleLogout = () => { clearUser(); setUser(null); window.location.reload() }

  const handleAnalyze = async () => {
    if (!productName.trim()) { setError('请输入产品名称'); return }
    setError('')
    setLoading(true)
    setTab('overview')
    setCommonResult(null)
    setPlatformResults({})

    try {
      // Log case — awaited to guarantee recording
      const platformNames = allPlatform ? ['全平台'] : [PLATFORMS.find(p => p.key === platform)?.name || platform]
      await logCase(user, productName.trim(), platformNames)

      setStage('正在生成商品通用分析…')
      const common = await callCommon(productName.trim())
      setCommonResult(common)

      if (allPlatform) {
        const results = {}
        for (const p of PLATFORMS) {
          setStage(`正在分析 ${p.name} 平台规则（${PLATFORMS.indexOf(p) + 1}/5）…`)
          try { results[p.key] = await callPlatform(productName.trim(), p.key) } catch (e) { results[p.key] = { error: e.message } }
        }
        setPlatformResults(results)
      } else {
        setStage(`正在分析 ${PLATFORMS.find(p => p.key === platform)?.name} 平台规则…`)
        const r = await callPlatform(productName.trim(), platform)
        setPlatformResults({ [platform]: r })
      }
    } catch (e) {
      setError('请求失败: ' + e.message)
    } finally {
      setLoading(false); setStage('')
    }
  }

  // --- Not logged in → show login ---
  if (!user) return <LoginPage onLogin={(u) => setUser(u)} />

  // --- Logged in ---
  const currentPlatformResult = platformResults[platform]
  const hasCommon = commonResult && !commonResult.error
  const hasPlatform = currentPlatformResult && !currentPlatformResult.error
  const hasResult = hasCommon || hasPlatform
  const hasCompetitor = hasCompetitorData(commonResult)
  const availableTabs = ALL_TABS.filter(t => t.key !== 'competitor' || hasCompetitor)
  const tabGroups = [...new Set(availableTabs.map(t => t.group))]
  // Reorder: 平台规则分析 在最前（紧跟平台选择按钮），其次商品通用，最后内容创作
  const GROUP_ORDER = ['平台规则分析', '商品通用分析', '内容创作']
  tabGroups.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      {/* Admin modal */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* ==================== HEADER ==================== */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #388bfd 0%, #8250df 100%)' }}>
              <Icon name="rocket" size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text)]">全平台产品推广分析系统</h1>
              <p className="text-[11px] text-[var(--text-dim)]">淘宝天猫 · 京东 · 抖音 · 拼多多 · 小红书</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin button — only for admin */}
            {user.isAdmin && (
              <button onClick={() => setShowAdmin(true)} className="btn btn-ghost btn-sm gap-1" title="管理后台">
                <Icon name="settings" size={14} />
                <span className="hidden sm:inline text-xs">后台</span>
              </button>
            )}
            {/* User info */}
            <span className="text-xs text-[var(--text-dim)] border-l border-[var(--border-muted)] pl-3 flex items-center gap-1.5">
              <Icon name="user" size={14} />
              <span>{user.name || user.account}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="退出">
              <Icon name="logOut" size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ==================== HERO ==================== */}
      {!hasResult && !loading && (
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-6 text-center">
          <span className="tag tag-blue mb-4">5 大平台知识库 · 575 条运营规则</span>
          <h2 className="text-2xl font-bold text-[var(--text)] mt-4 mb-2">输入产品，一键生成全平台方案</h2>
          <p className="text-sm text-[var(--text-dim)] max-w-lg mx-auto mb-8">通用分析 + 平台规则适配 · 5 套短视频脚本 · 5 套小红书笔记 · 8 段直播话术</p>
        </section>
      )}

      {/* ==================== INPUT ==================== */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <div className="card p-6">
          <div className="mb-5">
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-wider">产品名称</label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="例如：五常大米、便携式榨汁机…" className={`input text-base ${focused ? 'border-[var(--primary)]' : ''}`}
              style={focused ? { boxShadow: '0 0 0 3px rgba(56,139,253,0.15)' } : {}} />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">分析模式</label>
              <button onClick={() => setAllPlatform(!allPlatform)} className={`btn btn-sm ${allPlatform ? 'btn-primary' : 'btn-outline'}`}>
                {allPlatform ? '● 全平台' : '○ 单平台'}
              </button>
            </div>
            {!allPlatform ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.key} onClick={() => setPlatform(p.key)}
                    className={`p-3 rounded-lg border text-left transition-all ${platform === p.key ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border-muted)] bg-[var(--bg-surface)] hover:border-[var(--border)]'}`}>
                    <div className="flex items-center gap-2 mb-1"><span className="platform-dot" style={{ background: p.color }} /><span className="text-sm font-bold text-[var(--text)]">{p.name}</span></div>
                    <div className="text-[11px] text-[var(--text-dim)]">{p.desc.slice(0, 8)}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p, i) => (
                  <div key={p.key} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border-muted)] bg-[var(--bg-surface)]">
                    <span className="platform-dot" style={{ background: p.color }} /><span className="text-[var(--text-dim)]">{String(i + 1).padStart(2, '0')}</span><span className="text-[var(--text)]">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={loading || !productName.trim()} className="btn btn-primary w-full py-3 text-base">
            {loading ? (
              <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeOpacity="0.75" /></svg>{stage || '分析中…'}</>
            ) : (<><Icon name="rocket" size={18} />启动分析</>)}
          </button>
          {error && <div className="mt-3 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-sm text-[var(--danger)]">{error}</div>}
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      {!hasResult && !loading && (
        <section className="max-w-4xl mx-auto px-6 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['chart', '#388bfd', '用户画像与痛点', '目标用户·痛点卖点·定价·搜索词'],
              ['film', '#8250df', '短视频 ×5 套', '痛点反转·产品展示·场景故事·测评·证言'],
              ['book', '#d84d78', '小红书笔记 ×5 套', '干货教程·真实体验·对比·情绪·科普'],
              ['radio', '#2da44e', '直播话术 ×8 段', '开场→介绍→痛点→演示→价格→逼单→收尾'],
              ['calendar', '#bf8700', '生命周期策略', '打标·试用·频道活动·达人·私域·迭代'],
              ['image', '#e06c00', '主图 / 视频提示词', '5 张主图 + 2 条视频含 CTR 目标'],
              ['search', '#388bfd', '竞品分析', '竞品对比·差异化·价格带·机会缺口'],
              ['shield', '#cf222e', '违禁词检查', '各平台违禁词检查 + 合规替代方案'],
            ].map(([icon, color, title, desc], i) => (
              <div key={i} className="card card-hover p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 border" style={{ background: `${color}15`, borderColor: `${color}30` }}>
                  <Icon name={icon} size={16} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text)] mb-1">{title}</h3>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== LOADING ==================== */}
      {loading && (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <div className="card p-6">
            <div className="space-y-4"><div className="skeleton h-12 w-64 rounded-lg" /><div className="skeleton h-4 w-48 rounded" /><div className="grid grid-cols-2 gap-4 mt-4"><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /></div></div>
            <div className="mt-5 text-center text-sm text-[var(--primary)]">AI 正在深度生成方案，预计 30–60 秒…</div>
          </div>
        </section>
      )}

      {/* ==================== RESULTS ==================== */}
      {hasResult && (
        <section className="max-w-4xl mx-auto px-6 pb-14">
          {allPlatform && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-wider">选择平台查看规则分析</div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {PLATFORMS.map(p => (
                  <button key={p.key} onClick={() => setPlatform(p.key)} className={`tab flex items-center gap-2 ${platform === p.key ? 'tab-active' : ''}`}>
                    <span className="platform-dot" style={{ background: p.color }} />{p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mb-5">
            {tabGroups.map(group => {
              const tabs = availableTabs.filter(t => t.group === group)
              const isPlatformGroup = group === '平台规则分析'
              const platformName = PLATFORMS.find(p => p.key === platform)?.name
              return (
                <div key={group} className={`mb-3 ${isPlatformGroup ? 'card p-3' : ''}`} style={isPlatformGroup ? { background: 'rgba(56,139,253,0.04)', borderColor: 'rgba(56,139,253,0.18)' } : {}}>
                  <div className="text-[10px] font-bold text-[var(--text-faint)] mb-1.5 px-1 uppercase tracking-widest">
                    {isPlatformGroup ? (
                      <span className="flex items-center gap-2">
                        <span className="platform-dot" style={{ background: PLATFORMS.find(p => p.key === platform)?.color }} />
                        <span className="text-[var(--primary)]">{platformName}</span>
                        <span>· 平台规则分析</span>
                      </span>
                    ) : group}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tabs.map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)} className={`tab ${tab === t.key ? 'tab-active' : ''}`}>
                        <Icon name={t.icon} size={14} />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="fade-in" key={tab + platform}>
            <TabContent tab={tab} commonData={commonResult} platformData={currentPlatformResult} platform={platform} />
          </div>
        </section>
      )}
    </div>
  )
}

/* ====================================================================
   Tab Router
   ==================================================================== */
function TabContent({ tab, commonData, platformData, platform }) {
  const pi = PLATFORMS.find(p => p.key === platform)
  if (!commonData && !platformData) return <EmptyState text="请先输入产品名称并启动分析" />
  switch (tab) {
    case 'overview':   return <OverviewTab data={commonData} />
    case 'competitor': return <CompetitorTab data={commonData} />
    case 'shortvideo': return <ShortVideoTab data={commonData} />
    case 'livestream': return <LiveStreamTab data={commonData} />
    case 'xhs':        return <XiaohongshuTab data={commonData} />
    case 'matrix':     return <MatrixTab data={commonData} />
    case 'titles':     return <TitlesTab data={platformData} pi={pi} />
    case 'images':     return <ImagesTab data={platformData} pi={pi} />
    case 'videos':     return <VideosTab data={platformData} pi={pi} />
    case 'detail':     return <DetailTab data={platformData} pi={pi} />
    case 'lifecycle':  return <LifecycleTab data={platformData} pi={pi} />
    case 'banned':     return <BannedTab data={platformData} pi={pi} />
    default:           return <EmptyState />
  }
}

/* ====================================================================
   User Profile Visuals Component
   ==================================================================== */
function UserProfileVisuals({ text = '' }) {
  if (!text) return null

  // ---- Parse helpers ----
  const extractPct = (patterns) => {
    for (const re of patterns) {
      const m = text.match(re)
      if (m) { const v = parseInt(m[1], 10); if (v >= 1 && v <= 100) return v }
    }
    return null
  }
  const extractAfter = (keyword, pctRe) => {
    const idx = text.indexOf(keyword); if (idx < 0) return null
    const snippet = text.slice(idx, idx + 80)
    const m = snippet.match(pctRe)
    return m ? parseInt(m[1], 10) : null
  }

  // ---- Gender ----
  let femalePct = extractPct([
    /女[性]?(?:用户)?占[比]?约?(\d{1,3})[%％]/i, /女[性]?[占比约]{0,3}(\d{1,3})[%％][，。,]?[^男]{0,3}(?:女|为主)/i,
    /女性[占比约]{0,3}(\d{1,3})[%％]/i, /(\d{1,3})[%％][^，。]*[女她]/i,
    /[男女]比例\s*(\d{1,3})\s*[:：]/i, /男[女]?\s*[:：]\s*(\d{1,3})/i,
    /[男女]性\s*[:：]\s*(\d{1,3})[%％]/i,
  ])
  // Reverse parse: if text says "男性占X%", female = 100-X
  if (!femalePct) {
    const mp = extractPct([/男[性]?(?:用户)?占[比]?约?(\d{1,3})[%％]/i, /男性[占比约]{0,3}(\d{1,3})[%％]/i])
    if (mp) femalePct = 100 - mp
  }
  // Qualitative fallback
  if (!femalePct && /女[性]为主|以[女她]为主|主要[是女]|大多[数]?[为女]/i.test(text)) femalePct = 70
  if (!femalePct && /男[性]为主|主要[是男]|大多[数]?[为男]/i.test(text)) femalePct = 30
  // Generic fallback: if text mentions gender but no numbers, use reasonable defaults
  if (!femalePct && /男|女|性别/i.test(text)) {
    // Try to infer from product category words in text
    if (/美妆|护肤|母婴|女装|饰品/i.test(text)) femalePct = 75
    else if (/数码|3C|游戏|男装/i.test(text)) femalePct = 30
    else if (/家电|食品|家居|日用/i.test(text)) femalePct = 55
    else femalePct = 50
  }
  const malePct = femalePct ? 100 - femalePct : null

  // ---- Age ----
  let ageGroups = []
  const agePairs = [
    [/1[89]\s*[-–~至]\s*2[0-4]\s*岁|18-24岁|18~24岁|18至24岁/, '18-24'],
    [/2[0-5]\s*[-–~至]\s*3[0-5]\s*岁|25-35岁|25~35岁|25至35岁|25-30岁/, '25-35'],
    [/3[0-6]\s*[-–~至]\s*4[0-5]\s*岁|35-45岁|35~45岁|35至45岁|30-40岁/, '35-45'],
    [/4[0-5]\s*[-–~至]\s*5[0-6]\s*岁|45-55岁|45~55岁|45至55岁|40-50岁/, '45-55'],
    [/5[0-6]\s*岁\s*以[上]|55岁以上|55岁\+|50岁以上/, '55+'],
  ]
  for (const [re, label] of agePairs) {
    const pct = extractAfter(text.match(re)?.[0] || label, /占[比]?约?(\d{1,3})[%％]/)
    if (pct) ageGroups.push({ label, pct, color: '#8250df' })
  }
  // Fallback: if no explicit age %, try broad parsing
  if (ageGroups.length === 0) {
    // Look for "核心年龄段" or "主要集中在 X-Y岁"
    const m = text.match(/(?:核心|主要|集中|主力).*?(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*岁/)
    if (m) {
      const label = `${m[1]}-${m[2]}`
      const pct = extractAfter(label, /占[比]?约?(\d{1,3})[%％]/) || 55
      ageGroups.push({ label, pct, color: '#8250df' })
    }
    // If still nothing, use keyword-based inference
    if (ageGroups.length === 0) {
      if (/Z世代|00后|95后|年轻|18.*25/.test(text)) ageGroups = [{ label: '18-24', pct: 40, color: '#8250df' }, { label: '25-35', pct: 35, color: '#8250df' }, { label: '35-45', pct: 15, color: '#8250df' }, { label: '45+', pct: 10, color: '#8250df' }]
      else if (/中年|35.*45|职场/.test(text)) ageGroups = [{ label: '18-24', pct: 10, color: '#8250df' }, { label: '25-35', pct: 35, color: '#8250df' }, { label: '35-45', pct: 40, color: '#8250df' }, { label: '45+', pct: 15, color: '#8250df' }]
      else if (/全龄|各年龄|家庭/.test(text)) ageGroups = [{ label: '18-24', pct: 15, color: '#8250df' }, { label: '25-35', pct: 30, color: '#8250df' }, { label: '35-45', pct: 30, color: '#8250df' }, { label: '45+', pct: 25, color: '#8250df' }]
      else if (/年龄/i.test(text)) ageGroups = [{ label: '25-35', pct: 40, color: '#8250df' }, { label: '35-45', pct: 30, color: '#8250df' }, { label: '18-24', pct: 15, color: '#8250df' }, { label: '45+', pct: 15, color: '#8250df' }]
    }
  }

  // ---- City tiers ----
  let cityGroups = []
  const cityPairs = [
    [/一线城市|北上广深/i, '一线'], [/新一线|杭州|成都|武汉|南京/i, '新一线'],
    [/二线城|二线城市/i, '二线'], [/三四线|下沉|县域|低线/i, '三四线'],
  ]
  for (const [re, label] of cityPairs) {
    const pct = extractAfter(text.match(re)?.[0] || label, /占[比]?约?(\d{1,3})[%％]/)
    if (pct) cityGroups.push({ label, pct, color: '#2da44e' })
  }
  if (cityGroups.length === 0 && /一线|二线|三四线|城市|地域/i.test(text)) {
    if (/一线.*为主|一二线.*为主|高线/.test(text))
      cityGroups = [{ label: '一线', pct: 35, color: '#2da44e' }, { label: '新一线', pct: 30, color: '#2da44e' }, { label: '二线', pct: 20, color: '#2da44e' }, { label: '三四线', pct: 15, color: '#2da44e' }]
    else if (/下沉|低线|三四线.*为主|县域/.test(text))
      cityGroups = [{ label: '一线', pct: 10, color: '#2da44e' }, { label: '新一线', pct: 15, color: '#2da44e' }, { label: '二线', pct: 25, color: '#2da44e' }, { label: '三四线', pct: 50, color: '#2da44e' }]
    else
      cityGroups = [{ label: '一线', pct: 25, color: '#2da44e' }, { label: '新一线', pct: 28, color: '#2da44e' }, { label: '二线', pct: 27, color: '#2da44e' }, { label: '三四线', pct: 20, color: '#2da44e' }]
  }

  // ---- Consumption ----
  let consumeLevels = []
  const consPairs = [/高消费|高端|高客单|品质消费|精致/i, /中高消费|中高端/i, /中等消费|中端/i, /中低消费|经济型/i, /低消费|低价|价格敏感|性价比优先/i]
  const consLabels = ['高', '中高', '中', '中低', '低']
  for (let i = 0; i < consPairs.length; i++) {
    const pct = extractAfter(text.match(consPairs[i])?.[0] || consLabels[i], /占[比]?约?(\d{1,3})[%％]/)
    if (pct) consumeLevels.push({ label: consLabels[i], pct, color: '#f59e0b' })
  }
  if (consumeLevels.length === 0 && /消费|购买力|收入|客单/i.test(text)) {
    if (/高[端级]|品质|精致|轻奢|高客单/i.test(text))
      consumeLevels = [{ label: '低', pct: 5, color: '#f59e0b' }, { label: '中低', pct: 15, color: '#f59e0b' }, { label: '中', pct: 30, color: '#f59e0b' }, { label: '中高', pct: 30, color: '#f59e0b' }, { label: '高', pct: 20, color: '#f59e0b' }]
    else if (/下沉|低[价端]|性价比|实惠/i.test(text))
      consumeLevels = [{ label: '低', pct: 25, color: '#f59e0b' }, { label: '中低', pct: 35, color: '#f59e0b' }, { label: '中', pct: 25, color: '#f59e0b' }, { label: '中高', pct: 10, color: '#f59e0b' }, { label: '高', pct: 5, color: '#f59e0b' }]
    else
      consumeLevels = [{ label: '低', pct: 10, color: '#f59e0b' }, { label: '中低', pct: 20, color: '#f59e0b' }, { label: '中', pct: 35, color: '#f59e0b' }, { label: '中高', pct: 25, color: '#f59e0b' }, { label: '高', pct: 10, color: '#f59e0b' }]
  }

  // Always try to show all 4 charts if text has any demographic info
  const showGender = femalePct !== null || /男|女|性别/i.test(text)
  const showAge = ageGroups.length > 0 || /年龄|岁/i.test(text)
  const showCity = cityGroups.length > 0 || /城市|地域|省份|一线|二线|三线|下沉|县域/i.test(text)
  const showConsume = consumeLevels.length > 0 || /消费|购买力|收入|客单|价格/i.test(text)

  // Fallback: if text has NOTHING, don't show
  if (!showGender && !showAge && !showCity && !showConsume) return null

  // Ensure at least some default data for visible charts
  if (showAge && ageGroups.length === 0)
    ageGroups = [{ label: '25-35', pct: 40, color: '#8250df' }, { label: '35-45', pct: 30, color: '#8250df' }, { label: '18-24', pct: 15, color: '#8250df' }, { label: '45+', pct: 15, color: '#8250df' }]
  if (showCity && cityGroups.length === 0)
    cityGroups = [{ label: '一线', pct: 25, color: '#2da44e' }, { label: '新一线', pct: 28, color: '#2da44e' }, { label: '二线', pct: 27, color: '#2da44e' }, { label: '三四线', pct: 20, color: '#2da44e' }]
  if (showConsume && consumeLevels.length === 0)
    consumeLevels = [{ label: '低', pct: 10, color: '#f59e0b' }, { label: '中低', pct: 20, color: '#f59e0b' }, { label: '中', pct: 35, color: '#f59e0b' }, { label: '中高', pct: 25, color: '#f59e0b' }, { label: '高', pct: 10, color: '#f59e0b' }]

  // SVG ring
  const circumference = 2 * Math.PI * 35
  const fo = femalePct !== null ? circumference * (1 - femalePct / 100) : circumference * 0.45

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Gender */}
      {showGender && (
        <div className="card p-3 text-center" style={{ background: 'rgba(236,72,153,0.04)' }}>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2">性别占比</div>
          <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
            <circle cx="40" cy="40" r="35" fill="none" stroke="#30363d" strokeWidth="8" />
            <circle cx="40" cy="40" r="35" fill="none" stroke="#ec4899" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={fo}
              strokeLinecap="round" transform="rotate(-90 40 40)" />
          </svg>
          <div className="flex justify-center gap-3 mt-1.5">
            <span className="text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ec4899] inline-block" />女 {femalePct || 50}%</span>
            <span className="text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#30363d] inline-block" />男 {malePct !== null ? malePct : 50}%</span>
          </div>
        </div>
      )}
      {/* Age */}
      {showAge && (
        <div className="card p-3" style={{ background: 'rgba(130,80,223,0.04)' }}>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2">年龄分布</div>
          <div className="space-y-1.5">
            {ageGroups.map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-dim)] w-10">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-surface)]">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.7 }} />
                </div>
                <span className="text-[10px] text-[var(--text-dim)]">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* City */}
      {showCity && (
        <div className="card p-3" style={{ background: 'rgba(45,164,78,0.04)' }}>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2">城市等级</div>
          <div className="space-y-1.5">
            {cityGroups.map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-dim)] w-12">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-surface)]">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.7 }} />
                </div>
                <span className="text-[10px] text-[var(--text-dim)]">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Consumption */}
      {showConsume && (
        <div className="card p-3" style={{ background: 'rgba(245,158,11,0.04)' }}>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2">消费力水平</div>
          <div className="flex items-end justify-around gap-1 h-16 pt-1">
            {consumeLevels.map(({ label, pct, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-[var(--text-dim)]">{pct}%</span>
                <div className="w-5 rounded-t" style={{ height: `${Math.max(pct * 0.6, 4)}px`, background: color, opacity: 0.7 }} />
                <span className="text-[10px] text-[var(--text-dim)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ====================================================================
   Overview Tab
   ==================================================================== */
function OverviewTab({ data }) {
  const pa = data?.productAnalysis || {}
  if (!pa.productCategory) return <EmptyState text="暂无分析数据" />
  const painCount = (pa.userPainPoints || []).length
  const sellCount = (pa.sellingPoints || []).length
  return (
    <SectionCard title="用户画像与痛点分析" subtitle="产品定位 · 目标用户 · 痛点卖点 · 定价与搜索词" iconName="chart" badge="商品通用">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="kpi"><div className="kpi-label">产品类目</div><div className="text-sm font-bold text-[var(--text)]">{pa.productCategory || '—'}</div></div>
        <div className="kpi"><div className="kpi-label">痛点数量</div><div className="kpi-num">{painCount}</div><div className="text-xs text-[var(--text-dim)]">核心痛点</div></div>
        <div className="kpi"><div className="kpi-label">核心卖点</div><div className="kpi-num">{sellCount}</div><div className="text-xs text-[var(--text-dim)]">竞争优势</div></div>
        <div className="kpi"><div className="kpi-label">搜索关键词</div><div className="kpi-num">{(pa.searchKeywords || []).length}</div><div className="text-xs text-[var(--text-dim)]">覆盖词条</div></div>
      </div>
      {pa.marketSize && <div className="card p-4 mb-4"><div className="text-xs font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-wider">市场规模</div><p className="text-sm text-[var(--text)]">{pa.marketSize}</p></div>}
      <div className="card p-5 mb-4">
        <div className="sec-head"><Icon name="chart" size={16} /><div><h3 className="sec-head-title">目标用户画像</h3><p className="sec-head-sub">年龄 · 性别 · 地域 · 消费力 · 购物习惯 · 决策路径</p></div><div className="ml-auto"><CopyBtn text={pa.targetUsers} /></div></div>
        <div className="content-box-white mb-4">{pa.targetUsers || '暂无数据'}</div>
        {/* 用户画像可视化 */}
        <UserProfileVisuals text={pa.targetUsers} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-[var(--danger)]" /><h3 className="text-sm font-bold text-[var(--text)]">用户痛点</h3></div>
          <div className="space-y-2">{(pa.userPainPoints || []).map((p, i) => <div key={i} className="hl-danger bg-[var(--bg-surface)] p-3 rounded-r-lg"><p className="text-sm text-[var(--text)]"><span className="text-[var(--danger)] font-bold mr-2">P{i + 1}</span>{p}</p></div>)}{painCount === 0 && <p className="text-sm text-[var(--text-dim)]">暂无数据</p>}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-[var(--success)]" /><h3 className="text-sm font-bold text-[var(--text)]">核心卖点</h3></div>
          <div className="space-y-2">{(pa.sellingPoints || []).map((s, i) => <div key={i} className="hl-success bg-[var(--bg-surface)] p-3 rounded-r-lg"><p className="text-sm text-[var(--text)]"><span className="text-[var(--success)] font-bold mr-2">S{i + 1}</span>{s}</p></div>)}{sellCount === 0 && <p className="text-sm text-[var(--text-dim)]">暂无数据</p>}</div>
        </div>
      </div>
      <div className="card p-5 mb-4">
        <div className="sec-head"><Icon name="calendar" size={16} /><div><h3 className="sec-head-title">定价策略</h3><p className="sec-head-sub">引流款 · 利润款 · 形象款 + 竞品参考</p></div><div className="ml-auto"><CopyBtn text={pa.priceStrategy} /></div></div>
        <div className="content-box">{pa.priceStrategy || '暂无数据'}</div>
      </div>
      {pa.searchKeywords && pa.searchKeywords.length > 0 && (
        <div className="card p-5"><div className="sec-head"><Icon name="search" size={16} /><h3 className="sec-head-title">核心搜索词</h3></div><div className="flex flex-wrap gap-2">{pa.searchKeywords.map((kw, i) => <span key={i} className="chip">{kw}</span>)}</div></div>
      )}
    </SectionCard>
  )
}

/* ====================================================================
   Competitor Tab
   ==================================================================== */
function CompetitorTab({ data }) {
  let parsed
  try { parsed = parseCompetitors(data) } catch { parsed = { types: '', list: [], diff: '', benchmark: '', gap: '' } }
  const { types, list: competitors, diff, benchmark, gap } = parsed
  if (!types && competitors.length === 0) return null
  return (
    <SectionCard title="竞品分析" subtitle="竞品对比 · 差异化 · 价格基准 · 机会缺口" iconName="search" badge="商品通用">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="kpi"><div className="kpi-label">识别竞品</div><div className="kpi-num">{competitors.length}</div><div className="text-xs text-[var(--text-dim)]">头部 + 腰部 + 白牌</div></div>
        <div className="kpi"><div className="kpi-label">差异化维度</div><div className="text-sm font-bold text-[var(--text)]">5</div><div className="text-xs text-[var(--text-dim)]">产品 / 价格 / 视觉 / 内容 / 服务</div></div>
      </div>
      {competitors.length > 0 && (
        <div className="mb-5">
          <div className="sec-head"><h3 className="sec-head-title">主要竞品对比</h3></div>
          <div className="table-wrap"><table><thead><tr><th>竞品名称</th><th>价格带</th><th>核心优势</th><th>明显短板</th></tr></thead><tbody>
            {competitors.map((r, i) => <tr key={i}><td className="font-bold text-[var(--text)]">{r.name||'—'}</td><td className="font-bold text-[var(--warning)]">{r.price||'—'}</td><td className="text-[var(--success)]">{r.strength||'—'}</td><td className="text-[var(--danger)]">{r.weakness||'—'}</td></tr>)}
          </tbody></table></div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card p-5"><div className="sec-head"><h3 className="sec-head-title">差异化策略</h3><div className="ml-auto"><CopyBtn text={diff} /></div></div><div className="content-box">{diff || '—'}</div></div>
        <div className="card p-5"><div className="sec-head"><h3 className="sec-head-title">价格基准</h3></div><div className="content-box">{benchmark || '—'}</div></div>
      </div>
      <div className="card p-5" style={{ background: 'rgba(45,164,78,0.04)', borderColor: 'rgba(45,164,78,0.15)' }}>
        <div className="sec-head"><Icon name="sparkles" size={16} /><h3 className="sec-head-title text-[var(--success)]">机会缺口</h3></div><div className="content-box">{gap || '—'}</div>
      </div>
    </SectionCard>
  )
}

/* ====================================================================
   Short Video Tab
   ==================================================================== */
function ShortVideoTab({ data }) {
  const scripts = data?.shortVideoScripts || []
  const [active, setActive] = useState(0)
  const colors = { '痛点反转型':'#cf222e','产品展示型':'#8250df','场景故事型':'#2da44e','测评对比型':'#388bfd','用户证言型':'#bf8700' }
  const sv = scripts[active]
  const clr = sv ? (colors[sv.style] || '#388bfd') : '#388bfd'
  return (
    <SectionCard title="短视频拍摄脚本" subtitle="5 套不同风格 · 每套含完整分镜 · 可直接拍摄" iconName="film" badge={`${scripts.length} 套方案`}>
      {scripts.length > 1 && <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">{scripts.map((v,i)=><button key={i} onClick={()=>setActive(i)} className={`tab ${active===i?'tab-active':''}`} style={active===i?{borderColor:`${clr}40`,color:clr,background:`${clr}10`}:{}}><span className="text-[var(--text-faint)] mr-1">{String(i+1).padStart(2,'0')}</span>{v.style}</button>)}</div>}
      {sv && <div>
        <div className="card p-4 mb-3"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="tag" style={{background:`${clr}15`,color:clr,border:`1px solid ${clr}30`}}>{sv.style}</span><span className="text-base font-bold text-[var(--text)]">{sv.title}</span></div><div className="flex items-center gap-2">{sv.duration&&<span className="text-xs text-[var(--text-dim)]">⏱ {sv.duration}</span>}<CopyBtn text={JSON.stringify(sv,null,2)} label="复制全部"/></div></div>
          {sv.hook&&<div className="mt-2 p-3 rounded-lg" style={{background:'rgba(191,135,0,0.06)',border:'1px solid rgba(191,135,0,0.15)'}}><div className="text-xs font-bold text-[var(--warning)] mb-1">⚡ 前 3 秒钩子</div><p className="text-sm text-[var(--text)]">{sv.hook}</p></div>}</div>
        <div className="space-y-2 mb-4">{(sv.scenes||[]).map((sc,i)=><div key={i} className="card p-4"><div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:`${clr}12`,color:clr}}>{sc.time}</span><span className="text-xs text-[var(--text-faint)]">SCENA_{String(i+1).padStart(2,'0')}</span></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">画面</div><p className="text-sm text-[var(--text)] leading-relaxed">{sc.action}</p></div><div><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">配音</div><p className="text-sm text-[var(--text)] leading-relaxed">{sc.voiceover}</p></div><div><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">字幕</div><p className="text-sm text-[var(--text)] leading-relaxed">{sc.text}</p></div></div></div>)}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{sv.cta&&<div className="card p-3" style={{background:'rgba(45,164,78,0.04)'}}><div className="text-xs font-bold text-[var(--success)] mb-1">📢 行动号召</div><p className="text-sm text-[var(--text)]">{sv.cta}</p></div>}{sv.bgm&&<div className="card p-3"><div className="text-xs font-bold text-[var(--text-dim)] mb-1">🎵 推荐 BGM</div><p className="text-sm text-[var(--text)]">{sv.bgm}</p></div>}{sv.notes&&<div className="card p-3"><div className="text-xs font-bold text-[var(--text-dim)] mb-1">📋 拍摄注意</div><p className="text-sm text-[var(--text)]">{sv.notes}</p></div>}</div>
      </div>}
    </SectionCard>
  )
}

/* ====================================================================
   Live Stream Tab
   ==================================================================== */
function LiveStreamTab({ data }) {
  const ls = data?.liveStreamScript || {}
  const sections = [['opening','开场话术','#388bfd'],['productIntro','产品介绍','#8250df'],['painPointResonance','痛点共鸣','#cf222e'],['sellingPointDemo','卖点演示','#2da44e'],['priceReveal','价格揭晓','#bf8700'],['urgencyCreate','逼单话术','#d84d78'],['interactionGuide','互动引导','#388bfd'],['closing','收尾话术','#8250df']]
  const allText = sections.map(([key,label]) => `【${label}】\n${ls[key]||''}`).join('\n\n')
  if (!ls.opening) return <EmptyState text="暂无直播话术数据" />
  return (
    <SectionCard title="直播话术脚本" subtitle="8 段话术 · 开场 → 收尾全流程 · 含具体台词" iconName="radio" badge="商品通用" actions={<CopyBtn text={allText} label="复制全部"/>}>
      <div className="space-y-3">{sections.map(([key,label,color])=><div key={key} className="hl-info card-hover p-4" style={{borderLeftColor:color}}><div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold" style={{color}}>{label}</h4><CopyBtn text={ls[key]||''}/></div><p className="text-sm text-[var(--text)] leading-relaxed">{ls[key]||'—'}</p></div>)}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Xiaohongshu Tab
   ==================================================================== */
function XiaohongshuTab({ data }) {
  const notes = data?.xiaohongshuNotes || []
  const [active, setActive] = useState(0)
  const colors = {'干货教程型':'#388bfd','真实体验型':'#d84d78','对比测评型':'#388bfd','情绪故事型':'#bf8700','专业科普型':'#2da44e'}
  const note = notes[active]; const clr = note ? (colors[note.style]||'#d84d78') : '#d84d78'
  return (
    <SectionCard title="小红书种草笔记" subtitle="5 套不同角度 · 标题 / 封面 / 正文 / 标签 / 发布策略" iconName="book" badge={`${notes.length} 套笔记`}>
      {notes.length>1&&<div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">{notes.map((v,i)=><button key={i} onClick={()=>setActive(i)} className={`tab ${active===i?'tab-active':''}`} style={active===i?{borderColor:`${clr}40`,color:clr,background:`${clr}10`}:{}}><span className="text-[var(--text-faint)] mr-1">{String(i+1).padStart(2,'0')}</span>{v.style}</button>)}</div>}
      {note&&<div>
        <div className="card p-4 mb-3"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="tag" style={{background:`${clr}15`,color:clr,border:`1px solid ${clr}30`}}>{note.style}</span><span className="text-base font-bold text-[var(--text)]">{note.title}</span></div><CopyBtn text={`${note.title}\n\n${note.content}\n\n${(note.tags||[]).map(t=>'#'+t).join(' ')}`} label="复制全部"/></div>{note.expectedMetrics&&<div className="text-xs text-[var(--text-dim)]">📊 预期互动：{note.expectedMetrics}</div>}</div>
        {note.coverPrompt&&<div className="card p-4 mb-3"><div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">封面设计提示词</div><CopyBtn text={note.coverPrompt}/></div><p className="text-sm text-[var(--text)] leading-relaxed">{note.coverPrompt}</p></div>}
        <div className="card p-5 mb-3"><div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">笔记正文</div><CopyBtn text={note.content}/></div><div className="content-box-white max-h-[420px] overflow-y-auto whitespace-pre-wrap">{note.content||'暂无内容'}</div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="card p-4"><div className="text-xs font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-wider">标签</div><div className="flex flex-wrap gap-1.5">{(note.tags||[]).map((t,i)=><span key={i} className="chip">#{t}</span>)}</div></div><div className="card p-4"><div className="text-xs font-semibold text-[var(--text-dim)] mb-1 uppercase tracking-wider">互动引导</div><p className="text-sm text-[var(--text)] mb-3">{note.interactionGuide||'—'}</p>{note.publishTime&&<><div className="text-xs font-semibold text-[var(--text-dim)] mb-1 uppercase tracking-wider">最佳发布时间</div><p className="text-sm text-[var(--text)]">{note.publishTime}</p></>}</div></div>
      </div>}
    </SectionCard>
  )
}

/* ====================================================================
   Matrix Tab
   ==================================================================== */
function MatrixTab({ data }) {
  const cm = data?.contentMatrix || {}
  const sections = [{key:'shortVideo',label:'短视频选题',color:'#cf222e',icon:'film'},{key:'liveTopics',label:'直播主题',color:'#8250df',icon:'radio'},{key:'notes',label:'笔记选题',color:'#d84d78',icon:'book'},{key:'images',label:'图文选题',color:'#2da44e',icon:'image'}]
  return (
    <SectionCard title="内容矩阵规划" subtitle="短视频 5 · 直播 3 · 笔记 4 · 图文 3" iconName="grid" badge="商品通用">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{sections.map(s=><div key={s.key} className="card p-4"><div className="sec-head"><div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{background:`${s.color}10`,borderColor:`${s.color}25`}}><Icon name={s.icon} size={14}/></div><h3 className="text-sm font-bold text-[var(--text)]">{s.label}</h3><span className="ml-auto text-xs font-bold text-[var(--text-faint)]">{(cm[s.key]||[]).length}</span></div><div className="space-y-1.5">{(cm[s.key]||[]).map((item,i)=><div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"><span className="text-xs font-bold text-[var(--text-faint)] mt-0.5">{String(i+1).padStart(2,'0')}</span><span className="text-sm text-[var(--text)]">{item}</span></div>)}</div></div>)}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Titles Tab (Platform)
   ==================================================================== */
function TitlesTab({ data, pi }) {
  const titles = data?.titleSuggestions || []
  return (
    <SectionCard title="标题方案建议" subtitle={`基于 ${pi?.name} 平台热搜词+搜索规则生成`} platformInfo={pi} iconName="text">
      <div className="space-y-3">{titles.map((t,i)=><div key={i} className="card card-hover p-4"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-muted)] text-xs font-bold text-[var(--primary)] flex-shrink-0">{i+1}</div><div className="flex-1 min-w-0"><p className="text-sm text-[var(--text)] leading-relaxed">{t}</p><p className="text-xs text-[var(--text-dim)] mt-1.5">{t.length} 字</p></div><CopyBtn text={t}/></div></div>)}{titles.length===0&&<EmptyState/>}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Images Tab (Platform)
   ==================================================================== */
function ImagesTab({ data, pi }) {
  const images = data?.mainImagePrompts || []
  return (
    <SectionCard title="主图设计提示词" subtitle="5 张主图 · 可直接用于 AI 生图或设计师参考" platformInfo={pi} iconName="image">
      <div className="space-y-3">{images.map((img,i)=><div key={i} className="card card-hover p-4"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[var(--primary)]/10 border border-[var(--primary)]/20" style={{color:'var(--primary)'}}>{i+1}</span><span className="text-sm font-bold text-[var(--text)]">{img.position}</span></div>{img.ctrTarget&&<span className="tag tag-yellow">🎯 {img.ctrTarget}</span>}</div><div className="flex items-start gap-3"><p className="text-sm text-[var(--text)] flex-1 leading-relaxed">{img.prompt}</p><CopyBtn text={img.prompt}/></div></div>)}{images.length===0&&<EmptyState/>}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Videos Tab (Platform)
   ==================================================================== */
function VideosTab({ data, pi }) {
  const videos = data?.videoPrompts || []
  return (
    <SectionCard title="视频拍摄提示词" subtitle="主图视频 + 带货短视频 · 含分镜指导" platformInfo={pi} iconName="video">
      <div className="space-y-3">{videos.map((v,i)=><div key={i} className="card card-hover p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-bold" style={{color:'var(--purple)'}}>{v.type}</span><span className="tag tag-purple">⏱ {v.duration}</span></div><div className="flex items-start gap-3"><p className="text-sm text-[var(--text)] flex-1 leading-relaxed">{v.prompt}</p><CopyBtn text={v.prompt}/></div></div>)}{videos.length===0&&<EmptyState/>}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Detail Tab (Platform)
   ==================================================================== */
function DetailTab({ data, pi }) {
  const details = data?.detailPagePrompts || []
  return (
    <SectionCard title="详情页设计提示词" subtitle="6 个模块 · 按平台规则设计" platformInfo={pi} iconName="doc">
      <div className="space-y-3">{details.map((d,i)=><div key={i} className="hl-info card-hover p-4"><div className="flex items-start gap-3"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex-shrink-0" style={{color:'var(--primary)'}}>{i+1}</span><p className="text-sm text-[var(--text)] flex-1 leading-relaxed">{d}</p><CopyBtn text={d}/></div></div>)}{details.length===0&&<EmptyState/>}</div>
    </SectionCard>
  )
}

/* ====================================================================
   Lifecycle Tab (Platform — enriched with tagging/trials/channels)
   ==================================================================== */
function LifecycleTab({ data, pi }) {
  const lc = data?.lifecycleStrategy || {}
  const stages = [
    { key: 'prepare', name: '准备期', color: '#388bfd', extra: ['tagging','qualifications'] },
    { key: 'launch',  name: '导入期', color: '#8250df', extra: ['trialChannel','channelActivity'] },
    { key: 'growth',  name: '成长期', color: '#2da44e' },
    { key: 'burst',   name: '爆发期', color: '#cf222e' },
    { key: 'stable',  name: '稳定期', color: '#bf8700' },
  ]

  return (
    <SectionCard title="全链路生命周期推广策略" subtitle="打标 · 试用 · 频道活动 · 达人 · 私域 · 复购 · 迭代" platformInfo={pi} iconName="calendar">
      <div className="space-y-3">
        {stages.map((st, i) => {
          const sd = lc[st.key] || {}
          return (
            <div key={st.key} className="relative">
              {i < 4 && <div className="absolute left-4 top-10 bottom-0 w-0.5 timeline-line" />}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 z-10 border" style={{ background: `${st.color}10`, borderColor: `${st.color}40`, color: st.color }}>{i + 1}</div>
                <div className="flex-1 card card-hover p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold" style={{ color: st.color }}>{st.name}</h3>
                    {sd.timeline && <span className="text-xs text-[var(--text-dim)]">{sd.timeline}</span>}
                  </div>
                  {/* Actions */}
                  <div className="mb-3">
                    <div className="text-[11px] text-[var(--text-dim)] mb-1.5 font-semibold uppercase tracking-wider">具体行动</div>
                    <ul className="space-y-1">
                      {(sd.actions || []).map((a, j) => (
                        <li key={j} className="text-sm text-[var(--text)] flex items-start gap-1.5"><span style={{ color: st.color }}>▸</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                  {/* Extra fields for prepare & launch */}
                  {st.extra && st.extra.includes('tagging') && sd.tagging && (
                    <div className="card p-3 mb-2"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">打标方案</div><p className="text-sm text-[var(--text)]">{sd.tagging}</p></div>
                  )}
                  {st.extra && st.extra.includes('qualifications') && sd.qualifications && (
                    <div className="card p-3 mb-2"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">所需资质</div><p className="text-sm text-[var(--text)]">{sd.qualifications}</p></div>
                  )}
                  {st.extra && st.extra.includes('trialChannel') && sd.trialChannel && (
                    <div className="card p-3 mb-2"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">试用频道方案</div><p className="text-sm text-[var(--text)]">{sd.trialChannel}</p></div>
                  )}
                  {st.extra && st.extra.includes('channelActivity') && sd.channelActivity && (
                    <div className="card p-3 mb-2"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">频道活动报名</div><p className="text-sm text-[var(--text)]">{sd.channelActivity}</p></div>
                  )}
                  {/* Budget / KPI / Tools */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                    <div className="card p-3"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">预算</div><p className="text-sm text-[var(--text)]">{sd.budget || '—'}</p></div>
                    <div className="card p-3"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">核心指标</div><p className="text-sm text-[var(--text)]">{sd.kpi || '—'}</p></div>
                    {sd.tools && <div className="card p-3"><div className="text-[11px] text-[var(--text-dim)] mb-1 font-semibold uppercase">工具资源</div><p className="text-sm text-[var(--text)]">{sd.tools}</p></div>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

/* ====================================================================
   Banned Tab (Platform)
   ==================================================================== */
function BannedTab({ data, pi }) {
  const bc = data?.bannedWordCheck || {}
  const rc = bc.riskLevel === '低风险' ? '#2da44e' : bc.riskLevel === '中风险' ? '#bf8700' : '#cf222e'
  return (
    <SectionCard title="违禁词检查报告" subtitle={`基于 ${pi?.name} 平台违禁词规则`} platformInfo={pi} iconName="shield">
      <div className="p-5 rounded-xl mb-4" style={{ background: `${rc}08`, border: `1px solid ${rc}30` }}>
        <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border" style={{ background: `${rc}12`, borderColor: `${rc}25`, color: rc }}>{bc.riskLevel==='低风险'?'✓':bc.riskLevel==='中风险'?'⚠':'✗'}</div><div><h3 className="text-lg font-bold" style={{ color: rc }}>{bc.riskLevel||'未知'}</h3><p className="text-xs text-[var(--text-dim)] mt-1">{bc.checkedContent||`已对全部内容进行 ${pi?.name} 平台违禁词检查`}</p></div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div><div className="text-xs font-semibold text-[var(--danger)] mb-2 uppercase tracking-wider">⚠ 风险提示</div><div className="space-y-2">{(bc.warnings||[]).map((w,i)=><div key={i} className="hl-danger card-hover p-3"><p className="text-sm text-[var(--text)]">{w}</p></div>)}</div></div>
        <div><div className="text-xs font-semibold text-[var(--success)] mb-2 uppercase tracking-wider">✓ 合规建议</div><div className="space-y-2">{(bc.suggestions||[]).map((s,i)=><div key={i} className="hl-success card-hover p-3"><p className="text-sm text-[var(--text)]">{s}</p></div>)}</div></div>
      </div>
      {bc.platformSpecificRules && <div className="card p-4"><div className="text-xs font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-wider">{pi?.name} 平台特有合规规则</div><p className="text-sm text-[var(--text)] leading-relaxed">{bc.platformSpecificRules}</p></div>}
    </SectionCard>
  )
}

export default App
