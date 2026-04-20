const CacheManager = {
  TTL: {
    fixtures:  1800000,
    standings: 3600000,
    stats:     7200000,
    logos:     86400000
  },

  set(key, data, ttl) {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        expires: Date.now() + ttl
      }));
    } catch(e) {
      console.error("[CACHE] Erreur écriture:", e.message);
    }
  },

  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch(e) {
      return null;
    }
  },

  async fetch(url, ttl, headers = {}) {
    const cached = this.get(url);
    if (cached) {
      console.log("[CACHE] Hit:", url);
      return cached;
    }
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.set(url, data, ttl);
      console.log("[CACHE] Stocké:", url);
      return data;
    } catch(err) {
      console.error("[CACHE] Fetch échoué:", err.message);
      throw err;
    }
  }
};
