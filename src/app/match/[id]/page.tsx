import { Metadata } from "next";
import { apiClient } from "@/lib/api-client";
import { MatchDetailClient } from "./MatchDetailClient";
import { getMockMatchDetail, MatchDetail } from "@/lib/match-mock";
import { Match } from "@/types/django-models";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Match — FasoBet`,
    description: "Analyse IA pour ce match",
  };
}

interface H2HRecord {
  date: string;
  home: string;
  away: string;
  score: string;
  winner: "home" | "away" | "draw";
}

function getH2HData(match: Match, matchData: any): H2HRecord[] {
  const homeTeam = typeof match.teamA === "number" ? `Équipe ${match.teamA}` : String(match.teamA);
  const awayTeam = typeof match.teamB === "number" ? `Équipe ${match.teamB}` : String(match.teamB);

  const apiH2H = matchData?.h2h;
  if (apiH2H && Array.isArray(apiH2H) && apiH2H.length > 0) {
    return apiH2H;
  }

  return [
    { date: "12/01/2025", home: homeTeam, away: awayTeam, score: "2-1", winner: "home" },
    { date: "05/08/2024", home: awayTeam, away: homeTeam, score: "0-0", winner: "draw" },
    { date: "15/03/2024", home: homeTeam, away: awayTeam, score: "1-3", winner: "away" },
  ];
}

function mapMatchToDetail(match: Match, matchId: string, matchData?: any): MatchDetail {
  const h2hRecords = getH2HData(match, matchData);

  return {
    match_id: matchId,
    home: String(match.teamA),
    away: String(match.teamB),
    competition: match.league || "",
    date: match.date || "",
    venue: "",
    prediction: "N/A",
    confidence: 0,
    stability: "N/A",
    volatility: "N/A",
    risk: "N/A",
    prob_home: 0,
    prob_draw: 0,
    prob_away: 0,
    reasons: [],
    agent_insights: [],
    h2h: h2hRecords.map((r) => ({
      match: `${r.home} vs ${r.away}`,
      score: r.score,
      date: r.date,
      winner: r.winner,
    })),
  };
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const { id } = params;
  let matchData: MatchDetail | null = null;

  // Direct mock for demo IDs — no API call needed
  if (id.startsWith("match_demo_")) {
    matchData = getMockMatchDetail(id);
  } else {
    try {
      const res = await apiClient.fastApiClient.getMatchById(id);
      if (res.success && res.data) {
        matchData = mapMatchToDetail(res.data, id, res.data);
      }
    } catch {
      // API indisponible — fallback mock
    }

    // Fallback mock
    if (!matchData) {
      matchData = getMockMatchDetail(id);
    }
  }

  return <MatchDetailClient matchId={id} initialData={matchData} />;
}