import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { mailSender } from "../service/mailSender";

const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 15 * 60 * 1000,
    },
    otp_type: {
        type: String,
        enum: ["email", "phone", "reset_password", "reset_pin"],
        required: true,
    },
}, { timestamps: true });

OTPSchema.pre("save", async function(next) {
    if (this.isNew) {
        const salt = await bcrypt.genSalt(10);
        await sendVerificationEmail(this.email, this.otp, this.otp_type);
        this.otp = await bcrypt.hash(this.otp, salt);
    }
    next();
});

OTPSchema.methods.compareOTP = async function(enteredOtp) {
    return await bcrypt.compare(enteredOtp, this.otp);
}

async function sendVerificationEmail(email, otp, otp_type) {
   try {
    // const mailResponse = await mailSender(email, otp, otp_type);
    await mailSender(email, otp, otp_type);
    // return mailResponse;
   } catch (error) {
    console.log(error);
    throw error;
   }
}

const OTP = mongoose.model("Otp", OTPSchema);

export default OTP;
