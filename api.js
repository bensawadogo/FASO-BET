const FootballAPI = {

  headers: {
    "x-apisports-key": CONFIG.KEYS.apiFootball || ""
  },

  async getFixtures(leagueId, season = 2025) {
    const today = new Date().toISOString().split("T")[0];
    const url = `${CONFIG.FOOTBALL_API.baseUrl}/fixtures?league=${leagueId}&date=${today}&season=${season}`;
    const data = await CacheManager.fetch(url, CacheManager.TTL.fixtures, this.headers);
    console.log("[API-FOOTBALL] Fixtures chargées:", data?.response?.length, "matchs");
    return data;
  },

  async getH2H(team1Id, team2Id) {
    const url = `${CONFIG.FOOTBALL_API.baseUrl}/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=5`;
    const data = await CacheManager.fetch(url, CacheManager.TTL.stats, this.headers);
    console.log("[API-FOOTBALL] H2H récupéré:", data?.response?.length, "matchs");
    return data;
  },

  async getTeamStats(teamId, leagueId, season = 2025) {
    const url = `${CONFIG.FOOTBALL_API.baseUrl}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`;
    const data = await CacheManager.fetch(url, CacheManager.TTL.stats, this.headers);
    console.log("[API-FOOTBALL] Stats équipe récupérées:", teamId);
    return data;
  },

  async getStandings(leagueId, season = 2025) {
    const url = `${CONFIG.FOOTBALL_API.baseUrl}/standings?league=${leagueId}&season=${season}`;
    const data = await CacheManager.fetch(url, CacheManager.TTL.standings, this.headers);
    console.log("[API-FOOTBALL] Classement récupéré:", leagueId);
    return data;
  }
};

const withFallback = async (fn, fallback = "⚠️ Données temporairement indisponibles") => {
  try {
    return await fn();
  } catch(err) {
    console.error("[API ERROR]", err.message);
    return { error: true, message: fallback };
  }
};
