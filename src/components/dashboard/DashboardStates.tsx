import React from 'react';
import { AlertTriangle, WifiOff, Database, Loader2, SearchX } from 'lucide-react';

interface StateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

// 1. Loading State
export const DashboardLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in duration-500">
    <div className="relative">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
    </div>
    <div className="text-center">
      <h3 className="font-display-lg text-xl uppercase text-primary tracking-widest">Initialisation du moteur</h3>
      <p className="text-on-surface-variant mt-1">Synchronisation avec le pipeline de données...</p>
    </div>
  </div>
);

// 2. Error State (Global)
export const DashboardError = ({ title = "Panne système", message, onRetry }: StateProps) => (
  <div className="bg-error-container/10 border border-error/20 rounded-3xl p-8 text-center space-y-4 my-8">
    <div className="bg-error/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,84,84,0.3)]">
      <AlertTriangle className="text-error w-8 h-8" />
    </div>
    <div>
      <h3 className="font-display-lg text-2xl uppercase text-error">{title}</h3>
      <p className="text-on-surface-variant mt-2 max-w-md mx-auto">{message}</p>
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="px-8 py-3 bg-error text-on-error rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition-all"
      >
        Redémarrer le moteur
      </button>
    )}
  </div>
);

// 3. Empty State
export const DashboardEmpty = ({ message = "Aucun signal à haute probabilité détecté pour les filtres actuels." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-outline-variant/10 rounded-3xl opacity-60 text-center">
    <SearchX className="w-16 h-16 text-on-surface-variant mb-4" />
    <p className="text-on-surface-variant">{message}</p>
    <button className="mt-4 text-primary font-bold hover:underline">Effacer tous les filtres</button>
  </div>
);

// 4. Partial Failure / Agent Timeout
export const AgentTimeout = ({ agentName }: { agentName: string }) => (
  <div className="flex items-center gap-4 p-4 bg-surface-container-high border-l-4 border-warning rounded-r-xl">
    <div className="bg-warning/10 p-2 rounded-lg">
      <Database className="text-warning w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="font-data-label text-[10px] text-warning uppercase">Intégrité partielle des données</p>
      <p className="text-sm text-on-surface-variant">Agent <strong>{agentName}</strong> a expiré. Utilisation des modèles en cache.</p>
    </div>
  </div>
);

// 5. Offline / Degraded Cache
export const OfflineStatus = () => (
  <div className="fixed bottom-24 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-50 animate-in slide-in-from-bottom-10">
    <div className="bg-surface-dim border border-outline-variant/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
      <div className="bg-surface-container-highest p-3 rounded-xl animate-pulse">
        <WifiOff className="text-on-surface-variant w-6 h-6" />
      </div>
      <div>
        <p className="font-bold text-on-surface">Mode hors ligne</p>
        <p className="text-xs text-on-surface-variant">Affichage des données en cache</p>
      </div>
    </div>
  </div>
);