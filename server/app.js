import "express-async-errors";
import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import swaggerUI from "swagger-ui-express";
import YAML from "yamljs";
import cors from "cors";
import connectDB from "./config/connect.js";
import authRouter from "./routers/auth.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import errorHandlerMiddleware from "./middleware/error-handler.js";
import notFoundMiddleware from "./middleware/not-found.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());

const httpServer = createServer(app);

app.get("/", (req, res) => {
  res.send("<h1>Equinox API</h1><a href='/api-docs'>Documentation</a>");
});

//SWAGGER API DOCS

const swaggerDocument = YAML.load(join(__dirname, "./docs/swagger.yaml"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// ROUTES
// app.use("/api/v1/auth", authRouter);
app.use("/auth", authRouter);

//MIDDLEWARE
app.use(cors());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// START SERVER
const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} ...`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();