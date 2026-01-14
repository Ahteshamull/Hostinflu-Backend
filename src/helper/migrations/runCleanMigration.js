import { cleanRedeemStars } from "./cleanRedeemStars.js";

// Run the cleanup
cleanRedeemStars()
  .then(() => {
    console.log("Cleanup script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });
