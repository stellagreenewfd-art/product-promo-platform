// src/embed.js
// Embed mode flag — activated by ?embed=1 query param
// No business logic changes; only sets body class + window flag

export function initEmbedMode() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('embed')) {
    document.body.classList.add('embed-mode')
    window.__EMBED__ = true

    // Deep link support (task 6)
    const caseId = params.get('caseId')
    const view = params.get('view')
    if (caseId) window.__EMBED_DEEP_LINK__ = { caseId }
    else if (view) window.__EMBED_DEEP_LINK__ = { view }
  }
}
