import { pbkdf2, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const pbkdf2Async = promisify(pbkdf2);
const HASH_SCHEME = "pbkdf2-sha256";
const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

const assertBcryptPassword = (password) => {
  if (
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES
  ) {
    throw new Error("Password must not exceed 72 UTF-8 bytes when using bcrypt");
  }
};

export const hashPassword = async (password) => {
  assertBcryptPassword(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const hashPasswordSync = (password) => {
  assertBcryptPassword(password);
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
};

export const passwordNeedsRehash = (storedHash) =>
  typeof storedHash === "string" && storedHash.startsWith(`${HASH_SCHEME}$`);

const verifyPbkdf2Password = async (password, storedHash) => {
  const [scheme, iterationText, saltHex, expectedHex, ...extra] = storedHash.split("$");
  const iterations = Number(iterationText);
  if (
    scheme !== HASH_SCHEME ||
    extra.length > 0 ||
    !Number.isInteger(iterations) ||
    iterations < 100000 ||
    iterations > 1000000 ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{64}$/i.test(expectedHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await pbkdf2Async(password, salt, iterations, expected.length, "sha256");
  return timingSafeEqual(actual, expected);
};

export const verifyPassword = async (password, storedHash) => {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  if (passwordNeedsRehash(storedHash)) {
    return verifyPbkdf2Password(password, storedHash);
  }
  if (/^\$2[aby]\$/.test(storedHash)) {
    if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) return false;
    return bcrypt.compare(password, storedHash);
  }
  return false;
};
