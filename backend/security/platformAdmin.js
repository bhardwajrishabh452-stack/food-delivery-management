import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";
import { createUser, findUserByEmail, listUsers } from "../repositories/userRepository.js";
import { hashPassword } from "./passwords.js";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const ensurePlatformAdmin = async () => {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() || "";
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const configured = Boolean(email || password);
  const administrators = listUsers().filter((user) => user.role === "admin");

  if (!configured) {
    if (administrators.length > 1) {
      throw new Error("Only one platform administrator is allowed");
    }
    if (administrators.length === 1) return administrators[0];
    if (process.env.NODE_ENV === "production") {
      throw new Error("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required to provision the platform administrator");
    }
    return null;
  }

  if (
    !email ||
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    !isValidEmail(email)
  ) {
    throw new Error("Configure a valid PLATFORM_ADMIN_EMAIL and a 12-to-72-byte PLATFORM_ADMIN_PASSWORD");
  }
  if (administrators.length > 1) {
    throw new Error("Only one platform administrator is allowed");
  }

  const existingUser = findUserByEmail(email);
  if (existingUser && existingUser.role !== "admin") {
    throw new Error("PLATFORM_ADMIN_EMAIL belongs to an account that is not an administrator");
  }
  if (administrators.length === 1 && !existingUser) {
    throw new Error("PLATFORM_ADMIN_EMAIL must match the existing platform administrator");
  }
  if (existingUser) return existingUser;

  const administrator = {
    _id: createId(),
    name: process.env.PLATFORM_ADMIN_NAME?.trim() || "Platform Administrator",
    email,
    password: await hashPassword(password),
    role: "admin",
    isActive: true,
    createdAt: new Date().toISOString()
  };
  await runInMemoryTransaction(["users"], () => createUser(administrator), administrator);
  return administrator;
};
