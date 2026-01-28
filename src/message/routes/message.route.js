import express from "express";
import { authenticateToken as userAuthMiddleware } from "../../helper/middlewares/auth.middleware.js";
import MessageController from "../controller/message.controller.js";
import { upload } from "../../helper/middlewares/imageControlMiddleware.js";

const router = express.Router();

// Helper middleware to parse files & JSON data
const parseFilesMiddleware = (fields) => (req, _res, next) => {
  try {
    // Handle different JSON formats
    if (req.body.data && typeof req.body.data === "string") {
      req.body = JSON.parse(req.body.data);
    } else if (req.body && typeof req.body === "string") {
      req.body = JSON.parse(req.body);
    }

    next();
  } catch (error) {
    next(new Error("Invalid JSON data"));
  }
};

// localhost:3000/api/v1/message/new_message
router.post(
  "/new_message",
  userAuthMiddleware,
  upload.array("images", 5),
  parseFilesMiddleware(),
  MessageController.new_message,
);

// localhost:3000/api/v1/message/update_message_by_Id/:messageId
router.patch(
  "/update_message_by_Id/:messageId",
  userAuthMiddleware,
  MessageController.updateMessageById,
);

// localhost:3000/api/v1/message/delete_message/:messageId
router.delete(
  "/delete_message/:messageId",
  userAuthMiddleware,
  MessageController.deleteMessageById,
);

// localhost:3000/api/v1/message/find_by_specific_conversation/:conversationId
router.get(
  "/find_by_specific_conversation/:conversationId",
  userAuthMiddleware,
  MessageController.findBySpecificConversation,
);

// localhost:3000/api/v1/message/send-message/:receiverId
router.post(
  "/send-message/:receiverId",
  userAuthMiddleware,
  upload.array("images", 5),
  parseFilesMiddleware(),
  MessageController.send_message_to_user,
);

// localhost:3000/api/v1/message/single_new_message
router.post(
  "/single_new_message",
  userAuthMiddleware,
  upload.array("images", 5),
  (req, res, next) => {
    next();
  },
  parseFilesMiddleware(),
  MessageController.single_new_message,
);

// localhost:3000/api/v1/message/get-chat-list/:conversationId
router.get(
  "/get-chat-list/:conversationId",
  userAuthMiddleware,
  MessageController.get_my_single_specific_chatList_controller,
);

// localhost:3000/api/v1/message/get_single_conversation/:conversationId
router.get(
  "/get_single_conversation/:conversationId",
  userAuthMiddleware,
  MessageController.get_my_single_specific_chatList_controller,
);

// localhost:3000/api/v1/message/get-all-conversations
router.get(
  "/get-all-conversations",
  userAuthMiddleware,
  MessageController.get_all_conversations_controller,
);

// localhost:3000/api/v1/message/get-conversation/:userId/:receiverId
router.get(
  "/get-conversation/:userId/:receiverId",
  userAuthMiddleware,
  MessageController.getUserConversation,
);

// localhost:3000/api/v1/message/get-message-by-receiverId/:receiverId
router.get(
  "/get-message-by-receiverId/:receiverId",
  userAuthMiddleware,
  MessageController.getUserConversation,
);

const messageRoutes = router;

export default messageRoutes;
