import mongoose from "mongoose";
import messages from "../schema/message.modal.js";
import conversations from "../../conversition/schema/conversition.modal.js";
import userModal from "../../auth/schema/auth.modal.js";
import {
  onlineUsers,
  getSocketIO,
} from "../../socket/connection/socket.Connection.js";

/**
 * Create a new message
 */
const new_message_IntoDb = async (user, data, files = null, req = null) => {
  if (!user?.id) {
    throw new Error("User ID not found in token");
  }

  // Receiver may be a User
  const isReceiverExist = await userModal
    .findById(data.receiverId)
    .select("_id");

  if (!isReceiverExist) {
    throw new Error("Receiver ID not found");
  }

  const io = getSocketIO();
  let isNewConversation = false;

  // Find or create conversation
  let conversation = await conversations.findOne({
    eventId: data.eventId,
    participants: { $all: [user.id, data.receiverId] },
  });

  if (!conversation) {
    conversation = await conversations.create({
      eventId: data.eventId,
      participants: [user.id, data.receiverId],
    });
    isNewConversation = true;
  } else {
    const isExistConversation = await conversations.exists({
      _id: conversation._id,
      participants: user.id,
    });

    if (!isExistConversation) {
      throw new Error("Conversation not found");
    }
  }

  // Join online users to room
  const participants = [user.id, data.receiverId].filter(Boolean);
  for (const participantId of participants) {
    const socketId = onlineUsers.get(participantId.toString());
    if (socketId) {
      const participantSocket = io.sockets.sockets.get(socketId);
      if (participantSocket) {
        const roomId = conversation._id.toString();
        participantSocket.join(roomId);
        participantSocket.data.currentConversationId = roomId;
      }
    }
  }

  // Handle uploaded images using same pattern as user controller
  // Handle uploaded images with type
  let images = [];
  if (files && files.length > 0) {
    images = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype?.startsWith("image/")
        ? "image"
        : file.mimetype?.startsWith("video/")
          ? "video"
          : file.mimetype?.startsWith("audio/")
            ? "audio"
            : "file",
      filename: file.filename,
      size: file.size,
    }));
  }

  // Save message
  const messageData = {
    text: data.text,
    imageUrl: images,
    audioUrl: data.audioUrl || "",
    msgByUserId: new mongoose.Types.ObjectId(user.id),
    conversationId: conversation._id,
  };
  const saveMessage = await messages.create(messageData);

  // Update conversation last message
  await conversations.updateOne(
    { _id: conversation._id },
    { lastMessage: saveMessage._id },
  );

  // Prepare populated message payload (resolve sender as User)
  let sender = await userModal.findById(
    saveMessage.msgByUserId,
    "name image email",
  );

  const updatedMsg = {
    ...saveMessage.toObject(),
    msgByUserId: sender || { _id: saveMessage.msgByUserId },
  };

  // Emit message to room
  io.to(conversation._id.toString()).emit("new-message", updatedMsg);

  return updatedMsg;
};

/**
 * Update a message by ID
 */
const updateMessageById_IntoDb = async (messageId, updateData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await messages.findByIdAndUpdate(
      messageId,
      { $set: updateData },
      { new: true, session },
    );
    if (!updated) {
      throw new Error("Message not found");
    }

    await conversations.updateMany(
      { lastMessage: messageId },
      { $set: { lastMessage: updated._id } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    const conversation = await conversations.findById(updated.conversationId);
    if (conversation) {
      conversation.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit("message-updated", updated);
      });
    }

    return updated;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error("Error updating message");
  }
};

/**
 * Delete a message by ID
 */
const deleteMessageById_IntoDb = async (messageId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const message = await messages.findById(messageId).session(session);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversationId = message.conversationId;
    await message.deleteOne({ _id: messageId }).session(session);

    const conversation = await conversations
      .findById(conversationId)
      .session(session);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.lastMessage?.toString() === messageId.toString()) {
      const newLastMessage = await messages
        .findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);
      conversation.lastMessage = newLastMessage ? newLastMessage._id : null;
      await conversation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    conversation.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit("message-deleted", {
        messageId,
        conversationId,
      });
    });

    return {
      success: true,
      message: "Message deleted successfully",
      messageId,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error("Error deleting message");
  }
};

/**
 * Find all messages by conversation
 */
const findBySpecificConversationInDb = async (conversationId, query) => {
  try {
    const baseQuery = messages.find({ conversationId });

    const page = parseInt(query?.page, 10) || 1;
    const limit = parseInt(query?.limit, 10) || 20;
    const skip = (page - 1) * limit;

    let q = messages.find({ conversationId }).sort({ createdAt: -1 });
    if (query?.fields) q = q.select(query.fields.split(",").join(" "));
    q = q.skip(skip).limit(limit);

    const allmessage = await q.exec();
    const meta = await messages.countDocuments({ conversationId });

    // Populate sender info for each message (User only)
    const populated = await Promise.all(
      allmessage.map(async (msg) => {
        let sender = await userModal.findById(
          msg.msgByUserId,
          "name image email",
        );
        return {
          ...msg.toObject(),
          msgByUserId: sender || { _id: msg.msgByUserId },
        };
      }),
    );

    return { meta, allmessage: populated };
  } catch (error) {
    throw new Error("Error finding messages");
  }
};

