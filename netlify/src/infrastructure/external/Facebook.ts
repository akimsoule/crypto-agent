import { PrismaClient } from "@prisma/client";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export class FacebookService {
  private static readonly FB_GRAPH_URL = "https://graph.facebook.com/v22.0";
  private static readonly APP_ID = process.env.FB_APP_ID || "VOTRE_APP_ID";
  private static readonly APP_SECRET =
    process.env.FB_APP_SECRET || "VOTRE_APP_SECRET";
  private static readonly PAGE_NAME =
    process.env.FB_PAGE_NAME || "Nom de ta page";

  private userAccessToken: string = "";
  private longLivedToken: string = "";
  private pageAccessToken: string = "";
  private prismaClient: PrismaClient = new PrismaClient();

  
  private tokenCache: { token: string; expiresAt: Date } | null = null;
  private static readonly TOKEN_VALIDITY = 24 * 60 * 60 * 1000; // 24 heures en ms

  constructor() {}

  /**
   * Charger le token depuis la base de données ou le cache
   */
  public async loadAccessToken() {
    try {
      // Vérifier si le token est en cache et valide
      if (this.tokenCache && new Date() < this.tokenCache.expiresAt) {
        this.userAccessToken = this.tokenCache.token;
        console.log("✅ Token chargé depuis le cache.");
        return;
      }

      const tokenRecord = await this.prismaClient.cryptoSystemConfig.findUnique({
        where: { configKey: 'facebook_access_token' },
      });

      if (tokenRecord) {
        this.userAccessToken = tokenRecord.configValue;
        // Mettre en cache avec expiration dans 24h
        this.tokenCache = {
          token: tokenRecord.configValue,
          expiresAt: new Date(Date.now() + FacebookService.TOKEN_VALIDITY),
        };
        console.log(
          "✅ Token chargé depuis la base de données et mis en cache."
        );
      } else {
        console.error("❌ Aucun token trouvé dans la base de données.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors du chargement du token:", errorMessage);
    }
  }

  /**
   * Met à jour le token dans la base de données
   */
  private async saveAccessToken(token: string) {
    try {
      // Utiliser upsert pour créer ou mettre à jour le token
      await this.prismaClient.cryptoSystemConfig.upsert({
        where: { configKey: 'facebook_access_token' },
        update: { 
          configValue: token,
          updatedAt: new Date()
        },
        create: {
          configKey: 'facebook_access_token',
          configValue: token,
          description: 'Facebook Page Access Token pour publication automatique',
          isActive: true
        }
      });

      // Mise à jour du cache
      this.tokenCache = {
        token,
        expiresAt: new Date(Date.now() + FacebookService.TOKEN_VALIDITY),
      };
      console.log("✅ Token mis à jour et sauvegardé en cache.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de la sauvegarde du token:", errorMessage);
    }
  }

  /**
   * Échanger le User Access Token contre un Long-Lived Token
   */
  private async refreshAccessToken() {
    try {
      const response = await axios.get(
        `${FacebookService.FB_GRAPH_URL}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: FacebookService.APP_ID,
            client_secret: FacebookService.APP_SECRET,
            fb_exchange_token: this.userAccessToken,
          },
        }
      );

      this.longLivedToken = response.data.access_token;
      this.saveAccessToken(this.longLivedToken);
      console.log("✅ Long-Lived Token récupéré !");
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) 
        ? error.response?.data 
        : error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de l'échange du token :", errorData);
    }
  }

  /**
   * Récupérer le Page Access Token
   */
  private async getPageAccessToken() {
    try {
      const response = await axios.get(
        `${FacebookService.FB_GRAPH_URL}/me/accounts`,
        {
          params: { access_token: this.longLivedToken },
        }
      );

      const page = response.data.data.find(
        (p: { name: string }) => p.name === FacebookService.PAGE_NAME
      );

      if (!page) {
        throw new Error(`❌ Page '${FacebookService.PAGE_NAME}' non trouvée.`);
      }

      this.pageAccessToken = page.access_token;
      console.log(
        `✅ Page Access Token récupéré pour '${FacebookService.PAGE_NAME}' !`
      );
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) 
        ? error.response?.data 
        : error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de la récupération du Page Access Token :", errorData);
    }
  }

  /**
   * Publier un post sur la page Facebook
   */
  public async postOnPage(message: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      await this.loadAccessToken();
      
      if (!this.userAccessToken) {
        throw new Error("❌ Aucun token d'accès disponible");
      }

      await this.refreshAccessToken();
      await this.getPageAccessToken();

      if (!this.pageAccessToken) {
        throw new Error("❌ Impossible de récupérer le token de la page");
      }

      const response = await axios.post(
        `${FacebookService.FB_GRAPH_URL}/me/feed`,
        { message },
        { params: { access_token: this.pageAccessToken } }
      );

      console.log(`✅ Post publié avec succès ! ID : ${response.data.id}`);
      return { 
        success: true, 
        postId: response.data.id 
      };
    } catch (error: unknown) {
      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("❌ Erreur lors de la publication :", errorMsg);
      return { 
        success: false, 
        error: errorMsg 
      };
    }
  }

  /**
   * Fermer la connexion Prisma
   */
  public async disconnect() {
    await this.prismaClient.$disconnect();
  }
}

export default FacebookService;
