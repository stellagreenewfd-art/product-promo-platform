// server/data-store.js
// Enhanced data store for SSO usage tracking
// Extends the global `data` object to track loginCount / analysisCount per user

module.exports = {
  /**
   * Increment login count for a given account.
   * @param {object} data - The global data object
   * @param {string} account - User account name
   */
  incrementLogin(data, account) {
    const user = data.users.find(u => u.account === account)
    if (user) {
      user.loginCount = (user.loginCount || 0) + 1
      user.lastLogin = new Date().toISOString()
    }
  },

  /**
   * Increment analysis count for a given account.
   * @param {object} data - The global data object
   * @param {string} account - User account name
   */
  incrementAnalysis(data, account) {
    const user = data.users.find(u => u.account === account)
    if (user) {
      user.analysisCount = (user.analysisCount || 0) + 1
    }
  },

  /**
   * Build usage stats for the GET /api/usage endpoint.
   * @param {object} data - The global data object
   * @returns {object[]} Array of usage entries
   */
  buildUsageStats(data) {
    return data.users.map(u => ({
      account: u.account,
      name: u.name || '',
      phone: u.phone || '',
      company: u.company || '',
      loginCount: u.loginCount || 0,
      analysisCount: u.analysisCount || 0,
      lastLogin: u.lastLogin || u.createdAt || '',
      createdAt: u.createdAt || '',
    }))
  }
}
