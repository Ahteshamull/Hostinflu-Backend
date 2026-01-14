import { fixRedeemStars } from "./fixRedeemStars.js";

// Run the migration
fixRedeemStars()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
