const { google } = require("googleapis");
const { oauth2Client } = require("./googleAuth");

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

exports.sendMail = async (to, subject, body) => {
  const message = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    `Subject: ${subject}`,
    "",
    body
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
};
