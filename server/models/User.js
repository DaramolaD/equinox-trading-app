import mongoose from "mongoose";
import { NotFoundError } from "../errors";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: [50, "Name cannot be more than 50 characters"],
      minlength: [3, "Name cannot be less than 3 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
    },
    login_pin: {
      type: String,
      maxlength: [4, "PIN cannot be more than 4 digits"],
      minlength: [4, "PIN cannot be less than 4 digits"],
      match: [/^[0-9]{4}$/, "Please enter a valid 4 digit PIN"],
    },
    phone_number: {
      type: String,
      match: [
        /^[0-9]{10}$/,
        "Please enter a valid 10 digit phone number without space or special characters",
      ],
      unique: true,
      sparse: true,
    },
    date_of_birth: {
      type: Date,
      match: [
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
        "Please enter a valid date of birth in YYYY-MM-DD format",
      ],
    },
    biometric_key: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    wrong_pin_attempts: {
      type: Number,
      default: 0,
    },
    blocked_until_pin: {
      type: Date,
      default: null,
    },
    balance: {
      type: Number,
      default: 50000.0,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

UserSchema.pre("save", async function (next) {
  if (this.isModified("login_pin")) {
    const salt = await bcrypt.genSalt(10);
    this.login_pin = await bcrypt.hash(this.login_pin, salt);
  }
});

UserSchema.statics.updatePIN = async function (email, newPIN) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const isSamePIN = await bcrypt.compare(newPIN, user.login_pin);
    if (isSamePIN) {
      throw new BadRequestError("New PIN cannot be the same as the old PIN");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPIN = await bcrypt.hash(newPIN, salt);
    await this.findOneAndUpdate(
      { email },
      { login_pin: hashedPIN, wrong_pin_attempts: 0, blocked_until_pin: null }
    );
    return { success: true, message: "PIN updated successfully" };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

UserSchema.statics.updatePassword = async function (email, newPassword) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestError(
        "New password cannot be the same as the old password"
      );
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await this.findOneAndUpdate(
      { email },
      {
        password: hashedPassword,
        wrong_pin_attempts: 0,
        blocked_until_pin: null,
      }
    );
    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (this.blocked_until_password && this.blocked_until_password > new Date()) {
    throw new UnauthenticatedError(
      "Invalid Login Attempts Exceeded. Please try again after 30 minutes."
    );
  }
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  if (!isMatch) {
    this.wrong_password_attempts++;
    if (this.wrong_password_attempts >= 3) {
      this.blocked_until_password = new Date(Date.now() + 30 * 60 * 1000);
      await this.save();
      this.wrong_password_attempts = 0;
    }
    await this.save();
  } else {
    this.wrong_password_attempts = 0;
    this.blocked_until_password = null;
    await this.save();
  }
  return isMatch;
};

UserSchema.methods.comparePIN = async function comparePIN(enteredPIN) {
  if (this.blocked_until_pin && this.blocked_until_pin > new Date()) {
    throw new UnauthenticatedError(
      "Invalid Login Attempts Exceeded. Please try again after 30 minutes."
    );
  }
  const hashedPIN = this.login_pin;
  const isMatch = await bcrypt.compare(enteredPIN, hashedPIN);
  if (!isMatch) {
    this.wrong_pin_attempts++;
    if (this.wrong_pin_attempts >= 3) {
      this.blocked_until_pin = new Date(Date.now() + 30 * 60 * 1000);
      this.wrong_pin_attempts = 0;
    }
    await this.save();
  } else {
    this.wrong_pin_attempts = 0;
    this.blocked_until_pin = null;
    await this.save();
  }
  return isMatch;
};

UserSchema.methods.createAccessToken = function () {
  return jwt.sign(
    { userId: this._id, name: this.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

UserSchema.methods.createRefreshToken = function () {
  return jwt.sign(
    { userId: this._id, name: this.name },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

const User = mongoose.model("User", UserSchema);

export default User;
