const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { oauth2Client, SCOPES } = require("../services/googleAuth");

router.get("/login", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);

    // ✅ Set credentials
    oauth2Client.setCredentials(tokens);

    // ✅ Save tokens to file
    fs.writeFileSync(
      path.join(__dirname, "../tokens.json"),
      JSON.stringify(tokens)
    );

    res.send("Google Auth Successful! You can close this tab.");
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

module.exports = router;