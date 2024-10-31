import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export const generateToken = (userId: string, role: string) => {
  const token = jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: process.env.COOKIE_MAX_AGE,
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
