const express = require('express');
const cors = require('cors');
const { KNOWLEDGE_BASE, LIFECYCLE_STAGES } = require('./knowledge_base.cjs');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ba0219fb9677478081deaf4f6d7931ca';
const DEEPSEEK_API_URL = 'api.deepseek.com';

// 调用DeepSeek API
function callDeepSeek(messages, stream = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      stream: stream,
      max_tokens: 8000,
      temperature: 0.7
    });

    const options = {
      hostname: DEEPSEEK_API_URL,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'API Error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Parse error: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 构建平台分析prompt
function buildAnalysisPrompt(productName, platformKey, platformData) {
  const kb = platformData;
  
  return `你是一位资深电商运营操盘手，精通${kb.name}平台的运营规则和推广策略。请基于以下平台知识库规则，为产品"${productName}"制定完整的推广方案。

## ${kb.name}平台核心规则

**底层逻辑**：${kb.coreLogic}
**核心公式**：${kb.coreFormula}
**标题规则**：${kb.titleRule}
**主图规则**：${kb.mainImageRule}
**详情页规则**：${kb.detailRule}
**SKU规则**：${kb.skuRule}
**付费推广**：${kb.paidPromotion}
**活动规则**：${kb.activityRule}
**用户画像**：${kb.userPersona}
**内容技巧**：${kb.contentTips}

**违禁词（绝对不能使用）**：${kb.bannedWords.join('、')}
**平台红线**：${kb.redLines.join('；')}

## 生命周期策略参考

- 准备期：${kb.lifecycle.prepare}
- 导入期：${kb.lifecycle.launch}
- 成长期：${kb.lifecycle.growth}
- 爆发期：${kb.lifecycle.burst}
- 稳定期：${kb.lifecycle.stable}

## 输出要求

请严格按以下JSON格式输出（不要输出任何其他内容，只输出JSON）：

{
  "platform": "${kb.name}",
  "productAnalysis": {
    "productCategory": "推断的产品类目",
    "targetUsers": "目标用户画像分析（结合平台用户特征）",
    "userPainPoints": ["痛点1", "痛点2", "痛点3"],
    "sellingPoints": ["卖点1", "卖点2", "卖点3"],
    "priceStrategy": "定价策略建议"
  },
  "titleSuggestions": [
    "标题建议1（符合平台标题规则）",
    "标题建议2",
    "标题建议3"
  ],
  "mainImagePrompts": [
    {
      "position": "主图1-首图",
      "prompt": "详细的主图拍摄/设计提示词，包含画面构图、文案、卖点展示方式",
      "ctrTarget": "预期点击率目标"
    },
    {
      "position": "主图2-卖点图",
      "prompt": "详细提示词",
      "ctrTarget": ""
    },
    {
      "position": "主图3-场景图",
      "prompt": "详细提示词",
      "ctrTarget": ""
    },
    {
      "position": "主图4-细节图",
      "prompt": "详细提示词",
      "ctrTarget": ""
    },
    {
      "position": "主图5-评价图",
      "prompt": "详细提示词",
      "ctrTarget": ""
    }
  ],
  "videoPrompts": [
    {
      "type": "主图视频",
      "duration": "15-30秒",
      "prompt": "详细视频拍摄提示词，包含分镜、脚本、画面描述"
    },
    {
      "type": "带货短视频",
      "duration": "15-60秒",
      "prompt": "详细视频拍摄提示词，前3秒钩子设计"
    }
  ],
  "detailPagePrompts": [
    "详情页模块1提示词：痛点引入",
    "详情页模块2提示词：卖点展示",
    "详情页模块3提示词：参数对比",
    "详情页模块4提示词：场景应用",
    "详情页模块5提示词：信任背书"
  ],
  "competitorAnalysis": {
    "competitorTypes": "竞品类型分析",
    "differentiation": "差异化策略",
    "priceBenchmark": "价格带参考",
    "opportunityGap": "机会缺口"
  },
  "lifecycleStrategy": {
    "prepare": {
      "actions": ["准备期具体行动1", "准备期具体行动2"],
      "budget": "预算建议",
      "kpi": "核心指标",
      "timeline": "时间规划"
    },
    "launch": {
      "actions": ["导入期具体行动1", "导入期具体行动2"],
      "budget": "预算建议",
      "kpi": "核心指标",
      "timeline": "时间规划"
    },
    "growth": {
      "actions": ["成长期具体行动1", "成长期具体行动2"],
      "budget": "预算建议",
      "kpi": "核心指标",
      "timeline": "时间规划"
    },
    "burst": {
      "actions": ["爆发期具体行动1", "爆发期具体行动2"],
      "budget": "预算建议",
      "kpi": "核心指标",
      "timeline": "时间规划"
    },
    "stable": {
      "actions": ["稳定期具体行动1", "稳定期具体行动2"],
      "budget": "预算建议",
      "kpi": "核心指标",
      "timeline": "时间规划"
    }
  },
  "shortVideoScript": {
    "title": "短视频标题",
    "duration": "总时长",
    "hook": "前3秒钩子",
    "scenes": [
      {"time": "0-3s", "action": "画面描述", "voiceover": "配音文案", "text": "字幕文案"},
      {"time": "3-10s", "action": "画面描述", "voiceover": "配音文案", "text": "字幕文案"},
      {"time": "10-20s", "action": "画面描述", "voiceover": "配音文案", "text": "字幕文案"},
      {"time": "20-30s", "action": "画面描述", "voiceover": "配音文案", "text": "字幕文案"}
    ],
    "cta": "结尾行动号召"
  },
  "liveStreamScript": {
    "opening": "开场话术（3分钟内）",
    "productIntro": "产品介绍话术",
    "painPointResonance": "痛点共鸣话术",
    "sellingPointDemo": "卖点演示话术",
    "priceReveal": "价格揭晓话术",
    "urgencyCreate": "逼单话术",
    "interactionGuide": "互动引导话术",
    "closing": "收尾话术"
  },
  "xiaohongshuNote": {
    "title": "笔记标题（含搜索词，设问式）",
    "coverPrompt": "封面设计提示词（3:4竖图）",
    "content": "笔记正文（真实分享感，含搜索词布局，互动引导）",
    "tags": ["标签1", "标签2", "标签3"],
    "interactionGuide": "互动引导话术"
  },
  "contentMatrix": {
    "shortVideo": ["短视频选题1", "短视频选题2", "短视频选题3", "短视频选题4", "短视频选题5"],
    "liveTopics": ["直播主题1", "直播主题2", "直播主题3"],
    "notes": ["笔记选题1", "笔记选题2", "笔记选题3", "笔记选题4"],
    "images": ["图文选题1", "图文选题2", "图文选题3"]
  },
  "bannedWordCheck": {
    "riskLevel": "低风险/中风险/高风险",
    "warnings": ["需要特别注意的违禁词风险点1", "风险点2"],
    "suggestions": ["合规建议1", "合规建议2"]
  }
}

请确保：
1. 所有内容必须符合${kb.name}平台规则，不使用任何违禁词
2. 标题必须符合平台标题字数和结构规则
3. 主图提示词要具体可执行
4. 生命周期策略要结合平台特有机制
5. 短视频/直播/笔记要结合平台内容调性
6. 所有数字和预算建议要合理可执行
7. 输出必须是合法JSON，不要有markdown格式`;
}

// 构建小红书专用笔记prompt
function buildXiaohongshuPrompt(productName) {
  const kb = KNOWLEDGE_BASE.xiaohongshu;
  return `你是小红书种草内容专家。请为产品"${productName}"创作一篇完整的小红书种草笔记。

## 小红书平台规则
- 底层逻辑：${kb.coreLogic}
- CES评分：${kb.coreFormula}
- 封面规则：${kb.mainImageRule}
- 搜索词：${kb.titleRule}
- 违禁词：${kb.bannedWords.join('、')}
- 限流红线：${kb.redLines.join('；')}

请输出JSON格式：
{
  "title": "笔记标题（含核心搜索词，设问式，20字内）",
  "coverDesign": "封面设计详细提示词（3:4竖图，突出钩子/利益点/场景）",
  "body": "笔记正文（800-1200字，真实分享感，含5-8个搜索词自然布局，分段清晰，使用emoji，文末征集互动）",
  "tags": ["相关标签1", "相关标签2", "标签3", "标签4", "标签5", "标签6", "标签7", "标签8"],
  "interactionGuide": "评论区互动引导话术",
  "publishTime": "最佳发布时间建议",
  "bannedWordCheck": "违禁词自查结果"
}`;
}

// API路由：分析产品
app.post('/api/analyze', async (req, res) => {
  const { productName, platform } = req.body;
  
  if (!productName) {
    return res.status(400).json({ error: '请输入产品名称' });
  }

  try {
    const platformData = KNOWLEDGE_BASE[platform];
    if (!platformData) {
      return res.status(400).json({ error: '不支持的平台' });
    }

    const prompt = buildAnalysisPrompt(productName, platform, platformData);
    
    const messages = [
      { role: 'system', content: '你是一位精通中国五大电商平台（拼多多、淘宝天猫、抖音、小红书、京东）运营规则的资深操盘手。你的输出必须是纯JSON格式，不要包含markdown标记。' },
      { role: 'user', content: prompt }
    ];

    const result = await callDeepSeek(messages);
    let content = result.choices[0].message.content;
    
    // 清理可能的markdown标记
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(content);
      res.json({ success: true, data: parsed });
    } catch (e) {
      // 如果JSON解析失败，返回原始内容
      res.json({ success: true, data: null, rawContent: content });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API路由：获取知识库
app.get('/api/knowledge-base', (req, res) => {
  res.json({ KNOWLEDGE_BASE, LIFECYCLE_STAGES });
});

// API路由：违禁词检查
app.post('/api/check-banned-words', (req, res) => {
  const { text, platform } = req.body;
  const platformData = KNOWLEDGE_BASE[platform];
  
  if (!platformData) {
    return res.status(400).json({ error: '不支持的平台' });
  }

  const found = [];
  for (const word of platformData.bannedWords) {
    if (text.includes(word)) {
      found.push(word);
    }
  }

  res.json({
    platform: platformData.name,
    foundWords: found,
    riskLevel: found.length === 0 ? '安全' : found.length <= 2 ? '中风险' : '高风险',
    suggestion: found.length === 0 ? '未检测到违禁词' : `检测到${found.length}个违禁词：${found.join('、')}，请替换后使用`
  });
});

// API路由：全平台分析
app.post('/api/analyze-all', async (req, res) => {
  const { productName } = req.body;
  
  if (!productName) {
    return res.status(400).json({ error: '请输入产品名称' });
  }

  const platforms = ['pdd', 'taobao', 'douyin', 'xiaohongshu', 'jd'];
  const results = {};
  
  // 并行调用所有平台
  const promises = platforms.map(async (platform) => {
    try {
      const platformData = KNOWLEDGE_BASE[platform];
      const prompt = buildAnalysisPrompt(productName, platform, platformData);
      const messages = [
        { role: 'system', content: '你是一位精通中国五大电商平台运营规则的资深操盘手。输出必须是纯JSON格式。' },
        { role: 'user', content: prompt }
      ];
      const result = await callDeepSeek(messages);
      let content = result.choices[0].message.content;
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        results[platform] = JSON.parse(content);
      } catch {
        results[platform] = { rawContent: content };
      }
    } catch (error) {
      results[platform] = { error: error.message };
    }
  });

  await Promise.all(promises);
  res.json({ success: true, data: results });
});

// 所有其他路由返回index.html
app.get('{*path}', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
