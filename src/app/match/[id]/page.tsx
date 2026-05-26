import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { MatchDetailClient, getMockMatchDetail, MatchDetail } from "./MatchDetailClient";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const { id } = params;
  let matchData: MatchDetail | null = null;

  try {
    const res = await apiClient.fastApiClient.getMatchById(id);
    if (res.success && res.data) {
      // Assumer que la forme renvoyée correspond à MatchDetail
      matchData = res.data as unknown as MatchDetail;
    }
  } catch {
    // ignore, on traitera plus bas
  }

  if (!matchData && process.env.NODE_ENV === "development") {
    matchData = getMockMatchDetail(id);
  }

  if (!matchData) {
    notFound();
  }

  return <MatchDetailClient matchId={id} initialData={matchData} />;
}