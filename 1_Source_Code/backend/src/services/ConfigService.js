const db = require('../config/database');

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.lastFetched = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  async fetchAllConfigs() {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.lastFetched < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const rows = await db.query(
        'SELECT config_key, config_value FROM system_config',
        { type: db.QueryTypes.SELECT }
      );

      this.cache.clear();
      rows.forEach(row => {
        this.cache.set(row.config_key, row.config_value);
      });
      this.lastFetched = now;
      return this.cache;
    } catch (error) {
      console.error('Error fetching system configs:', error);
      return this.cache; // return stale cache if db fails
    }
  }

  async getConfig(key, defaultValue = null) {
    await this.fetchAllConfigs();
    return this.cache.has(key) ? this.cache.get(key) : defaultValue;
  }

  /**
   * Helper to parse a "HH:MM" or "HH:MM:SS" time string to total minutes from midnight.
   */
  timeStringToMinutes(timeStr, defaultMinutes = 0) {
    if (!timeStr || typeof timeStr !== 'string') return defaultMinutes;
    const parts = timeStr.split(':');
    if (parts.length < 2) return defaultMinutes;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return defaultMinutes;
    return hours * 60 + minutes;
  }
}

// Export a singleton instance
module.exports = new ConfigService();
