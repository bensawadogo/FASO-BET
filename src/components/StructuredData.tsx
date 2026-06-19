export function SiteStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://fasobet.com/#website",
        "url": "https://fasobet.com",
        "name": "FasoBet",
        "description":
          "Plateforme de prédictions IA pour la Coupe du Monde 2026",
        "inLanguage": "fr",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate":
              "https://fasobet.com/?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://fasobet.com/#organization",
        "name": "FasoBet",
        "url": "https://fasobet.com",
        "description":
          "Service d'analyse et de prédictions IA pour les paris sportifs en Afrique de l'Ouest",
        "areaServed": [
          "BF", "SN", "CI", "ML", "GN", "NE", "TG", "BJ",
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type MatchData = {
  id: number | string
  home_team: string
  away_team: string
  kickoff_utc?: string
  predicted_outcome?: string
  probability?: number
}

export function MatchPredictionStructuredData({
  match,
}: {
  match: MatchData
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.home_team} vs ${match.away_team}`,
    startDate: match.kickoff_utc,
    sport: "Football",
    homeTeam: { "@type": "SportsTeam", name: match.home_team },
    awayTeam: { "@type": "SportsTeam", name: match.away_team },
    description: match.predicted_outcome
      ? `Prédiction FasoBet : ${match.predicted_outcome} (${match.probability}% de confiance)`
      : `Analyse IA FasoBet pour ${match.home_team} - ${match.away_team}`,
    url: `https://fasobet.com/match/${match.id}`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
