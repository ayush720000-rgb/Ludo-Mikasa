import path from 'path';
import { Telegraf } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/types';

// Telegram button colours: 'primary' (blue), 'success' (green), 'danger' (red).
type StyledButton = InlineKeyboardButton & { style?: 'primary' | 'success' | 'danger' };

const WELCOME_PHOTO = path.join('public', 'assets', 'mikasa-mascot.jpg');
const MAIN_BOT_USERNAME = (process.env.MAIN_BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');

function isValidBotToken(token?: string): boolean {
  if (!token) return false;
  const clean = token.trim();
  if (clean === '' || /MY_TELEGRAM|YOUR_BOT_TOKEN|placeholder/i.test(clean)) return false;
  return /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(clean);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Ludo's Telegram bot: the /start welcome message with the Mini App button and a link to the
 * main bot. Telegram login and avatar lookups use the same token, but they work without polling.
 */
export class LudoTelegramBot {
  private bot: Telegraf | null = null;
  private welcomePhotoId: string | null = null;

  constructor(private readonly appUrl: string) {}

  public start(): void {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!isValidBotToken(token)) {
      console.log('[LudoBot] No valid TELEGRAM_BOT_TOKEN provided. Bot disabled, web app still runs.');
      return;
    }

    const instance = new Telegraf(token);
    instance.catch((err: unknown) => console.log('[LudoBot] Background update notice:', errorMessage(err)));

    instance.telegram
      .getMe()
      .then((me) => {
        this.bot = instance;
        this.setupHandlers(instance);
        console.log(`Ludo bot @${me.username} connected successfully.`);
        return instance.launch({ dropPendingUpdates: true });
      })
      .then(() => console.log('Ludo bot polling launched successfully.'))
      .catch((err: unknown) => {
        this.bot = null;
        console.log(`[LudoBot] Bot unavailable (${errorMessage(err)}). Web app still runs.`);
      });
  }

  private setupHandlers(bot: Telegraf) {
    bot.command('start', async (ctx) => {
      const firstName = ctx.from?.first_name || 'Player';
      const caption =
        `👋 Welcome, <b>${escapeHtml(firstName)}</b>!\n\n` +
        `🎲 Ready to roll?\n` +
        `Create a lobby, invite your friends, and race your tokens home!`;

      const playButton: StyledButton = { text: '🎲 Play LudoNow', web_app: { url: this.appUrl }, style: 'danger' };
      const mainButton: StyledButton = {
        text: '🤖 Main Bot',
        url: `https://t.me/${MAIN_BOT_USERNAME}`,
        style: 'success',
      };
      const reply_markup = { inline_keyboard: [[playButton], [mainButton]] };

      try {
        const sent = await ctx.replyWithPhoto(this.welcomePhotoId ?? { source: WELCOME_PHOTO }, {
          caption,
          parse_mode: 'HTML',
          reply_markup,
        });
        if (!this.welcomePhotoId && 'photo' in sent && sent.photo?.length) {
          this.welcomePhotoId = sent.photo[sent.photo.length - 1].file_id;
        }
      } catch (err) {
        console.log('[LudoBot] Welcome photo failed, sending text instead:', errorMessage(err));
        await ctx.reply(caption, { parse_mode: 'HTML', reply_markup });
      }
    });
  }

  public stop(): void {
    try {
      this.bot?.stop();
    } catch {
      // already stopped
    }
    this.bot = null;
  }
}
