/**
 * Configuration centralisée pour les services
 * Centralise toutes les constantes et configurations
 */

export const CONFIG = {
  // Configuration JWT
  JWT: {
    SECRET: process.env.JWT_SECRET || 'crypto-agent-secret-key-2025',
    EXPIRES_IN: '24h',
  },

  // Configuration Admin
  ADMIN: {
    USERNAME: 'soule_akim@yahoo.fr',
    PASSWORD: 'akimsoule', // En production, utiliser des variables d'environnement
    ID: 'admin',
    ROLE: 'admin',
  },

  // Configuration CORS
  CORS: {
    ORIGIN: '*',
    HEADERS: 'Content-Type, Authorization',
    METHODS: 'GET, POST, PUT, DELETE, OPTIONS',
  },

  // Configuration des services
  SERVICES: {
    SOCIAL_MEDIA: {
      GEM_SCORE_THRESHOLD: 80,
      PRICE_CHANGE_THRESHOLD: 25,
      AUTO_POST: true,
    },
    
    NEWSLETTER: {
      DEFAULT_SOURCE: 'website',
      DEFAULT_PAGE_SIZE: 50,
      MAX_PAGE_SIZE: 100,
    },

    FACEBOOK: {
      DEFAULT_GEM_SCORE_THRESHOLD: 60,
      DEFAULT_PRICE_CHANGE_THRESHOLD: 10,
    },
  },

  // Configuration Cron
  CRON: {
    SCHEDULES: {
      GEM_HUNTER: '0 */6 * * *',        // Toutes les 6 heures
      FACEBOOK_POSTS: '0 */8 * * *',    // Toutes les 8 heures
      INVESTOR_WATCH: '0 */4 * * *',    // Toutes les 4 heures
      MONITORING: '0 */2 * * *',        // Toutes les 2 heures
      NEWSLETTER: '0 9 * * 1',          // Tous les lundis à 9h
      CLEANUP: '0 2 * * 0',             // Tous les dimanches à 2h
    },
  },

  // Configuration des erreurs
  ERRORS: {
    MESSAGES: {
      INTERNAL_SERVER: 'Erreur interne du serveur',
      UNAUTHORIZED: 'Non autorisé',
      VALIDATION: 'Données invalides',
      NOT_FOUND: 'Ressource non trouvée',
      METHOD_NOT_ALLOWED: 'Méthode non autorisée',
      MISSING_TOKEN: 'Token manquant ou format incorrect',
      INVALID_TOKEN: 'Token invalide ou expiré',
      MISSING_CREDENTIALS: 'Username et password requis',
      INVALID_CREDENTIALS: 'Identifiants incorrects',
      EMAIL_REQUIRED: 'Email requis',
      EMAIL_INVALID: 'Format d\'email invalide',
      EMAIL_ALREADY_SUBSCRIBED: 'Cet email est déjà abonné à la newsletter',
      EMAIL_NOT_FOUND: 'Email non trouvé dans nos abonnements',
    },
  },

  // Configuration base de données
  DATABASE: {
    DISCONNECT_TIMEOUT: 5000, // 5 secondes
    RETRY_ATTEMPTS: 3,
  },

  // Configuration validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MIN_PASSWORD_LENGTH: 8,
    MAX_EMAIL_LENGTH: 254,
  },

  // Configuration pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
  },

  // Configuration logging
  LOGGING: {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug',
    },
    PREFIX: {
      SUCCESS: '✅',
      ERROR: '❌',
      WARNING: '⚠️',
      INFO: 'ℹ️',
      PROCESS: '🔄',
    },
  },
} as const;

// Types dérivés de la configuration
export type ErrorMessage = keyof typeof CONFIG.ERRORS.MESSAGES;
export type LogLevel = typeof CONFIG.LOGGING.LEVELS[keyof typeof CONFIG.LOGGING.LEVELS];
export type CronSchedule = keyof typeof CONFIG.CRON.SCHEDULES;

// Utilitaires pour accéder à la configuration
export const getErrorMessage = (key: ErrorMessage): string => {
  return CONFIG.ERRORS.MESSAGES[key];
};

export const getCronSchedule = (job: CronSchedule): string => {
  return CONFIG.CRON.SCHEDULES[job];
};

export const isValidEmail = (email: string): boolean => {
  return CONFIG.VALIDATION.EMAIL_REGEX.test(email);
};

// Configuration d'environnement
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const getEnvironment = (): string => {
  return process.env.NODE_ENV || 'development';
};
