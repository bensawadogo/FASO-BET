import { useMemo, useState, useEffect } from 'react'
import { COUNTRY_FLAGS, getFlagUrl } from '@/lib/country-flags'

type LogoMetadata = {
  [teamName: string]: {
    slug: string
    local_path: string
    status: string
  }
}

let metadataCache: LogoMetadata | null = null

async function loadMetadata(): Promise<LogoMetadata> {
  if (metadataCache) return metadataCache
  try {
    const res = await fetch('/logos/metadata.json?_=' + Date.now())
    if (res.ok) {
      const data: LogoMetadata = await res.json()
      metadataCache = data
      return data
    }
  } catch {}
  return {}
}

export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(fc|sc|ac|us|as|bfa|uca|usfa|association sportive)\b/g, "")
    .replace(/[\s\-\.'\/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

const TEAM_ALIASES: Record<string, string> = {
  "psg":               "paris_saint-germain",
  "paris sg":          "paris_saint-germain",
  "paris saint germain": "paris_saint-germain",
  "man city":          "manchester_city",
  "man utd":           "manchester_united",
  "man united":        "manchester_united",
  "spurs":             "tottenham_hotspur",
  "barca":             "fc_barcelona",
  "barcelona":         "fc_barcelona",
  "fcb":               "fc_barcelona",
  "inter":             "inter_milan",
  "atletico":          "atletico_madrid",
  "lyon":              "olympique_lyonnais",
  "ol":                "olympique_lyonnais",
  "marseille":         "olympique_de_marseille",
  "om":                "olympique_de_marseille",
  "asfa":              "asfa_yennenga",
  "as douanes":        "as_douanes",
  "as_douanes":        "as_douanes",
  "etoile":            "etoile_filante",
  "etoile filante":    "etoile_filante",
  "salitas":           "salitas_fc",
  "rail club":         "rail_club_du_kadiogo",
  "tp mazembe":        "tp_mazembe",
  "al ahly":           "al_ahly",
  "zamalek":           "zamalek",
  "raja":              "raja_casablanca",
  "wydad":             "wydad_ac",
  "esperance":         "esperance_sportive",
  "club africain":     "club_africain",
  "mamelodi":          "mamelodi_sundowns",
  "mamelodi sundowns": "mamelodi_sundowns",
}

export function useTeamLogo(teamName: string): string {
  const [metadata, setMetadata] = useState<LogoMetadata>({})

  useEffect(() => {
    loadMetadata().then((data) => {
      setMetadata(data)
    })
  }, [])

  return useMemo(() => {
    if (!teamName) return "/logos/default.png"

    const normalized = normalizeTeamName(teamName)

    // 0. Check flagcdn for national teams FIRST
    const flagUrl = getFlagUrl(teamName)
    if (flagUrl) return flagUrl

    // 1. Check alias
    const aliasKey = Object.keys(TEAM_ALIASES).find(
      k => normalizeTeamName(k) === normalized
    )
    if (aliasKey) {
      const slug = TEAM_ALIASES[aliasKey]
      return `/logos/teams/${slug}.png`
    }

    // 2. Direct slug match in metadata
    const directMatch = Object.values(metadata).find(
      v => v.slug === normalized
    )
    if (directMatch?.local_path) return directMatch.local_path

    // 3. Partial match
    const partialMatch = Object.keys(metadata).find(k => {
      const kNorm = normalizeTeamName(k)
      return kNorm.includes(normalized) || normalized.includes(kNorm)
    })
    if (partialMatch) return metadata[partialMatch].local_path

    return "/logos/default.png"
  }, [teamName, metadata])
}

export function getTeamLogoPath(teamName: string): string {
  const flagUrl = getFlagUrl(teamName)
  if (flagUrl) return flagUrl

  const normalized = normalizeTeamName(teamName)
  const aliasKey = Object.keys(TEAM_ALIASES).find(
    k => normalizeTeamName(k) === normalized
  )
  if (aliasKey) {
    const slug = TEAM_ALIASES[aliasKey]
    return `/logos/teams/${slug}.png`
  }

  return "/logos/default.png"
}
