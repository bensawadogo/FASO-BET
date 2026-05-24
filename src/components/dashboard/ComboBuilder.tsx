"use client";

import React, { useState, useCallback } from 'react';
import { X, TrendingUp, Trophy } from 'lucide-react';
import type { MatchCardPrediction } from './MatchCard';

// Define a minimal combo item type compatible with the existing one
export interface ComboItem {
  id: string;
  match_label: string;
  selection: string;
  odds: number;
  confidence: number;
}

interface ComboBuilderProps {
  combos?: any[];
}

export function ComboBuilder({ combos }: ComboBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>([]);

  const addPrediction = useCallback((prediction: MatchCardPrediction) => {
    setItems(prev => {
      // Éviter les doublons
      if (prev.some(item => item.id === prediction.match_id)) return prev;
      return [
        ...prev,
        {
          id: prediction.match_id,
          match_label: `${prediction.home} vs ${prediction.away}`,
          selection: prediction.selection,
          odds: prediction.min_odds,
          confidence: prediction.confidence,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const removeByMatchId = useCallback((matchId: string) => {
    setItems(prev => prev.filter(item => item.id !== matchId));
  }, []);

  const isInCombo = useCallback(
    (matchId: string) => items.some(item => item.id === matchId),
    [items]
  );

  const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
  const potentialGain = totalOdds * 1000;
  const potentialGain5000 = totalOdds * 5000;

  return (
    <>
      {/* Floating Combo Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-primary text-surface rounded-full w-16 h-16 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all hover:scale-105 flex items-center justify-center group"
          title={isOpen ? 'Fermer le constructeur de combo' : 'Ouvrir le constructeur de combo'}
          aria-label={isOpen ? 'Fermer le constructeur de combo' : 'Ouvrir le constructeur de combo'}
        >
          <Trophy className="w-6 h-6" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-in zoom-in">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Combo Slider Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-surface-dim border-t border-outline-variant/20 rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto no-scrollbar">
          <div className="p-6">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="font-display-lg text-headline-sm uppercase text-primary tracking-wider">
                  Combiné
                </h2>
                {items.length > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {items.length} sélection{items.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-surface-container-highest rounded-xl transition-colors"
                title="Fermer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-on-surface-variant/50" />
                </div>
                <p className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest">
                  Aucune sélection
                </p>
                <p className="text-xs text-on-surface-variant/60 max-w-xs mx-auto">
                  Cliquez sur « Ajouter » sur une prédiction Value Bet ou Neutre pour construire votre combiné.
                </p>
              </div>
            ) : (
              <>
                {/* Liste des sélections */}
                <div className="space-y-3 mb-6">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 group/item"
                    >
                      {/* Rang */}
                      <span className="font-data-label text-[10px] text-on-surface-variant/40 w-4">
                        {idx + 1}
                      </span>

                      {/* Infos match */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface font-semibold truncate">
                          {item.match_label}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                          {item.selection}
                        </p>
                      </div>

                      {/* Confiance + Cote */}
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div>
                          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
                            Conf.
                          </p>
                          <p className="text-xs text-on-surface">{item.confidence}%</p>
                        </div>
                        <div>
                          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
                            Cote
                          </p>
                          <p className="text-primary font-bold text-sm">{item.odds.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Bouton retirer */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-surface-container-highest rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                        title={`Retirer ${item.match_label}`}
                        aria-label={`Retirer ${item.match_label}`}
                      >
                        <X className="w-4 h-4 text-on-surface-variant" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Résumé des gains */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-data-label text-data-label text-on-surface-variant uppercase">
                      Cote totale
                    </span>
                    <span className="text-primary font-display-lg text-2xl font-bold">
                      ×{totalOdds.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-container-high rounded-xl p-3">
                      <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
                        Mise 1 000 F
                      </p>
                      <p className="text-success font-bold text-lg">
                        {potentialGain.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                    <div className="bg-surface-container-high rounded-xl p-3">
                      <p className="font-data-label text-[8px] text-on-surface-variant uppercase">
                        Mise 5 000 F
                      </p>
                      <p className="text-success font-bold text-lg">
                        {potentialGain5000.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>

                  <button className="w-full bg-primary text-surface py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-all text-sm hover:scale-[1.02] active:scale-95">
                    Placer le pari combiné
                  </button>
                </div>

                {/* Combos suggérés par le pipeline */}
                {combos && combos.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-data-label text-data-label text-on-surface-variant uppercase mb-4 tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Combos suggérés
                    </h3>
                    <div className="space-y-3">
                      {combos.map((combo, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-primary font-bold">
                              ×{combo.target_multiplier || combo.total_odds?.toFixed(2) || '—'}
                            </span>
                            <span className="font-data-label text-[10px] text-on-surface-variant uppercase">
                              {combo.legs?.length || 0} sélections
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {combo.legs?.slice(0, 4).map((leg: any, i: number) => (
                              <span
                                key={i}
                                className="text-[9px] bg-surface-container-highest/60 px-1.5 py-0.5 rounded"
                              >
                                {leg.match_label?.length > 14
                                  ? leg.match_label.slice(0, 12) + '…'
                                  : leg.match_label || leg.selection}
                              </span>
                            ))}
                            {combo.legs?.length > 4 && (
                              <span className="text-[9px] text-on-surface-variant">
                                +{combo.legs.length - 4}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            Prob. {combo.coupon_probability_pct || 0}% · Mise 1 000 →{' '}
                            {combo.stake_1000_gain?.toLocaleString('fr-FR') || 0} F
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Exposer les fonctions de gestion du combo via un contexte ou export
// Pour permettre l'ajout depuis l'extérieur, on garde une référence singleton
let _addPrediction: ((p: MatchCardPrediction) => void) | null = null;
let _removeByMatchId: ((id: string) => void) | null = null;
let _isInCombo: ((id: string) => boolean) | null = null;

// Hook pour exposer les fonctions de gestion du combo
export function useComboActions() {
  const addToCombo = useCallback((p: MatchCardPrediction) => {
    _addPrediction?.(p);
  }, []);

  const removeFromCombo = useCallback((id: string) => {
    _removeByMatchId?.(id);
  }, []);

  const checkInCombo = useCallback((id: string) => {
    return _isInCombo?.(id) ?? false;
  }, []);

  return { addToCombo, removeFromCombo, checkInCombo };
}

// Version connectée du ComboBuilder avec pont singleton
export function ConnectedComboBuilder({ combos }: ComboBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>([]);

  // Exposer les fonctions via les références singleton
  _addPrediction = useCallback((prediction: MatchCardPrediction) => {
    setItems(prev => {
      if (prev.some(item => item.id === prediction.match_id)) return prev;
      return [
        ...prev,
        {
          id: prediction.match_id,
          match_label: `${prediction.home} vs ${prediction.away}`,
          selection: prediction.selection,
          odds: prediction.min_odds,
          confidence: prediction.confidence,
        },
      ];
    });
  }, []);

  _removeByMatchId = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  _isInCombo = useCallback((id: string) => {
    return items.some(item => item.id === id);
  }, [items]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
  const potentialGain = totalOdds * 1000;
  const potentialGain5000 = totalOdds * 5000;

  return (
    <>
      {/* Floating Combo Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-primary text-surface rounded-full w-16 h-16 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all hover:scale-105 flex items-center justify-center group"
          title={isOpen ? 'Fermer le constructeur de combo' : 'Ouvrir le constructeur de combo'}
          aria-label={isOpen ? 'Fermer le constructeur de combo' : 'Ouvrir le constructeur de combo'}
        >
          <Trophy className="w-6 h-6" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-in zoom-in">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Combo Slider Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-surface-dim border-t border-outline-variant/20 rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto no-scrollbar">
          <div className="p-6">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="font-display-lg text-headline-sm uppercase text-primary tracking-wider">
                  Combiné
                </h2>
                {items.length > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {items.length} sélection{items.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-surface-container-highest rounded-xl transition-colors"
                title="Fermer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-on-surface-variant/50" />
                </div>
                <p className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest">
                  Aucune sélection
                </p>
                <p className="text-xs text-on-surface-variant/60 max-w-xs mx-auto">
                  Cliquez sur « Ajouter » sur une prédiction Value Bet ou Neutre pour construire votre combiné.
                </p>
              </div>
            ) : (
              <>
                {/* Liste des sélections */}
                <div className="space-y-3 mb-6">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 group/item"
                    >
                      <span className="font-data-label text-[10px] text-on-surface-variant/40 w-4">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface font-semibold truncate">
                          {item.match_label}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                          {item.selection}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div>
                          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Conf.</p>
                          <p className="text-xs text-on-surface">{item.confidence}%</p>
                        </div>
                        <div>
                          <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Cote</p>
                          <p className="text-primary font-bold text-sm">{item.odds.toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-surface-container-highest rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                        title={`Retirer ${item.match_label}`}
                        aria-label={`Retirer ${item.match_label}`}
                      >
                        <X className="w-4 h-4 text-on-surface-variant" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Résumé des gains */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-data-label text-data-label text-on-surface-variant uppercase">
                      Cote totale
                    </span>
                    <span className="text-primary font-display-lg text-2xl font-bold">
                      ×{totalOdds.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-container-high rounded-xl p-3">
                      <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Mise 1 000 F</p>
                      <p className="text-success font-bold text-lg">{potentialGain.toLocaleString('fr-FR')} F</p>
                    </div>
                    <div className="bg-surface-container-high rounded-xl p-3">
                      <p className="font-data-label text-[8px] text-on-surface-variant uppercase">Mise 5 000 F</p>
                      <p className="text-success font-bold text-lg">{potentialGain5000.toLocaleString('fr-FR')} F</p>
                    </div>
                  </div>
                  <button className="w-full bg-primary text-surface py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-all text-sm hover:scale-[1.02] active:scale-95">
                    Placer le pari combiné
                  </button>
                </div>

                {/* Combos suggérés par le pipeline */}
                {combos && combos.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-data-label text-data-label text-on-surface-variant uppercase mb-4 tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Combos suggérés
                    </h3>
                    <div className="space-y-3">
                      {combos.map((combo, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-primary font-bold">
                              ×{combo.target_multiplier || combo.total_odds?.toFixed(2) || '—'}
                            </span>
                            <span className="font-data-label text-[10px] text-on-surface-variant uppercase">
                              {combo.legs?.length || 0} sélections
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {combo.legs?.slice(0, 4).map((leg: any, i: number) => (
                              <span key={i} className="text-[9px] bg-surface-container-highest/60 px-1.5 py-0.5 rounded">
                                {leg.match_label?.length > 14 ? leg.match_label.slice(0, 12) + '…' : leg.match_label || leg.selection}
                              </span>
                            ))}
                            {combo.legs?.length > 4 && (
                              <span className="text-[9px] text-on-surface-variant">+{combo.legs.length - 4}</span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            Prob. {combo.coupon_probability_pct || 0}% · Mise 1 000 →{' '}
                            {combo.stake_1000_gain?.toLocaleString('fr-FR') || 0} F
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
