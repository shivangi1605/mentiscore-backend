require("dotenv").config();
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost"
);

const scopes = [
  "https://www.googleapis.com/auth/calendar",
];

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",   // VERY IMPORTANT
  scope: scopes,
});

console.log("Authorize this app by visiting this url:\n", url);