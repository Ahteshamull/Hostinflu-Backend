import userModel from "../../auth/schema/auth.modal.js";

export const fixRedeemStars = async () => {
  try {
    console.log("Starting redeem stars migration...");

    // Find all users with redeemStars
    const users = await userModel.find({
      redeemStars: { $exists: true, $ne: [] },
    });

    for (const user of users) {
      const fixedRedeemStars = [];

      for (const item of user.redeemStars) {
        // Check if it's a string (old format) or object (new format)
        if (typeof item === "string") {
          // Parse old string format "collabId:stars" or just "stars"
          if (item.includes(":")) {
            const [collabId, stars] = item.split(":");
            fixedRedeemStars.push({
              collaborationId: collabId,
              stars: parseInt(stars) || 0,
              createdAt: new Date(),
            });
          } else {
            // Just a number, no collaboration ID
            fixedRedeemStars.push({
              collaborationId: null,
              stars: parseInt(item) || 0,
              createdAt: new Date(),
            });
          }
        } else if (item && typeof item === "object") {
          // Check if it's already in correct format
          if (item.collaborationId && item.stars) {
            fixedRedeemStars.push(item);
          } else if (item._id && Object.keys(item).some((key) => !isNaN(key))) {
            // This is the broken string object format - skip it
            console.log(`Skipping broken entry for user ${user._id}`);
            continue;
          }
        }
      }

      // Update user with fixed redeem stars
      await userModel.findByIdAndUpdate(user._id, {
        redeemStars: fixedRedeemStars,
      });

      console.log(
        `Fixed redeem stars for user ${user._id}: ${fixedRedeemStars.length} entries`
      );
    }

    console.log("Redeem stars migration completed successfully!");
  } catch (error) {
    console.error("Error during redeem stars migration:", error);
  }
};
