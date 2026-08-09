# ClaWOW 嵌入对接说明

## 嵌入 URL 格式

```
https://product-promo-platform.onrender.com/?embed=1&sso_token=<JWT>
```

或（推荐，更安全）：

```html
<iframe src="https://product-promo-platform.onrender.com/?embed=1"
        style="width:100%;height:100%;border:0"
        allow="clipboard-read; clipboard-write">
</iframe>
```

iframe 加载后用 `postMessage` 发送 token：

```js
iframe.contentWindow.postMessage({ type: 'sso_token', token: '<JWT>' }, '*')
```

## SSO Token 生成（友方侧 Node.js）

```js
const crypto = require('crypto')

const SSO_SECRET = '线下约定的共享密钥'

function signJWT(secret, payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 5 * 60 * 1000 })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

const token = signJWT(SSO_SECRET, {
  account: 'user@clawow',      // 必填
  name: '张三',                  // 必填
  phone: '13800000000',        // 可选
  company: 'ClaWOW',           // 可选
  category: '电商',             // 可选
  clawowAccountId: 'xxx'       // 可选
})
```

## Token 规范

| 项 | 值 |
|---|-----|
| 算法 | HMAC-SHA256 |
| 有效期 | 签发后 5 分钟 |
| 必填字段 | account, name |
| 可选字段 | phone, company, category, clawowAccountId |

## 注意事项

- Electron webview 每次新开会丢失 localStorage，每次加载 iframe 重新传 token 即可
- 推荐用 postMessage 而非 URL query（避免 token 进历史/Referer）
- SSO 共享密钥线下约定，不入代码库
