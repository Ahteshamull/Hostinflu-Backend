import MessageService from "../service/message.service.js";

// Create a new message
const new_message = async (req, res) => {
  const result = await MessageService.new_message_IntoDb(
    req.user,
    req.body,
    req.files,
  );

  res.status(201).json({
    success: true,
    message: "Successfully sent the message",
    data: result,
  });
};

// Update a message by ID
const updateMessageById = async (req, res) => {
  const result = await MessageService.updateMessageById_IntoDb(
    req.params.messageId,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Successfully updated the message",
    data: result,
  });
};

// Delete a message by ID
const deleteMessageById = async (req, res) => {
  const result = await MessageService.deleteMessageById_IntoDb(
    req.params.messageId,
  );
  res.status(200).json({
    success: true,
    message: "Successfully deleted the message",
    data: result,
  });
};

// Find all messages for a specific conversation
const findBySpecificConversation = async (req, res) => {
  const result = await MessageService.findBySpecificConversationInDb(
    req.params.conversationId,
    req.query,
  );
  res.status(200).json({
    success: true,
    message: "Successfully retrieved all messages",
    data: result,
  });
};

// Send message to specific user
const send_message_to_user = async (req, res) => {
  const receiverId = req.params.receiverId;
  const messageData = {
    ...req.body,
    receiverId,
  };

  const result = await MessageService.single_new_message_IntoDb(
    req.user,
    messageData,
    req.files,
  );
  res.status(200).json({
    success: true,
    message: "Successfully sent the message",
    data: result,
  });
};

// Send a single (direct) message
const single_new_message = async (req, res) => {
  const result = await MessageService.single_new_message_IntoDb(
    req.user,
    req.body,
    req.files,
  );
  res.status(200).json({
    success: true,
    message: "Successfully sent the message",
    data: result,
  });
};

const get_my_single_specific_chatList_controller = async (req, res) => {
  const result = await MessageService.get_my_single_specific_chatList(
    req.params.conversationId,
    req.query,
  );

  res.status(200).json({
    success: true,
    message: "Successfully Find My Chat List",
    data: result,
  });
};

const get_all_conversations_controller = async (req, res) => {
  const userId = req.user._id || req.user.id || req.user;

  const result = await MessageService.get_all_conversations_for_user(
    userId,
    req.query,
  );

  res.status(200).json({
    success: true,
    message: "Successfully retrieved all conversations",
    data: result,
  });
};

const getUserConversation = async (req, res) => {
  const { receiverId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!receiverId) {
    return res.status(400).json({
      success: false,
      message: "Receiver ID is required",
    });
  }

  try {
    const result = await MessageService.getUserConversationId(
      req.user.id,
      receiverId,
      { page, limit },
    );
    res.status(200).json({
      success: true,
      message: "Successfully retrieved conversation messages",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving conversation",
      error: error.message,
    });
  }
};

const MessageController = {
  new_message,
  updateMessageById,
  deleteMessageById,
  findBySpecificConversation,
  send_message_to_user,
  single_new_message,
  get_my_single_specific_chatList_controller,
  get_all_conversations_controller,
  getUserConversation,
};

export default MessageController;
