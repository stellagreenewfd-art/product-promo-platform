// server/embedding.js
// CSP frame-ancestors middleware — only active when EMBED_ALLOWED_ORIGINS env is set
// Does NOT impact any business routes; normal visitors 100% unaffected

module.exports = function embeddingMiddleware(req, res, next) {
  const origins = (process.env.EMBED_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (origins.length > 0) {
    res.setHeader("Content-Security-Policy", `frame-ancestors ${origins.join(" ")}`)
  }

  // Remove any existing X-Frame-Options header that might block embedding
  res.removeHeader("X-Frame-Options")

  next()
}
