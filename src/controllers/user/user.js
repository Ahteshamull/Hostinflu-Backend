
import userModel from "../../models/auth/userModal.js";



export const allUser = async (req, res) => {
  let allUser = await userModel.find({});
  return res
    .status(200)
    .send({ success: true, message: "All User Patch", data: allUser });
};