import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/environment";

dotenv.config();

const JWT_SECRET = envConfig.JWT_SECRET;

export const generateToken = (userId: string, role: string) => {
  const token = jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: envConfig.COOKIE_MAX_AGE,
  });
  return token;
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};
