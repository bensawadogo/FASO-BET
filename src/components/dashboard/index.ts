/**
 * Dashboard — Barrel export
 * Réexporte les composants du dossier dashboard/ pour les imports depuis '@/components/dashboard'
 */

export { DashboardLoading, DashboardError, DashboardEmpty, AgentTimeout, OfflineStatus } from "./DashboardStates";
export { HistoricalDashboard } from "./HistoricalDashboard";
export { PipelineStatus } from "./PipelineStatus";
export { MatchCard, type MatchCardPrediction } from "./MatchCard";
export { SignalBadge } from "./SignalBadge";
export { ConnectedComboBuilder, useComboActions } from "./ComboBuilder";
export { CouponDrawer, type CouponLeg } from "../CouponDrawer";
