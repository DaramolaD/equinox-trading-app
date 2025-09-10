import User from "../../models/User";
import OTP from "../../models/Otp";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "../../errors";
import { generateOTP } from "../../service/mailSender";
// import sendEmail from "../../service/mailSender";

const verifyOTP = async (req, res) => {
  const { email, otp, otp_type, data } = req.body;
  if (!email || !otp || !otp_type) {
    throw new BadRequestError("Please provide all values");
  } else if (otp_type === "email" && !data) {
    throw new BadRequestError("Please provide all the values");
  }

  const otpRecord = await OTP.findOne({ email, otp_type }).sort({
    createdAt: -1,
  });
  if (!otpRecord) {
    throw new BadRequestError("Invalid OTP or OTP expired");
  }
  const isVerified = await otpRecord.compareOTP(otp);
  if (!isVerified) {
    throw new BadRequestError("Invalid OTP or OTP expired");
  }
  await OTP.findByIdAndDelete(otpRecord._id);

  switch (otp_type) {
    case "phone":
      await User.findOneAndUpdate({ email }, { phone_number: data });
      break;
    case "email":
      break;
    case "reset_pin":
      if (!data || data.length !== 4) {
        throw new BadRequestError("PIN must be 4 digits");
      }
      await User.updatePIN(email, data);
      break;
    case "reset_password":
      await User.updatePassword(email, data);
      break;
    default:
      throw new BadRequestError("Invalid OTP Request type");
  }
  const user = await User.findOne({ email });
  if (otp_type === "email" && !user) {
    const register_token = jwt.sign({ email }, process.env.REGISTER_SECRET, {
      expiresIn: process.env.REGISTER_SECRET_EXPIRY,
    });
    return res
      .status(StatusCodes.OK)
      .json({
        msg: "OTP verified successfully",
        register_token: register_token,
      });
  }
  res.status(StatusCodes.OK).json({ msg: "OTP verified successfully" });
};

const sendOtp = async (req, res) => {
  const { email, otp_type } = req.body;
  if (!email || !otp_type) {
    throw new BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ email });

  if (!user && otp_type === "phone") {
    throw new BadRequestError("User does not found");
  }

  if (otp_type === "email" && user) {
    throw new BadRequestError("User already exists");
  }

  if(otp_type === "phone" && user.phone_number){
    throw new BadRequestError("Phone number already exists");
  }

  const otp = await generateOTP();
  const otpPayload = { email, otp, otp_type };
  await OTP.create(otpPayload);

  res.status(StatusCodes.OK).json({ msg: "OTP sent successfully" });
};
