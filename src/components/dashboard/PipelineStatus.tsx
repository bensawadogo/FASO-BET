"use client";

import React from 'react';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface PipelineStatusProps {
  agentId: string;
  name: string;
  data: {
    status: 'active' | 'processing' | 'pending' | 'error';
    latency?: string;
    progress?: number;
    models?: string;
    message?: string;
  };
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'active': return 'text-primary border-primary/20 bg-primary/5';
    case 'processing': return 'text-secondary border-secondary/20 bg-secondary/5';
    case 'error': return 'text-error border-error/20 bg-error/5';
    default: return 'text-on-surface-variant border-outline-variant/10 bg-surface-container-high';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <CheckCircle2 className="w-4 h-4 animate-pulse" />;
    case 'processing': return <Clock className="w-4 h-4 animate-spin-slow" />;
    case 'error': return <AlertCircle className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

export function PipelineStatus({ agentId, name, data }: PipelineStatusProps) {
  const styles = getStatusStyles(data.status);
  
  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${styles}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="font-data-label text-[10px] opacity-50">AGENT {agentId}</span>
          <h3 className="font-display-lg text-sm uppercase tracking-wider">{name}</h3>
        </div>
        {getStatusIcon(data.status)}
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <p className="font-bold text-xs uppercase">{data.status}</p>
          {data.message && <p className="font-data-label text-[10px] opacity-70 mt-1">{data.message}</p>}
        </div>
        <div className="text-right">
          {data.latency && (
            <p className="font-data-label text-[10px] uppercase">
              Latency: <span className="font-bold">{data.latency}</span>
            </p>
          )}
          {data.models && (
            <p className="font-data-label text-[10px] uppercase">
              Models: <span className="font-bold">{data.models}</span>
            </p>
          )}
        </div>
      </div>
      
      {data.progress !== undefined && (
        <div className="mt-3 w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
          <div 
            className="bg-current h-full transition-all duration-500" 
            style={{ width: `${data.progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}