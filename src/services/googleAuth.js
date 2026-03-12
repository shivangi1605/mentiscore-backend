const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

// ✅ Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ Define scopes
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

// ✅ Load saved tokens (if exists)
try {
  const tokens = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../tokens.json"))
  );

  oauth2Client.setCredentials(tokens);
  console.log("✅ Google token loaded successfully");
} catch (err) {
  console.log("⚠️ No saved Google token found. Please login.");
}

module.exports = { oauth2Client, SCOPES };