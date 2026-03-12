const crypto = require("crypto");

const algorithm = "aes-256-cbc";

if (!process.env.CHAT_SECRET_KEY) {
  throw new Error("CHAT_SECRET_KEY is missing in .env");
}

const secretKey = Buffer.from(process.env.CHAT_SECRET_KEY, "hex");

console.log("CHAT_SECRET_KEY:", process.env.CHAT_SECRET_KEY); // debug

const ivLength = 16;

// ENCRYPT
exports.encrypt = (text) => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

// DECRYPT
exports.decrypt = (encryptedText) => {
  try {
    if (!encryptedText) return "";

    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return "";
  }
};
