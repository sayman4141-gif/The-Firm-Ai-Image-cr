import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
    // Create a simple fallback
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return;
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>AI Image Generator Bot</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
              <div style="text-align: center;">
                <h1>🎨 AI Image Generator Bot</h1>
                <p>The bot is running successfully!</p>
                <p><strong>Developed by The Firm AI Team</strong></p>
                <p>Use the bot on Telegram to generate AI images.</p>
              </div>
            </div>
          </body>
        </html>
      `);
    });
    return;
  }

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
