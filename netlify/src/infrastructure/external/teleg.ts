import { TelegramResponse } from "../../../../types/telegram";

class TelegramBot {
  private token: string;
  private chatId: string;

  constructor(token: string, chatId: string) {
    this.token = token;
    this.chatId = chatId;
  }

  async sendMessage(message: string): Promise<TelegramResponse> {
    if (this.token && this.chatId) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${this.token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: this.chatId,
              text: message,
            }),
          }
        );

        const result: TelegramResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || "Erreur lors de l'envoi du message Telegram"
          );
        }

        return result;
      } catch (error) {
        console.error("Erreur lors de l'envoi du message Telegram:", error);
        throw error;
      }
    } else {
      throw new Error("Token ou chatId manquant");
    }
  }
}

export { TelegramBot };
