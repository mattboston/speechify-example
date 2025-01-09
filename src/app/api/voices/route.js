import { NextResponse } from "next/server";

export async function GET() {
  const speechifyHost = process.env.SPEECHIFY_API || "https://api.sws.speechify.com";
  const speechifyApiKey = process.env.SPEECHIFY_API_KEY;

  const apiRes = await fetch(`${speechifyHost}/v1/voices`, {
    headers: {
      Authorization: `Bearer ${speechifyApiKey}`,
      Accept: '*/*',
    },
  });

  if (apiRes.status !== 200) {
    const errorText = await apiRes.text();
    return NextResponse.json({ error: "Failed to fetch voices", details: errorText }, { status: 500 });
  }

  let voicesData = await apiRes.json();

  // Check if SilkyJohnson is in the list and make it the default if it is
  const silkyJohnsonIndex = voicesData.findIndex(voice => voice.display_name === "SilkyJohnson2");
  if (silkyJohnsonIndex > 0) {  // Ensure it's in the list and not already the first item
    const silkyJohnsonVoice = voicesData.splice(silkyJohnsonIndex, 1)[0];
    voicesData.unshift(silkyJohnsonVoice);  // Move SilkyJohnson to the front of the list
  }

  return NextResponse.json(voicesData);
}