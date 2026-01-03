import "dotenv/config";
import { Server as SocketIO } from "socket.io";
import handleChatEvents from "../handeler/message.handle.chat.js";
import userModal from "../../auth/schema/auth.modal.js";
import conversations from "../../conversition/schema/conversition.modal.js";

let io;
const onlineUsers = new Map();

export const initializeSocket = (server) => {
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


    // Get user ID from query parameters
    const userId = socket.handshake.query?.userId || socket.handshake.query?.id;

    if (!userId) {
      socket.emit("auth-error", { message: "User ID is required" });
      socket.disconnect();
      return;
    }

    // Verify user exists and has proper role
    const currentUser = await userModal.findById(userId).select("_id role");
    if (!currentUser) {
      socket.emit("auth-error", { message: "User not found" });
      socket.disconnect();
      return;
    }

    // Only allow hosts and influencers to connect
    if (currentUser.role !== "host" && currentUser.role !== "influencer") {
      socket.emit("auth-error", {
        message: "Only hosts and influencers can use messaging",
      });
      socket.disconnect();
      return;
    }

    const currentUserId = currentUser._id.toString();

    // Store user info
    onlineUsers.set(currentUserId, {
      socketId: socket.id,
      role: currentUser.role,
    });

    // Join user to their personal room
    socket.join(`user-${currentUserId}`);



    // Find and join user's conversations
    const userConversations = await conversations
      .find({
        participants: currentUserId,
      })
      .select("_id");



    userConversations.forEach((conv) => socket.join(conv._id.toString()));

    // Handle user online event
    socket.on("user-online", (userData) => {
      const { userId: onlineUserId, role } = userData;
      
    });

    // Call event handlers for chat messages

    handleChatEvents(io, socket, currentUserId);

    socket.on("disconnect", () => {
      
      // Remove user from online map
      onlineUsers.delete(currentUserId);
     
    });
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export { onlineUsers };