/**
 * Send a single 1-to-1 message
 */
const single_new_message_IntoDb = async (user, data, files = null) => {
  try {
    const senderId = user._id || user.id;
    if (!senderId) {
      throw new Error("Sender ID missing from token");
    }

    // Validate receiver ID
    if (!data.receiverId) {
      throw new Error("Receiver ID is required");
    }

    // Receiver must be a User

    const receiver = await userModal
      .findById(data.receiverId)
      .select("_id role name");

    if (!receiver) {
      throw new Error(`Receiver not found with ID: ${data.receiverId}`);
    }

    // Check if receiver has proper role
    if (receiver.role !== "host" && receiver.role !== "influencer") {
      throw new Error(
        `Receiver must be a host or influencer. Current role: ${receiver.role}`,
      );
    }

    let isNewConversation = false;
    let conversation = await conversations.findOne({
      participants: { $all: [senderId, data.receiverId] },
    });

    if (!conversation) {
      const conversationData = {
        participants: [senderId, data.receiverId],
      };

      conversation = await conversations.create(conversationData);
      isNewConversation = true;
    }

    // Handle uploaded images using same pattern as user controller
    // Handle uploaded images with type
    let images = [];
    if (files && files.length > 0) {
      images = files.map((file) => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype?.startsWith("image/")
          ? "image"
          : file.mimetype?.startsWith("video/")
            ? "video"
            : file.mimetype?.startsWith("audio/")
              ? "audio"
              : "file",
        filename: file.filename,
        size: file.size,
      }));
    }

    const messageData = {
      text: data.text?.trim() || "",
      imageUrl: images,
      audioUrl: data.audioUrl || "",
      eventId: data.eventId || null,
      msgByUserId: senderId,
      conversationId: conversation._id,
    };

    const savedMessage = await messages.create(messageData);

    // Update conversation with last message
    const updateResult = await conversations.updateOne(
      { _id: conversation._id },
      { lastMessage: savedMessage._id, updatedAt: new Date() },
    );

    // Get the full message with populated sender info
    const fullMessage = await messages
      .findById(savedMessage._id)
      .populate("msgByUserId", "name image email");

    const result = {
      success: true,
      message: "Message sent successfully",
      data: {
        isNewConversation,
        conversationId: conversation._id,
        messageId: savedMessage._id,
        message: fullMessage,
      },
    };

    return result;
  } catch (error) {
    console.error("=== ERROR in single_new_message_IntoDb ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);
    console.error("=== END ERROR ===");
    throw error;
  }
};

const get_my_single_specific_chatList = async (conversationId, query) => {
  try {
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    // Find conversation first to verify it exists
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      return {
        messages: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalMessages: 0,
          messagesPerPage: limit,
        },
        error:
          "Conversation not found. Please send a message first to create a conversation.",
      };
    }

    // Get messages with pagination
    const messagesList = await messages
      .find({ conversationId })
      .populate("msgByUserId", "name image email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await messages.countDocuments({ conversationId });

    return {
      messages: messagesList,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        messagesPerPage: limit,
      },
    };
  } catch (error) {
    throw new Error("Error getting specific chat: " + error.message);
  }
};

const get_all_conversations_for_user = async (userId, query) => {
  try {
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversationsList = await conversations.aggregate([
      {
        $match: {
          participants: userObjectId,
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },

      // 🔥 Remove logged-in user from participants
      {
        $project: {
          participants: {
            $filter: {
              input: "$participants",
              as: "participant",
              cond: { $ne: ["$$participant", userObjectId] },
            },
          },
          lastMessage: 1,
          isDelete: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Populate participants
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants",
        },
      },

      // Populate lastMessage
      {
        $lookup: {
          from: "messages",
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      {
        $unwind: {
          path: "$lastMessage",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Select only needed participant fields
      {
        $project: {
          "participants._id": 1,
          "participants.name": 1,
          "participants.email": 1,
          "participants.image": 1,
          lastMessage: 1,
          isDelete: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const totalData = await conversations.countDocuments({
      participants: userObjectId,
    });

    return {
      conversations: conversationsList,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalData / limit),
        totalConversations: totalData,
        conversationsPerPage: limit,
      },
    };
  } catch (error) {
    throw new Error("Error getting conversations: " + error.message);
  }
};
const getUserConversationId = async (userId, receiverId, options = {}) => {
  try {
    const { page = 1, limit = 20 } = options;

    const conversation = await conversations.findOne({
      participants: { $in: [userId, receiverId] },
    });

    if (!conversation) {
      return {
        messages: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalMessages: 0,
          limit: parseInt(limit),
        },
      };
    }

    const skip = (page - 1) * limit;

    const [messageList, total] = await Promise.all([
      messages
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      messages.countDocuments({ conversationId: conversation._id }),
    ]);

    return {
      messages: messageList,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        limit: parseInt(limit),
      },
    };
  } catch (error) {
    throw new Error(
      "Error getting user conversation messages: " + error.message,
    );
  }
};

const MessageService = {
  new_message_IntoDb,
  updateMessageById_IntoDb,
  deleteMessageById_IntoDb,
  findBySpecificConversationInDb,
  single_new_message_IntoDb,
  get_my_single_specific_chatList,
  get_all_conversations_for_user,
  getUserConversationId,
};

export default MessageService;
