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

    // Find all hosts in the same city (exact match, case-insensitive)
    const normalizedCity = city.toLowerCase().trim();

    const hostsInCity = await userModel.find({
      role: "host",
    });

    // Filter hosts by exact city match (case-insensitive)
    const matchedHosts = hostsInCity.filter((host) => {
      const hostCity = (host.city || "").toLowerCase().trim();
      const isMatch = hostCity === normalizedCity;

      return isMatch;
    });

    // Create notifications for all hosts in the city
    if (matchedHosts.length > 0) {
      const influencerName = populatedCalender.creatorId.name;
      const notificationPromises = matchedHosts.map((host) => {
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
      hostsNotified: matchedHosts.length,
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

export const updateCalenderController = async (req, res) => {
  try {
    const { id } = req.params;
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

    // Find the calendar entry
    const calender = await Calender.findById(id);

    if (!calender) {
      return res.status(404).json({
        success: false,
        message: "Calendar entry not found",
      });
    }

    // Check if the user is the creator of the calendar entry
    if (calender.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this calendar entry",
      });
    }

    // Update the calendar entry
    const updatedCalender = await Calender.findByIdAndUpdate(
      id,
      {
        startDate,
        endDate,
        startTime,
        endTime,
        country,
        city,
        fullAddress,
      },
      { new: true, runValidators: true },
    ).populate("creatorId", "name email image role");

    res.status(200).json({
      success: true,
      message: "Calendar updated successfully",
      data: updatedCalender,
    });
  } catch (error) {
    console.error("Error updating calendar:", error);
    res.status(500).json({
      success: false,
      message: "Error updating calendar",
      error: error.message,
    });
  }
};
