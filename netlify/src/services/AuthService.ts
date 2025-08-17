import jwt from 'jsonwebtoken';
import { CONFIG, getErrorMessage } from '../config';

interface LoginRequest {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface LoginResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  expiresIn?: string;
}

interface VerifyTokenResult {
  success: boolean;
  valid: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  private readonly adminUser = {
    username: CONFIG.ADMIN.USERNAME,
    password: CONFIG.ADMIN.PASSWORD,
    id: CONFIG.ADMIN.ID,
    role: CONFIG.ADMIN.ROLE
  };

  private readonly jwtSecret = CONFIG.JWT.SECRET;
  private readonly tokenExpiresIn = CONFIG.JWT.EXPIRES_IN;

  /**
   * Authentifie un utilisateur et retourne un token JWT
   */
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const { username, password } = credentials;

      // Validation des champs
      if (!username || !password) {
        return {
          success: false,
          error: getErrorMessage('MISSING_CREDENTIALS')
        };
      }

      // Vérification des identifiants
      if (username !== this.adminUser.username || password !== this.adminUser.password) {
        return {
          success: false,
          error: getErrorMessage('INVALID_CREDENTIALS')
        };
      }

      // Génération du token JWT
      const token = jwt.sign(
        { 
          id: this.adminUser.id,
          username: this.adminUser.username,
          role: this.adminUser.role 
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiresIn }
      );

      console.log('✅ Connexion réussie pour:', username);

      return {
        success: true,
        token,
        user: {
          id: this.adminUser.id,
          username: this.adminUser.username,
          role: this.adminUser.role
        },
        expiresIn: this.tokenExpiresIn
      };

    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      return {
        success: false,
        error: getErrorMessage('INTERNAL_SERVER')
      };
    }
  }

  /**
   * Vérifie la validité d'un token JWT
   */
  async verifyToken(token: string): Promise<VerifyTokenResult> {
    try {
      if (!token) {
        return {
          success: false,
          valid: false,
          error: getErrorMessage('MISSING_TOKEN')
        };
      }

      // Vérifier et décoder le token
      const decoded = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload & User;

      console.log('✅ Token vérifié pour:', decoded.username);

      return {
        success: true,
        valid: true,
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        }
      };

    } catch (error) {
      console.error('❌ Token invalide:', error);
      return {
        success: false,
        valid: false,
        error: getErrorMessage('INVALID_TOKEN')
      };
    }
  }

  /**
   * Extrait le token Bearer depuis un header d'autorisation
   */
  extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Retirer "Bearer "
  }
}
