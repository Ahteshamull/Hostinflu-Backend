import userModel from "../schema/user.modal.js";

export const allUser = async (req, res) => {
  let allUser = await userModel.find({});
  return res
    .status(200)
    .send({ success: true, message: "All User Patch", data: allUser });
};
