import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import fs from "fs";
import inlineCss from "inline-css";

export const mailSender = async (email, otp, otp_type) => {
  let htmlContent = fs.readFileSync("otp_template.html", "utf8");
  htmlContent = htmlContent.replace("Equinox_otp", otp);
  htmlContent = htmlContent.replace("Equinox_otp2", otp_type);

  const options = {
    url: "http://localhost:3000/otp_template.html",
    headers: {
      "Content-Type": "text/html",
    },
    body: htmlContent,
  };

  htmlContent = await inlineCss(htmlContent, options);

  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      // service: process.env.MAIL_SERVICE,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    let result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Equinox Trading App - OTP Verification",
      html: htmlContent,
    });
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
};



export const generateOTP = () => {
    const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });
    return otp;
};