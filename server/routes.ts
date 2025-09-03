import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { telegramBotService } from "./services/telegram-bot.js";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/", (req, res) => {
    res.json({
      status: "healthy",
      message: "AI Image Generator Bot is running",
      timestamp: new Date().toISOString(),
      team: "The Firm AI Team"
    });
  });

  // Get bot statistics
  app.get("/api/bot-stats", async (req, res) => {
    try {
      const stats = await storage.getBotStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching bot stats:', error);
      res.status(500).json({ error: 'Failed to fetch bot statistics' });
    }
  });

  // Get recent image generations
  app.get("/api/recent-generations", async (req, res) => {
    try {
      const generations = await storage.getRecentImageGenerations(10);
      res.json(generations);
    } catch (error) {
      console.error('Error fetching recent generations:', error);
      res.status(500).json({ error: 'Failed to fetch recent generations' });
    }
  });

  // Bot health check
  app.get("/api/bot-health", async (req, res) => {
    try {
      const bot = telegramBotService.getBot();
      const botInfo = await bot.telegram.getMe();
      res.json({
        status: 'healthy',
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bot health check failed:', error);
      res.status(503).json({ 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  const httpServer = createServer(app);

  // Launch Telegram bot
  try {
    telegramBotService.launch();
  } catch (error) {
    console.error('Failed to launch Telegram bot:', error);
  }

  return httpServer;
}
