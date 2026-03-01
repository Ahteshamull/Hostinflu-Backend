import Calender from "../schema/calender.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Notification from "../../notification/schema/notification.modal.js";

export const createCalenderController = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      startTime,
      endTime,
      country,
      city,
      fullAddress,
    } = req.body;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate required fields
    if (!startDate || !endDate || !startTime || !endTime || !country || !city) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: startDate, endDate, startTime, endTime, country, city",
      });
    }

    // Create new calendar entry
    const calender = await Calender.create({
      creatorId: userId,
      startDate,
      endDate,
      startTime,
      endTime,
      country,
      city,
      fullAddress,
    });

    // Populate the creatorId field with user details
    const populatedCalender = await Calender.findById(calender._id).populate(
      "creatorId",
      "name email image role",
    );

    // Find all hosts in the same city
    const hostsInCity = await userModel.find({
      role: "host",
      city: { $regex: new RegExp(`^${city}$`, "i") }, // Case-insensitive city match
    });

    // Create notifications for all hosts in the city
    if (hostsInCity.length > 0) {
      const influencerName = populatedCalender.creatorId.name;
      const notificationPromises = hostsInCity.map((host) => {
        return Notification.create({
          type: "influencer_city_visit",
          title: "Influencer Visiting Your City",
          message: `${influencerName} is visiting ${city} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Check their availability for collaboration!`,
          receiverId: host._id,
          receiverRole: "host",
          createdBy: userId,
          collaborationId: null,
        });
      });

      await Promise.all(notificationPromises);
    }

    res.status(201).json({
      success: true,
      message: "Calendar created successfully",
      data: populatedCalender,
      hostsNotified: hostsInCity.length,
    });
  } catch (error) {
    console.error("Error creating calendar:", error);
    res.status(500).json({
      success: false,
      message: "Error creating calendar",
      error: error.message,
    });
  }
};

export const getDateInfluencer = async (req, res) => {
  try {
    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Get calendar entries for the user
    const calendarEntries = await Calender.find({ creatorId: userId }).populate(
      "creatorId",
      "name email image",
    );

    res.status(200).json({
      success: true,
      message: "Calendar entries retrieved successfully",
      data: calendarEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving calendar entries",
      error: error.message,
    });
  }
};
