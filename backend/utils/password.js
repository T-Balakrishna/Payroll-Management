import bcrypt from "bcryptjs";
import { log } from "console";

const getPepper = () => {
  const pepper = process.env.JWT_SECRET;
  if (!pepper) {
    throw new Error("JWT_SECRET is required for password hashing");
  }
  return pepper;
};

const buildPasswordInput = (plainPassword) => {
  return `${String(plainPassword)}::${getPepper()}`;
};

export const hashPassword = async (plainPassword) => {
  const input = buildPasswordInput(plainPassword);
  return bcrypt.hash(input, 10);
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
  const input = buildPasswordInput(plainPassword);
  return bcrypt.compare(input, hashedPassword);
};
