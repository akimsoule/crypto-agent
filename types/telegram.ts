// Types liés aux intégrations Telegram

export interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text: string;
  };
  description?: string;
}
