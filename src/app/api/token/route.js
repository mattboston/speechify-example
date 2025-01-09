import { NextResponse } from "next/server";

export async function POST() {
  const speechifyHost =
    process.env.SPEECHIFY_API || "https://api.sws.speechify.com";
  const speechifyApiKey = process.env.SPEECHIFY_API_KEY;

  const apiRes = await fetch(`${speechifyHost}/v1/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${speechifyApiKey}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "audio:all voices:all",
    }).toString(),
  });

  if (apiRes.status !== 200) {
    console.log(`Token error: ${await apiRes.text()}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenData = await apiRes.json();
  return NextResponse.json({ token: tokenData.access_token });
}
