import User from "../../models/User";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../../errors";
import jwt from "jsonwebtoken";

const register = async (req, res) => {
  const { email, password, register_token } = req.body;
  if (!email || !password || !register_token) {
    throw new BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ email });
  if (user) {
    throw new BadRequestError("User already exists");
  }
  try {
    const payload = jwt.verify(register_token, process.env.JWT_SECRET);
    if (payload.email !== email) {
      throw new BadRequestError("Invalid register token");
    }
    const newUser = await User.create({ email, password });
    const accessToken = newUser.createAccessToken();
    const refreshToken = newUser.createRefreshToken();
    res.status(StatusCodes.CREATED).json({
      email: newUser.email,
      userId: newUser.id,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    throw new BadRequestError("Invalid Body");
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError("Invalid Credentials");
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    let message;
    if (
      user.blocked_until_password &&
      user.blocked_until_password > new Date()
    ) {
      const remainingTime = Math.ceil(
        (user.blocked_until_password - new Date()) / (1000 * 60)
      );
      message = `Your account is blocked due to multiple wrong password attempts. Please try again after ${user.blocked_until_password.toLocalString()} minute(s).`;
    } else {
      const attemptsRemaining = -user.wrong_password_attempts;
      message =
        attemptsRemaining > 0
          ? `Invalid Password. You have ${attemptsRemaining} attempt(s) remaining.`
          : "Invalid Login Attempts Exceeded. You have been blocked due to multiple wrong password attempts. Please try again after 30 minutes.";
    }
    throw new UnauthenticatedError(message);
  }
  const accessToken = user.createAccessToken();
  const refreshToken = user.createRefreshToken();

  let phone_exists = false;
  let login_pin_exists = false;
  if (user.phone_number) {
    phone_exists = true;
  }
  if (user.login_pin) {
    login_pin_exists = true;
  }
  res
    .status(StatusCodes.OK)
    .json({
      user: {
        name: user.name,
        email: user.email,
        userId: user._id,
        phone_exists,
        login_pin_exists,
      },
      tokens: { accessToken, refreshToken },
    });
};

export { register, login };