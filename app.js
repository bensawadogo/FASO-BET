const AI = {
  async callGemini(matchInfo, skillContent) {
    const response = await fetch(
      `${CONFIG.AI.gemini.url}?key=${CONFIG.KEYS.gemini}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: skillContent }] },
          contents: [{ parts: [{ text: matchInfo }] }],
          generationConfig: { 
            temperature: CONFIG.AI.gemini.temperature, 
            maxOutputTokens: CONFIG.AI.gemini.maxTokens 
          }
        })
      }
    );
    if (!response.ok) throw new Error("Erreur HTTP Gemini");
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  },

  async callGroq(matchInfo, skillContent) {
    const response = await fetch(
      CONFIG.AI.groq.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CONFIG.KEYS.groq}`
        },
        body: JSON.stringify({
          model: CONFIG.AI.groq.model,
          temperature: CONFIG.AI.groq.temperature,
          max_tokens: CONFIG.AI.groq.maxTokens,
          messages: [
            { role: "system", content: skillContent },
            { role: "user", content: matchInfo }
          ]
        })
      }
    );
    if (!response.ok) throw new Error("Erreur HTTP Groq");
    const data = await response.json();
    return data.choices[0].message.content;
  }
};

const App = {
  skillContent: "",

  async init() {
    console.log("[APP] Initialisation...");
    // Charger le SKILL.md
    try {
      const res = await fetch("ia-paris-sportif-SKILL.md");
      this.skillContent = await res.text();
      console.log("[APP] SKILL.md chargé");
    } catch(e) {
      console.error("[APP] Erreur chargement SKILL.md");
    }

    // Charger les matchs par défaut
    this.loadLeagues();
    UI.init();
  },

  loadLeagues() {
    const container = document.getElementById("leagues-filter");
    if (!container) return;
    Object.keys(CONFIG.LEAGUES).forEach(key => {
      const l = CONFIG.LEAGUES[key];
      const btn = document.createElement("button");
      btn.className = "league-filter-btn";
      btn.innerHTML = `${l.flag} ${l.name}`;
      btn.onclick = () => {
        document.querySelectorAll(".league-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.loadFixtures(l.id);
      };
      if (key === CONFIG.UI.defaultLeague) btn.classList.add("active");
      container.appendChild(btn);
    });
    this.loadFixtures(CONFIG.LEAGUES[CONFIG.UI.defaultLeague].id);
  },

  async loadFixtures(leagueId) {
    const grid = document.getElementById("matches-grid");
    grid.innerHTML = '<div class="loader-small"></div>';
    try {
      const data = await FootballAPI.getFixtures(leagueId);
      grid.innerHTML = "";
      if (!data.response?.length) {
        console.log("[APP] Aucun match réel (Plan Gratuit), affichage du match de test.");
        const testMatch = {
          fixture: { id: 0 },
          league: { id: 2, name: "Ligue des Champions (DEMO)", logo: "https://media.api-sports.io/football/leagues/2.png" },
          teams: {
            home: { id: 85, name: "Paris Saint-Germain", logo: "https://media.api-sports.io/football/teams/85.png" },
            away: { id: 541, name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }
          }
        };
        this.renderMatchCard(testMatch, grid);
        return;
      }
      data.response.forEach(match => this.renderMatchCard(match, grid));
    } catch(e) {
      grid.innerHTML = "<p>Erreur chargement matchs.</p>";
    }
  },

  renderMatchCard(match, container) {
    const card = document.createElement("div");
    card.className = "match-card glass-card";
    card.innerHTML = `
      <div class="match-header">
        <img src="${match.league.logo}" class="league-logo-small" onerror="this.src='placeholder.png'">
        <span>${match.league.name}</span>
      </div>
      <div class="match-teams">
        <div class="team">
          <img src="${match.teams.home.logo}" class="team-logo" onerror="this.src='placeholder.png'">
          <span>${match.teams.home.name}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <img src="${match.teams.away.logo}" class="team-logo" onerror="this.src='placeholder.png'">
          <span>${match.teams.away.name}</span>
        </div>
      </div>
      <button class="analyze-btn" onclick="App.analyzeMatch('${match.teams.home.name.replace(/'/g, "\\'")}', '${match.teams.away.name.replace(/'/g, "\\'")}', ${match.teams.home.id}, ${match.teams.away.id}, ${match.league.id})">
        🚀 ANALYSER CE MATCH
      </button>
    `;
    container.appendChild(card);
  },

  async analyzeMatch(homeTeam, awayTeam, homeId, awayId, leagueId) {
    // ── ÉTAPE 1 : VRAIES DONNÉES D'ABORD ──
    document.getElementById("loader-text").textContent = CONFIG.UI.loaderMessages[0];
    document.getElementById("loader").style.display = "block";
    document.getElementById("results").innerHTML = "";
    document.getElementById("results").scrollIntoView({ behavior: 'smooth' });

    const [h2h, homeStats, awayStats] = await Promise.allSettled([
      withFallback(() => FootballAPI.getH2H(homeId, awayId)),
      withFallback(() => FootballAPI.getTeamStats(homeId, leagueId)),
      withFallback(() => FootballAPI.getTeamStats(awayId, leagueId))
    ]);

    // ── ÉTAPE 2 : STRUCTURER ──
    const formatStats = (r) => {
      const s = r?.value?.response;
      if (!s) return "stats indisponibles";
      return `
        Bilan: ${s.fixtures?.wins?.total}V ${s.fixtures?.draws?.total}N ${s.fixtures?.loses?.total}D
        Buts marqués: ${s.goals?.for?.total?.total}
        Buts encaissés: ${s.goals?.against?.total?.total}
        Clean sheets: ${s.clean_sheet?.total}
        Forme DOM: ${s.fixtures?.wins?.home}V ${s.fixtures?.draws?.home}N ${s.fixtures?.loses?.home}D
        Forme EXT: ${s.fixtures?.wins?.away}V ${s.fixtures?.draws?.away}N ${s.fixtures?.loses?.away}D
      `;
    };

    const formatH2H = (r) => {
      const matches = r?.value?.response;
      if (!matches?.length) return "H2H indisponible";
      return matches.slice(0, 5).map(f =>
        `${f.fixture.date.split("T")[0]} — ${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`
      ).join("\n");
    };

    // ── ÉTAPE 3 : PROMPT ENRICHI ──
    const enrichedPrompt = `
MATCH : ${homeTeam} vs ${awayTeam}

═══ DONNÉES RÉELLES API-FOOTBALL ═══

📊 STATS ${homeTeam} :
${formatStats(homeStats)}

📊 STATS ${awayTeam} :
${formatStats(awayStats)}

🔄 H2H (5 derniers matchs) :
${formatH2H(h2h)}

═══ FIN DONNÉES RÉELLES ═══

Analyse ce match selon le SKILL.md.
Utilise UNIQUEMENT ces données réelles.
Ne jamais inventer de statistiques.
    `;

    // ── ÉTAPE 4 : APPEL IA ──
    document.getElementById("loader-text").textContent = "🤖 Gemini + ⚡ Groq analysent...";

    const [gemini, groq] = await Promise.allSettled([
      AI.callGemini(enrichedPrompt, this.skillContent),
      AI.callGroq(enrichedPrompt, this.skillContent)
    ]);

    console.log("[GEMINI] Prompt reçu avec vraies données");
    console.log("[GROQ] Prompt reçu avec vraies données");

    // ── ÉTAPE 5 : AFFICHAGE ──
    document.getElementById("loader").style.display = "none";

    const geminiText = gemini.value || "❌ Gemini indisponible";
    const groqText   = groq.value   || "❌ Groq indisponible";
    
    // Simple consensus check (improved logic compared to exact guide)
    const g = geminiText.toUpperCase();
    const q = groqText.toUpperCase();
    const agree = (g.includes("VALUE BET") && q.includes("VALUE BET")) || (g.includes("ÉVITER") && q.includes("ÉVITER"));

    document.getElementById("results").innerHTML = `
      <div class="ai-results">
        <div class="ai-card gemini">
          <h3>🤖 GEMINI</h3>
          <pre>${geminiText}</pre>
        </div>
        <div class="ai-card groq">
          <h3>⚡ GROQ</h3>
          <pre>${groqText}</pre>
        </div>
      </div>
      <div class="consensus-box ${agree ? "strong" : "weak"}">
        <h3>🏆 CONSENSUS</h3>
        <p>${agree
          ? "✅✅ Les deux IA sont d'accord — SIGNAL TRÈS FORT"
          : "⚠️ Les deux IA divergent — PRUDENCE"
        }</p>
      </div>
    `;
  }
};

window.addEventListener("DOMContentLoaded", () => App.init());
