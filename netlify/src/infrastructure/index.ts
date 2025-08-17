// Infrastructure - Database Layer
export { default as prismaClient } from './database/prismaClient';

// Infrastructure - External APIs
export { FacebookService } from './external/Facebook';
export { SocialMediaManager } from './external/socialMediaManager';
export { EmailService } from './external/emailService';
export * from './external/teleg';

// Infrastructure - Monitoring
export * from './monitoring/databaseMonitor';
