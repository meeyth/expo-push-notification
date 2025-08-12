import express from "express";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { Expo } from "expo-server-sdk";

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const TOKENS_FILE = path.join(__dirname, "tokens.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // restrict in prod
});

app.use(cors());
app.use(bodyParser.json());

// Map: userId -> socketId (for online users)
const onlineUsers = new Map();

// Expo push client
const expo = new Expo();

const readTokensFile = async () => {
  try {
    const exists = await fs.pathExists(TOKENS_FILE);
    if (!exists) {
      await fs.writeJson(TOKENS_FILE, {});
      return {};
    }
    return await fs.readJson(TOKENS_FILE);
  } catch (err) {
    console.error("Failed to read tokens file:", err);
    return {};
  }
};

const writeTokensFile = async (obj) => {
  try {
    await fs.writeJson(TOKENS_FILE, obj, { spaces: 2 });
  } catch (err) {
    console.error("Failed to write tokens file:", err);
  }
};

// Save Expo push token
app.post("/save-token", async (req, res) => {
  const { userId, expoPushToken } = req.body;
  if (!userId || !expoPushToken) {
    return res
      .status(400)
      .json({ ok: false, error: "userId and expoPushToken required" });
  }

  if (!Expo.isExpoPushToken(expoPushToken)) {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid Expo push token" });
  }

  const tokens = await readTokensFile();
  tokens[userId] = tokens[userId] || [];

  if (!tokens[userId].includes(expoPushToken)) {
    tokens[userId].push(expoPushToken);
    await writeTokensFile(tokens);
  }

  res.json({ ok: true });
});

// Optional debug route
app.get("/tokens/:userId", async (req, res) => {
  const tokens = await readTokensFile();
  res.json({
    userId: req.params.userId,
    tokens: tokens[req.params.userId] || [],
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Socket.IO events
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("register", (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`user online: ${userId} -> ${socket.id}`);
    }
  });

  socket.on("send-message", async ({ senderId, recipientId, text }) => {
    if (!senderId || !recipientId || typeof text === "undefined") {
      socket.emit("error", { message: "invalid send-message payload" });
      return;
    }

    const message = {
      senderId,
      text,
      ts: Date.now(),
    };

    // Deliver if online
    if (onlineUsers.has(recipientId)) {
      io.to(onlineUsers.get(recipientId)).emit("receive-message", message);
      console.log(`Delivered to online user ${recipientId}`);
    } else {
      console.log(`User ${recipientId} offline, sending push notifications`);
      const tokens = await readTokensFile();
      const recipientTokens = tokens[recipientId] || [];

      if (recipientTokens.length > 0) {
        const pushMessages = recipientTokens
          .filter((token) => Expo.isExpoPushToken(token))
          .map((token) => ({
            to: token,
            sound: "default",
            title: `Message from ${senderId}`,
            body: text.length > 120 ? text.slice(0, 117) + "..." : text,
            data: { senderId, ts: message.ts },
          }));

        const chunks = expo.chunkPushNotifications(pushMessages);
        for (const chunk of chunks) {
          try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            console.log("Expo tickets:", tickets);
          } catch (err) {
            console.error("Push send error:", err);
          }
        }
      }
    }

    socket.emit("message-sent", { ok: true, message });
  });

  socket.on("disconnect", () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`user disconnected: ${userId}`);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
