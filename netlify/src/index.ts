// 🏗️ Architecture principale du projet Crypto Agent
// Organisée selon les principes de Clean Architecture

// 📊 Configuration
export * from './config';

// 🔧 Services (Couche Application)
export * from './services';

// 🎯 Domaines Métier (Couche Domain)
export * from './domain';

// 🏢 Infrastructure (Couche Infrastructure)
export { prismaClient } from './infrastructure';
export { SocialMediaManager } from './infrastructure';
export { EmailService } from './infrastructure';
export { DatabaseMonitor } from './infrastructure';

// 🛠️ Utilitaires (Couche Utils)
// export { runAction } from './utils';
