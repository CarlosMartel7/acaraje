import { google } from "googleapis";

export function getGoogleDriveClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceKey = process.env.GOOGLE_SERVICE_KEY;

  if (keyFile) {
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  }

  if (!serviceKey) {
    throw new Error("Set GOOGLE_SERVICE_KEY or GOOGLE_APPLICATION_CREDENTIALS");
  }

  let credentials: object;
  try {
    credentials = typeof serviceKey === "string" ? JSON.parse(serviceKey) : serviceKey;
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_KEY must be valid JSON. Use a single line or set GOOGLE_APPLICATION_CREDENTIALS to a JSON file path."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}
