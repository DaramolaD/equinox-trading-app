import { StatusCodes } from "http-status-codes";
import { UnauthenticatedError } from "../../errors";
import User from "../../models/User";

const uploadBiometric = async (req, res) => {
  const { public_key } = req.body;
  if (!public_key) {
    throw new BadRequestError("Public key is required");
  }

  const accessToken = req.headers.authorization.split(" ")[1];
  const decodedToken = jwt.decode(accessToken, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { biometric_key: public_key },
    { new: true, runValidators: true }
  );
  res
    .status(StatusCodes.OK)
    .json({ message: "Biometric key uploaded successfully" });
};

const verifyBiometrics = async (req, res) => {
  const { signature } = req.body;
  if (!signature) {
    throw new BadRequestError("Signature is required");
  }
  const accessToken = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const user = await User.findById(userId);
  if (!user.biometric_key) {
    throw new UnauthenticatedError("Biometric key is not found");
  }
  const isVerifyingSignature = new verifySignature(
    signature,
    user.id,
    user.biometric_key
  );
  if (!isVerifyingSignature) {
    throw new UnauthenticatedError("Invalid signature");
  }
  const access_token = await jwt.sign(
    { userId: userId },
    process.env.SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.SOCKET_TOKEN_EXPIRY,
    }
  );
  const refresh_token = await jwt.sign(
    { userId: userId },
    process.env.REFRESH_SOCKET_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
    }
  );
  user.blocked_until_pin = null;
  user.wrong_pin_attempts = 0;
  await user.save();

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      socket_tokens: {
        socket_access_token: access_token,
        socket_refresh_token: refresh_token,
      },
    });
};

async function verifySignature(signature, payload, public_key) {  
    const publicKeyBuffer = Buffer.from(public_key, "base64");
    const key = new NodeRSA();
    const signedData = key.importKey(publicKeyBuffer, "public-der");
    const signatureVerifier = signedData.verify(
        Buffer.from(payload),
        signature,
        "utf8",
        "base64"
    )
    return signatureVerifier;
}

export { uploadBiometric, verifyBiometrics };
