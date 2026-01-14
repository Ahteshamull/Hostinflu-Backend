import userModel from "../../auth/schema/auth.modal.js";

export const cleanRedeemStars = async () => {
  try {
    console.log("Cleaning invalid redeem stars entries...");

    // Find all users with redeemStars
    const users = await userModel.find({
      redeemStars: { $exists: true, $ne: [] },
    });

    for (const user of users) {
      const validRedeemStars = [];

      for (const item of user.redeemStars) {
        // Check if it's a valid object with collaborationId and stars
        if (
          item &&
          typeof item === "object" &&
          item.collaborationId &&
          item.stars
        ) {
          validRedeemStars.push(item);
        } else {
          // Skip invalid entries (broken string objects)
          console.log(`Removing invalid entry for user ${user._id}`);
        }
      }

      // Update user with only valid redeem stars
      await userModel.findByIdAndUpdate(user._id, {
        redeemStars: validRedeemStars,
      });

      console.log(
        `Cleaned redeem stars for user ${user._id}: ${validRedeemStars.length} valid entries kept`
      );
    }

    console.log("Redeem stars cleanup completed successfully!");
  } catch (error) {
    console.error("Error during redeem stars cleanup:", error);
  }
};
