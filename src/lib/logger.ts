/**
 * FasoBet Logger - Logger structuré avec JSON et couleurs
 * BLOC 4 - Remplacement des console.log/warn/error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  module?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[32m',     // Vert
  warn: '\x1b[33m',     // Jaune
  error: '\x1b[31m',    // Rouge
};

const RESET_COLOR = '\x1b[0m';

const currentLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(entry: LogEntry): string {
  const color = LOG_COLORS[entry.level];
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  
  if (typeof window === 'undefined') {
    // SSR / Node.js : couleurs ANSI
    const moduleTag = entry.module ? ` [${entry.module}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data, null, 2)}` : '';
    return `${color}${prefix}${moduleTag} ${entry.message}${dataStr}${RESET_COLOR}`;
  }
  
  // Browser : style CSS
  const moduleTag = entry.module ? ` [${entry.module}]` : '';
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data, null, 2)}` : '';
  return `${prefix}${moduleTag} ${entry.message}${dataStr}`;
}

function createLogEntry(level: LogLevel, message: string, data?: any, module?: string): LogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    data,
    module,
  };
}

export const logger = {
  debug(message: string, data?: any, module?: string) {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, data, module);
    if (typeof window === 'undefined') {
      console.debug(formatMessage(entry));
    } else {
      console.debug(`%c${formatMessage(entry)}`, 'color: #00bcd4', data ?? '');
    }
  },

  info(message: string, data?: any, module?: string) {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, data, module);
    if (typeof window === 'undefined') {
      console.info(formatMessage(entry));
    } else {
      console.info(`%c${formatMessage(entry)}`, 'color: #4caf50', data ?? '');
    }
  },

  warn(message: string, data?: any, module?: string) {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, data, module);
    if (typeof window === 'undefined') {
      console.warn(formatMessage(entry));
    } else {
      console.warn(`%c${formatMessage(entry)}`, 'color: #ff9800', data ?? '');
    }
  },

  error(message: string, data?: any, module?: string) {
    if (!shouldLog('error')) return;
    const entry = createLogEntry('error', message, data, module);
    if (typeof window === 'undefined') {
      console.error(formatMessage(entry));
    } else {
      console.error(`%c${formatMessage(entry)}`, 'color: #f44336', data ?? '');
    }
  },
};

export default logger;
