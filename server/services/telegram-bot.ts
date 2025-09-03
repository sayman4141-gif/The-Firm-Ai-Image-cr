import { Telegraf, Context } from 'telegraf';
import { generateImage } from './gemini.js';
import { storage } from '../storage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TEAM_ATTRIBUTION = "Developed by The Firm AI Team";

export class TelegramBotService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(BOT_TOKEN);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.start(async (ctx) => {
      const welcomeMessage = `🎨 Welcome to the AI Image Generator Bot!

Send me any text description and I'll create a beautiful image for you using AI.

**Commands:**
/start - Get started
/help - View help

Simply type your image description and I'll generate it for you!

_${TEAM_ATTRIBUTION}_`;

      await ctx.reply(welcomeMessage);
    });

    // Help command
    this.bot.help(async (ctx) => {
      const helpMessage = `📖 **How to use the AI Image Generator Bot:**

1️⃣ Simply send me a text description
2️⃣ Wait for the AI to generate your image
3️⃣ Download or share your creation

**Tips for better results:**
• Be descriptive with details
• Mention colors, styles, moods
• Specify composition (wide, portrait, etc.)

**Commands:**
/start - Restart bot
/help - Show this help

**Examples:**
"A majestic sunset over a mountain landscape with purple clouds"
"A futuristic city with flying cars at night"
"Abstract art with vibrant colors and geometric shapes"

_${TEAM_ATTRIBUTION}_`;

      await ctx.reply(helpMessage);
    });

    // Handle text messages (image generation requests)
    this.bot.on('text', async (ctx) => {
      const prompt = ctx.message.text;
      const telegramUserId = ctx.from.id.toString();

      // Skip if it's a command
      if (prompt.startsWith('/')) {
        return;
      }

      // Validate prompt
      if (prompt.length < 3) {
        await ctx.reply(`❌ Please provide a more detailed description for better results.\n\n_${TEAM_ATTRIBUTION}_`);
        return;
      }

      if (prompt.length > 500) {
        await ctx.reply(`❌ Description is too long. Please keep it under 500 characters.\n\n_${TEAM_ATTRIBUTION}_`);
        return;
      }

      // Check for inappropriate content (basic filter)
      const inappropriateKeywords = ['violence', 'gore', 'explicit', 'nude', 'nsfw', 'inappropriate'];
      const hasInappropriateContent = inappropriateKeywords.some(keyword => 
        prompt.toLowerCase().includes(keyword)
      );

      if (hasInappropriateContent) {
        await ctx.reply(`⚠️ **Content Policy Violation**

I cannot generate inappropriate or harmful content. Please provide a different description that follows our content guidelines.

_${TEAM_ATTRIBUTION}_`);
        return;
      }

      // Send typing action
      await ctx.sendChatAction('typing');

      try {
        // Store generation request
        const generation = await storage.createImageGeneration({
          telegramUserId,
          prompt,
        });

        // Show generating message
        const generatingMsg = await ctx.reply(`🎨 Generating your image...

"${prompt}"

This may take a few seconds...

_${TEAM_ATTRIBUTION}_`);

        // Generate image
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const imagePath = path.join(tempDir, `${generation.id}.png`);

        await generateImage(prompt, imagePath);

        // Check if image was generated
        if (!fs.existsSync(imagePath)) {
          throw new Error('Image generation failed - no file created');
        }

        // Send the generated image
        await ctx.sendPhoto({ source: imagePath }, {
          caption: `✨ Here's your AI-generated image!

Prompt: "${prompt}"
Generated successfully ⚡

_${TEAM_ATTRIBUTION}_`
        });

        // Update generation status
        await storage.updateImageGeneration(generation.id, {
          status: 'completed',
          imageUrl: imagePath,
          completedAt: new Date(),
        });

        // Clean up the temporary file
        setTimeout(() => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }, 30000); // Delete after 30 seconds

        // Delete the "generating" message
        try {
          await ctx.deleteMessage(generatingMsg.message_id);
        } catch (error) {
          // Ignore deletion errors
        }

      } catch (error) {
        console.error('Image generation error:', error);
        
        const errorMessage = `❌ **Image Generation Failed**

Sorry, I couldn't generate your image right now. This could be due to:
• Server overload
• Network issues
• Content policy restrictions

Please try again in a few moments or rephrase your description.

_${TEAM_ATTRIBUTION}_`;

        await ctx.reply(errorMessage);

        // Update generation status
        try {
          const generation = await storage.getImageGenerationByUserAndPrompt(telegramUserId, prompt);
          if (generation) {
            await storage.updateImageGeneration(generation.id, {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } catch (storageError) {
          console.error('Storage error:', storageError);
        }
      }
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Telegram bot error:', err);
      ctx.reply(`❌ Something went wrong. Please try again later.\n\n_${TEAM_ATTRIBUTION}_`);
    });
  }

  public launch() {
    // Use polling for better reliability
    this.bot.launch();

    console.log('Telegram bot launched successfully (using polling)');

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  public getBot() {
    return this.bot;
  }
}

export const telegramBotService = new TelegramBotService();
