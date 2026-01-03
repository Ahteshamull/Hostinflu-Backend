import mongoose from "mongoose";
import messages from "../../message/schema/message.modal.js";
import userModal from "../../auth/schema/auth.modal.js";
import conversations from "../schema/conversition.modal.js";

/**
 * Get all conversations of a user (with optional search)
 */
const getConversation = async (profileId, query) => {
  const profileObjectId = new mongoose.Types.ObjectId(profileId);
  const searchTerm = query?.searchTerm;

  // Build filter: conversations including the current profile
  const filter = { participants: profileObjectId };

  // If searchTerm is provided, restrict to conversations where the other
  // participant's id matches users/providers whose name matches the term.
  if (searchTerm) {
    const matchingUsers = await userModal.find(
      { fullname: { $regex: searchTerm, $options: "i" } },
      "_id"
    );
    const matchingUserIds = matchingUsers.map((u) => u._id);
    if (matchingUserIds.length > 0) {
      // require that participants include at least one of the matching ids
      filter.$and = [
        { participants: profileObjectId },
        { participants: { $in: matchingUserIds } },
      ];
    }
  }

  // Pagination & fields
  const page = parseInt(query?.page, 10) || 1;
  const limit = parseInt(query?.limit, 10) || 10;
  const skip = (page - 1) * limit;
  let q = conversations
    .find(filter)
    .sort({ updatedAt: -1 })
    .populate("lastMessage");
  if (query?.fields) q = q.select(query.fields.split(",").join(" "));
  q = q.skip(skip).limit(limit);
  const currentUserRoleConversation = await q.exec();

  const conversationList = await Promise.all(
    currentUserRoleConversation.map(async (conv) => {
      // find the other participant id
      const otherId = conv.participants.find((p) => p.toString() !== profileId);

      // Try to load as User
      let otherDoc = null;
      if (otherId) {
        otherDoc = await userModal.findById(otherId, "fullname image email");
      }

      const unseenCount = await messages.countDocuments({
        conversationId: conv._id,
        msgByUserId: { $ne: profileObjectId },
        seen: false,
      });

      return {
        _id: conv._id,
        userData: {
          _id: otherDoc?._id,
          name: otherDoc?.fullname,
          profileImage: otherDoc?.image,
        },
        unseenMsg: unseenCount,
        lastMsg: conv.lastMessage,
      };
    })
  );

  const meta = await conversations.countDocuments(filter);

  return {
    meta,
    result: conversationList,
  };
};

/**
 * Get all conversations for an event
 */
const allConversationIntoDb = async (eventId, query = {}) => {
  try {
    const page = parseInt(query?.page, 10) || 1;
    const limit = parseInt(query?.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let q = conversations
      .find({ eventId })
      .populate([
        { path: "participants", select: "fullname image email" },
        { path: "lastMessage", select: "text createdAt msgByUserId seen" },
      ])
      .sort({ updatedAt: -1 });
    if (query?.fields) q = q.select(query.fields.split(",").join(" "));
    q = q.skip(skip).limit(limit);

    const allConversations = await q.exec();
    const meta = await conversations.countDocuments({ eventId });

    return { meta, allConversations };
  } catch (error) {
    throw new Error("Error getting all conversations");
  }
};

/**
 * Get single chat conversation list
 */
const getSingleConversationListIntoDb = async (currentUserRoleId, query) => {
  try {
    const page = parseInt(query?.page, 10) || 1;
    const limit = parseInt(query?.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let q = conversations
      .find({ participants: currentUserRoleId })
      .populate([
        { path: "participants", select: "fullname image email" },
        { path: "lastMessage", select: "text createdAt msgByUserId seen" },
      ])
      .sort({ updatedAt: -1 });
    if (query?.fields) q = q.select(query.fields.split(",").join(" "));
    q = q.skip(skip).limit(limit);

    const allConversations = await q.exec();
    const meta = await conversations.countDocuments({
      participants: currentUserRoleId,
    });

    const allConversationsResolved = await Promise.all(
      allConversations.map(async (conv) => {
        const participantsResolved = await Promise.all(
          (conv.participants || []).map(async (pid) => {
            try {
              const userDoc = await userModal.findById(
                pid,
                "fullname image email"
              );
              if (userDoc) {
                return {
                  _id: userDoc._id,
                  name: userDoc.fullname,
                  image: userDoc.image,
                };
              }
            } catch (err) {
              // ignore and fall through to return raw id
            }
            return { _id: pid };
          })
        );

        return {
          ...conv.toObject(),
          participants: participantsResolved,
        };
      })
    );

    return { meta, allConversations: allConversationsResolved };
  } catch (error) {
    throw new Error("Error getting single conversation list");
  }
};

/**
 * Group conversation list (if you ever re-enable groups)
 */
const getGroupConversationListIntoDb = async (
  eventId,
  currentUserRoleId,
  query
) => {
  try {
    const page = parseInt(query?.page, 10) || 1;
    const limit = parseInt(query?.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let q = conversations
      .find({ _id: eventId })
      .populate([
        { path: "participants", select: "fullname image email" },
        { path: "lastMessage", select: "text createdAt" },
      ])
      .sort({ updatedAt: -1 });
    if (query?.fields) q = q.select(query.fields.split(",").join(" "));
    q = q.skip(skip).limit(limit);

    const allConversations = await q.exec();
    const meta = await conversations.countDocuments({ _id: eventId });

    return { meta, allConversations };
  } catch (error) {
    throw new Error("Error getting group conversation list");
  }
};

const ConversationService = {
  getConversation,
  allConversationIntoDb,
  getSingleConversationListIntoDb,
  getGroupConversationListIntoDb,
};

export default ConversationService;
