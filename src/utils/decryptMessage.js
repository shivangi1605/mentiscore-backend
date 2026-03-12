const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.CHAT_SECRET_KEY;

const decryptMessage = (encryptedText) => {
  if (!encryptedText) return "";

  const [ivHex, encrypted] = encryptedText.split(":");

  const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};

module.exports = decryptMessage;