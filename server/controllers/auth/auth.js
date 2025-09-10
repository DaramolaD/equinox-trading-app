import User from "../../models/User";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "../../errors";
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
  res.status(StatusCodes.OK).json({
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

const refreshToken = async (req, res) => {
  const { type, refresh_token } = req.body;
  if (!type || !["socket", "app"].includes(type) || !refresh_token) {
    throw new BadRequestError("Invalid body");
  }
  try {
    let accessToken, new_refresh_token;
    if (type === "socket") {
      ({ accessToken, new_refresh_token } = await generateRefreshTokens(
        refresh_token,
        process.env.REFRESH_SOCKET_TOKEN_SECRET,
        process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
        process.env.SOCKET_TOKEN_SECRET,
        process.env.SOCKET_TOKEN_EXPIRY
      ));
    } else if (type === "app") {
      ({ accessToken, new_refresh_token } = await generateRefreshTokens(
        refresh_token,
        process.env.REFRESH_SECRET_SECRET,
        process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
        process.env.JWT_SECRET,
        process.env.ACCESS_TOKEN_EXPIRY
      ));
    }
    res.status(StatusCodes.OK).json({ access_token: accessToken, refresh_token: new_refresh_token });
  } catch (error) {
    console.log(error);
    throw new UnauthenticatedError("Invalid Token");
  }
};

async function generateRefreshTokens(
  token,
  refresh_secret,
  refresh_expiry,
  access_secret,
  access_expiry
) {
  try {
    const payload = jwt.verify(token, refresh_secret);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const access_token = jwt.sign({ userId: payload.userId }, access_secret, {
      expiresIn: access_expiry,
    });
    const new_refresh_token = jwt.sign(
      { userId: payload.userId },
      refresh_secret,
      { expiresIn: refresh_expiry }
    );
    return { access_token, new_refresh_token };
  } catch (error) {
    console.log(error);
    throw new UnauthenticatedError("Invalid Token");
  }
}

const logout = async (req, res) => {
  const accessToken = req.headers.authorization.split(" ")[1] 
  const decodedToken = jwt.decode(accessToken, process.env.JWT_SECRET)
  const userId = decodedToken.userId;
  await User.updateOne(({_id: userId}, {$unset: {biometric_key: 1}}))
  res.status(StatusCodes.OK).json({message: "User logged out successfully"})
};

export { register, login, refreshToken, logout };
