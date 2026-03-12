const { google } = require("googleapis");
const { oauth2Client } = require("./googleAuth");

exports.createMeetEvent = async ({ summary, start, end, attendees }) => {
  try {
    console.log("🚀 Creating Google Meet event...");

    // ✅ Create calendar instance HERE (not globally)
    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const event = {
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: Date.now().toString(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    console.log("✅ Meet created successfully");

    return response.data;

  } catch (error) {
    console.error("❌ Google Meet creation failed:", error);
    throw error;
  }
};