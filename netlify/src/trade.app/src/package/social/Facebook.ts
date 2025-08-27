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

      const tokenRecord = await this.prismaClient.facebookToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (tokenRecord) {
        this.userAccessToken = tokenRecord.token;
        // Mettre en cache avec expiration dans 24h
        this.tokenCache = {
          token: tokenRecord.token,
          expiresAt: new Date(Date.now() + FacebookService.TOKEN_VALIDITY),
        };
        console.log(
          "✅ Token chargé depuis la base de données et mis en cache."
        );
      } else {
        console.error("❌ Aucun token trouvé dans la base de données.");
      }
    } catch (error: any) {
      console.error("❌ Erreur lors du chargement du token:", error.message);
    }
  }

  /**
   * Met à jour le token dans la base de données
   */
  private async saveAccessToken(token: string) {
    try {
      // Supprimer tous les tokens existants
      await this.prismaClient.facebookToken.deleteMany();
      await this.prismaClient.facebookToken.create({
        data: { token },
      });
      // Mise à jour du cache
      this.tokenCache = {
        token,
        expiresAt: new Date(Date.now() + FacebookService.TOKEN_VALIDITY),
      };
      console.log("✅ Token mis à jour et sauvegardé en cache.");
    } catch (error: any) {
      console.error("❌ Erreur lors de la sauvegarde du token:", error.message);
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
    } catch (error: any) {
      console.error(
        "❌ Erreur lors de l'échange du token :",
        error.response.data
      );
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
    } catch (error: any) {
      console.error(
        "❌ Erreur lors de la récupération du Page Access Token :",
        error.response.data
      );
    }
  }

  /**
   * Publier un post sur la page Facebook
   */
  public async postOnPage(message: string) {
    try {
      await this.refreshAccessToken();
      await this.getPageAccessToken();

      const response = await axios.post(
        `${FacebookService.FB_GRAPH_URL}/me/feed`,
        { message },
        { params: { access_token: this.pageAccessToken } }
      );

      console.log(`✅ Post publié avec succès ! ID : ${response.data.id}`);
    } catch (error: any) {
      console.error("❌ Erreur lors de la publication :", error.response.data);
    }
  }
}

export default FacebookService;
