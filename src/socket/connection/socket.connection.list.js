import "dotenv/config";
import { Server as SocketIO } from "socket.io";

import handleChatEvents from "./handleChatEvent.js";
import userRoleModal from "../models/users/userRoleModal.js";
import conversations from "./../models/message/message.js";

let io;
const onlineUsers = new Map();

const connectSocket = (server) => {
  if (!io) {
    // Allow common local frontend origins during development and the configured FRONTEND_URL.
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean);
    io = new SocketIO(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingInterval: 30000,
      pingTimeout: 5000,
    });
  }

  io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);

    const userId = socket.handshake.query.id;

    if (!userId) {
      socket.emit("error", "User ID is required");
      socket.disconnect();
      return;
    }

    const currentUser = await userRoleModal.findById(userId).select("_id");

    if (!currentUser) {
      socket.emit("error", "User not found");
      socket.disconnect();
      return;
    }

    const currentUserId = currentUser._id.toString();
    socket.join(currentUserId);
    // mark user as online
    onlineUsers.set(currentUserId, socket.id);
    console.log("Online Users:", onlineUsers);
    const userConversations = await conversations
      .find({
        participants: currentUserId,
      })
      .select("_id");

    console.log("userConversations:", userConversations);

    userConversations.forEach((conv) => socket.join(conv._id.toString()));

    // Call event handlers for chat messages
    console.log("handling chat events", currentUserId);
    handleChatEvents(io, socket, currentUserId);

    console.log("still running socket");
    console.log(onlineUsers);

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
      // Remove user from online map if it matches this socket id
      const entries = Array.from(onlineUsers.entries());
      for (const [uid, sid] of entries) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
        }
      }
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error("socket.io is not initialized");
  }
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
