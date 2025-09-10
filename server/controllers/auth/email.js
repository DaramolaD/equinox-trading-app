import User from "../../models/User";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors";
import { generateOTP } from "../../service/mailSender";
import OTP from "../../models/Otp";

const checkEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError("Email is required");
  }

  let isExist = true;
  let user = await User.findOne({ email });

  if (!user) {
    const otp = await generateOTP();
    await OTP.create({ email, otp, otp_type: "email" });
    isExist = false;
  }
  return res.status(StatusCodes.OK).json({ isExist });
};

export { checkEmail };
