import { NextResponse } from "next/server";
import { getHistoricalContext } from "@/data/feature-store";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h

export async function GET() {
  try {
    const context = await getHistoricalContext();
    if (!context) {
      return NextResponse.json(
        {
          status: "no_data",
          message:
            "Fichiers de données historiques introuvables. Placez progress.csv et allMatches.xlsx dans le dossier data/.",
        },
        { status: 200 }
      );
    }

    // Agréger les progress par mois pour les graphiques
    const monthlyProgress = aggregateMonthly(context.progress);

    // Top ligues par nombre de matchs
    const topLeagues = context.leaguePriors.slice(0, 15);

    // Top calibrations par volume
    const topCalibrations = context.marketCalibrations
      .filter((c) => c.sampleCount > 100)
      .slice(0, 20);

    return NextResponse.json({
      status: "success",
      summary: {
        totalMatches: context.leaguePriors.reduce(
          (acc, l) => acc + l.matchCount,
          0
        ),
        totalLeagues: context.leaguePriors.length,
        totalCalibrations: context.marketCalibrations.length,
        dateRange: {
          from: context.progress[0]?.date ?? "N/A",
          to: context.progress[context.progress.length - 1]?.date ?? "N/A",
        },
        lastUpdated: context.lastUpdated,
      },
      monthlyProgress,
      topLeagues,
      topCalibrations,
    });
  } catch (e) {
    console.error("[Historical API] Error:", e);
    return NextResponse.json(
      {
        status: "error",
        message: e instanceof Error ? e.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

function aggregateMonthly(
  progress: { date: string; bankersPercent: number; allMatchesPercent: number }[]
) {
  const months = new Map<
    string,
    { total: number; count: number; bankersSum: number; allSum: number }
  >();

  for (const row of progress) {
    const month = row.date.slice(0, 7); // "YYYY-MM"
    if (!months.has(month)) {
      months.set(month, {
        total: 0,
        count: 0,
        bankersSum: 0,
        allSum: 0,
      });
    }
    const m = months.get(month)!;
    m.count++;
    m.bankersSum += row.bankersPercent;
    m.allSum += row.allMatchesPercent;
  }

  return Array.from(months.entries())
    .map(([month, m]) => ({
      month,
      bankersAvg: Math.round((m.bankersSum / m.count) * 10) / 10,
      allAvg: Math.round((m.allSum / m.count) * 10) / 10,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
