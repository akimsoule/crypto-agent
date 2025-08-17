#!/usr/bin/env tsx

/**
 * Script de validation des variables d'environnement
 * Vérifie que toutes les variables nécessaires sont configurées
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Charger le fichier .env s'il existe
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Supprimer les guillemets
            if (!process.env[key]) { // Ne pas écraser les variables déjà définies
              process.env[key] = value;
            }
          }
        }
      }
      console.log('📁 Fichier .env chargé\n');
    } catch (error) {
      console.log('⚠️  Erreur lors du chargement du fichier .env:', error);
    }
  } else {
    console.log('ℹ️  Aucun fichier .env trouvé\n');
  }
}

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

const ENV_VARIABLES: EnvConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'URL de connexion PostgreSQL',
    example: 'postgresql://user:pass@host:5432/db'
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Clé secrète JWT pour l\'authentification',
    example: 'your-super-secret-jwt-key'
  },
  {
    name: 'FB_APP_ID',
    required: false,
    description: 'ID de l\'application Facebook',
    example: '123456789012345'
  },
  {
    name: 'FB_APP_SECRET',
    required: false,
    description: 'Secret de l\'application Facebook',
    example: 'abc123def456ghi789'
  },
  {
    name: 'FB_PAGE_NAME',
    required: false,
    description: 'Nom de la page Facebook',
    example: 'Your Facebook Page'
  },
  {
    name: 'ADMIN_API_TOKEN',
    required: false,
    description: 'Token d\'administration pour l\'API',
    example: 'admin-token-123'
  },
  {
    name: 'TELEGRAM_BOT_TOKEN',
    required: false,
    description: 'Token du bot Telegram',
    example: '123456789:ABCdefGHI...'
  },
  {
    name: 'TELEGRAM_CHAT_ID',
    required: false,
    description: 'ID du chat Telegram',
    example: '@your_channel'
  },
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Clé API Resend pour l\'envoi d\'emails',
    example: 're_abc123...'
  },
  {
    name: 'RESEND_FROM_EMAIL',
    required: false,
    description: 'Email expéditeur Resend (format: "Name <email@domain.com>")',
    example: 'Crypto Hub <newsletter@crypto-hub.com>'
  },
  {
    name: 'RESEND_REPLY_TO',
    required: false,
    description: 'Email de réponse Resend',
    example: 'noreply@crypto-hub.com'
  },
  {
    name: 'REPLY_TO_EMAIL',
    required: false,
    description: 'Email de réponse par défaut',
    example: 'noreply@yourdomain.com'
  },
  {
    name: 'EMAIL_API_KEY',
    required: false,
    description: 'Clé API email alternative',
    example: 'api_key_123'
  },
  {
    name: 'FROM_EMAIL',
    required: false,
    description: 'Email d\'expédition par défaut',
    example: 'noreply@yourdomain.com'
  },
  {
    name: 'FROM_NAME',
    required: false,
    description: 'Nom d\'expéditeur par défaut',
    example: 'Your App Name'
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Environnement d\'exécution',
    example: 'development|production|test'
  }
];

function validateEnvironment() {
  // Charger le fichier .env au début
  loadEnvFile();
  
  console.log('🔍 Validation des variables d\'environnement...\n');

  const issues: string[] = [];
  const warnings: string[] = [];
  let requiredCount = 0;
  let optionalCount = 0;
  let missingRequired = 0;
  let missingOptional = 0;

  for (const config of ENV_VARIABLES) {
    const value = process.env[config.name];
    const isSet = value !== undefined && value !== '';
    
    if (config.required) {
      requiredCount++;
      if (!isSet) {
        missingRequired++;
        issues.push(`❌ MANQUANTE (OBLIGATOIRE): ${config.name}`);
        issues.push(`   📝 ${config.description}`);
        if (config.example) {
          issues.push(`   💡 Exemple: ${config.example}`);
        }
        issues.push('');
      } else {
        console.log(`✅ ${config.name} (obligatoire)`);
      }
    } else {
      optionalCount++;
      if (!isSet) {
        missingOptional++;
        warnings.push(`⚠️  MANQUANTE (OPTIONNELLE): ${config.name}`);
        warnings.push(`   📝 ${config.description}`);
        if (config.example) {
          warnings.push(`   💡 Exemple: ${config.example}`);
        }
        warnings.push('');
      } else {
        console.log(`✅ ${config.name} (optionnelle)`);
      }
    }
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ:');
  console.log(`   Variables obligatoires: ${requiredCount - missingRequired}/${requiredCount}`);
  console.log(`   Variables optionnelles: ${optionalCount - missingOptional}/${optionalCount}`);
  console.log(`   Total configurées: ${ENV_VARIABLES.length - missingRequired - missingOptional}/${ENV_VARIABLES.length}`);

  // Problèmes critiques
  if (issues.length > 0) {
    console.log('\n🚨 PROBLÈMES CRITIQUES:');
    issues.forEach(issue => console.log(issue));
  }

  // Avertissements
  if (warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    warnings.forEach(warning => console.log(warning));
  }

  // Conseils
  console.log('\n💡 CONSEILS:');
  console.log('   1. Copiez .env.example vers .env: cp .env.example .env');
  console.log('   2. Éditez .env avec vos vraies valeurs');
  console.log('   3. Consultez docs/ENVIRONMENT_VARIABLES.md pour plus d\'infos');

  // Validation spécifique
  validateSpecific();

  // Code de sortie
  if (missingRequired > 0) {
    console.log('\n❌ ÉCHEC: Variables obligatoires manquantes');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCÈS: Toutes les variables obligatoires sont configurées');
    if (missingOptional > 0) {
      console.log(`   Note: ${missingOptional} variables optionnelles manquantes`);
    }
    process.exit(0);
  }
}

function validateSpecific() {
  console.log('\n🔧 VALIDATIONS SPÉCIFIQUES:');

  // DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    if (dbUrl.startsWith('postgresql://')) {
      console.log('✅ DATABASE_URL: Format PostgreSQL valide');
    } else {
      console.log('⚠️  DATABASE_URL: Format non PostgreSQL détecté');
    }
  }

  // JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length >= 32) {
      console.log('✅ JWT_SECRET: Longueur appropriée (≥32 caractères)');
    } else {
      console.log('⚠️  JWT_SECRET: Trop court (<32 caractères) - Risque de sécurité');
    }
    
    if (jwtSecret.includes('secret-key') || jwtSecret.includes('change-this')) {
      console.log('⚠️  JWT_SECRET: Semble être une valeur d\'exemple - Changez en production');
    }
  }

  // NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) {
    const validEnvs = ['development', 'production', 'test'];
    if (validEnvs.includes(nodeEnv)) {
      console.log(`✅ NODE_ENV: Valeur valide (${nodeEnv})`);
    } else {
      console.log(`⚠️  NODE_ENV: Valeur non standard (${nodeEnv})`);
    }
  }

  // Resend complet
  const resendVars = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO'];
  const resendSet = resendVars.filter(varName => process.env[varName]);
  
  if (resendSet.length === resendVars.length) {
    console.log('✅ Resend: Configuration complète');
  } else if (resendSet.length > 0) {
    console.log(`⚠️  Resend: Configuration partielle (${resendSet.length}/${resendVars.length})`);
  }

  // Telegram complet
  const telegramVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const telegramSet = telegramVars.filter(varName => process.env[varName]);
  
  if (telegramSet.length === telegramVars.length) {
    console.log('✅ Telegram: Configuration complète');
  } else if (telegramSet.length > 0) {
    console.log(`⚠️  Telegram: Configuration partielle (${telegramSet.length}/${telegramVars.length})`);
  }

  // Facebook complet
  const facebookVars = ['FB_APP_ID', 'FB_APP_SECRET'];
  const facebookSet = facebookVars.filter(varName => process.env[varName]);
  
  if (facebookSet.length === facebookVars.length) {
    console.log('✅ Facebook: Configuration complète');
  } else if (facebookSet.length > 0) {
    console.log(`⚠️  Facebook: Configuration partielle (${facebookSet.length}/${facebookVars.length})`);
  }
}

// Exécution
if (import.meta.url === `file://${process.argv[1]}`) {
  validateEnvironment();
}

export { validateEnvironment };
