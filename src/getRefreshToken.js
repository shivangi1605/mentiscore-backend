const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  "YOUR_CLIENT_ID",
  "YOUR_CLIENT_SECRET",
  "http://localhost:3000/auth/google/callback"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar"],
});

console.log("Authorize this app:", authUrl);
