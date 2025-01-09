import { useState, useRef, useEffect } from "react";
import VoiceSelector from "../app/components/VoiceSelector";

// The MIME type of the audio stream
const AUDIO_MIME_TYPE = "audio/mpeg";

// Function to get the audio stream from the Speechify AI API
function getAudioStream(speechifyAuthToken, inputText, voiceId) {
  const speechifyHost =
    process.env.NEXT_PUBLIC_SPEECHIFY_API || "https://api.sws.speechify.com";

  // Use the access token that you obtained from the /api/token route
  if (!speechifyAuthToken) {
    console.error("Unauthorized");
    return;
  }

  // Request the audio stream _directly_ from the Speechify AI API.
  // This is the most efficient way to stream audio from the Speechify AI API,
  // made possible thanks to the access token.
  return fetch(`${speechifyHost}/v1/audio/stream`, {
    method: "POST",
    headers: {
      // The Authorization header should contain the access token
      Authorization: `Bearer ${speechifyAuthToken}`,
      // The payload is JSON
      "Content-Type": "application/json",
      // The expected MIME type of the audio stream
      Accept: AUDIO_MIME_TYPE,
    },
    body: JSON.stringify({
      input: inputText,
      voice_id: voiceId,
    }),
  });
}

async function playAudioStream(
  sourceBuffer,
  audioPlayer,
  speechifyAuthToken,
  inputText,
  voiceId
) {
  // Fetch the audio stream from the Speechify AI API
  const audioStreamRes = await getAudioStream(
    speechifyAuthToken,
    inputText,
    voiceId
  );
  if (!audioStreamRes.ok) {
    console.error("Network response was not ok");
    return;
  }
  if (!audioStreamRes.body) {
    console.error("Response body is null");
    return;
  }
  // this is a test

  // Read the audio stream as a ReadableStream
  const reader = audioStreamRes.body.getReader();
  let isFirstChunk = true;
  let initialBuffer = [];
  const INITIAL_CHUNKS = 3; // Number of chunks to buffer before starting playback

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (isFirstChunk) {
      initialBuffer.push(value);
      if (initialBuffer.length === INITIAL_CHUNKS) {
        // Append initial buffered chunks
        for (const chunk of initialBuffer) {
          sourceBuffer.appendBuffer(chunk);
          await new Promise((resolve) => {
            sourceBuffer.onupdateend = resolve;
          });
        }
        isFirstChunk = false;
        audioPlayer.play();
      }
    } else {
      // Append subsequent chunks normally
      sourceBuffer.appendBuffer(value);
      await new Promise((resolve) => {
        sourceBuffer.onupdateend = resolve;
      });
    }
  }
}

async function runTextToSpeech(
  mediaSource,
  sourceBuffer,
  audioPlayer,
  speechifyAuthToken,
  inputText,
  voiceId
) {
  if (!inputText) {
    return;
  }

  const play = () => {
    playAudioStream(
      sourceBuffer,
      audioPlayer,
      speechifyAuthToken,
      inputText,
      voiceId
    );
  };

  // Ensure the media source is open before playing the audio stream
  if (mediaSource.readyState === "open") {
    play();
  } else {
    mediaSource.addEventListener("sourceopen", play);
  }
}

export default function Main() {
  const [input, setInput] = useState("");
  const [showAudio, setShowAudio] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState("henry");
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);

  useEffect(() => {
    // Initialize MediaSource only on client side
    if (typeof window !== "undefined") {
      mediaSourceRef.current = new MediaSource();
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(mediaSourceRef.current);
      }
    }
  }, []);

  useEffect(() => {
    // Set up MediaSource when it's ready
    if (mediaSourceRef.current) {
      mediaSourceRef.current.addEventListener("sourceopen", () => {
        try {
          if (
            !sourceBufferRef.current &&
            mediaSourceRef.current.readyState === "open"
          ) {
            sourceBufferRef.current =
              mediaSourceRef.current.addSourceBuffer(AUDIO_MIME_TYPE);
          }
        } catch (error) {
          console.warn("Error adding source buffer:", error);
        }
      });
    }
  }, []);

  // Get the token when component mounts
  useEffect(() => {
    fetch("/api/token", {
      method: "POST",
    })
      .then((res) => res.json())
      .then(({ token }) => setAuthToken(token));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input) return;

    setShowAudio(true);

    // Reset MediaSource for new conversion
    if (mediaSourceRef.current) {
      if (mediaSourceRef.current.readyState === "open") {
        mediaSourceRef.current.endOfStream();
      }
      mediaSourceRef.current = new MediaSource();
      audioRef.current.src = URL.createObjectURL(mediaSourceRef.current);
      sourceBufferRef.current = null;
    }

    // Wait for MediaSource to be ready
    await new Promise((resolve) => {
      mediaSourceRef.current.addEventListener("sourceopen", resolve, {
        once: true,
      });
    });

    // Add source buffer
    try {
      sourceBufferRef.current =
        mediaSourceRef.current.addSourceBuffer(AUDIO_MIME_TYPE);
    } catch (error) {
      console.warn("Error adding source buffer:", error);
      return;
    }

    runTextToSpeech(
      mediaSourceRef.current,
      sourceBufferRef.current,
      audioRef.current,
      authToken,
      input,
      selectedVoice
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          name="input"
          placeholder="Type your text here"
          className="w-full rounded py-3 px-2"
          rows="8"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <VoiceSelector
          onVoiceSelect={(voiceId) => setSelectedVoice(voiceId)}
          selectedVoice={selectedVoice}
        />
        <button
          type="submit"
          className="mt-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Convert text to speech
        </button>
      </form>

      <audio
        ref={audioRef}
        controls
        className={`mt-6 w-full${showAudio ? "" : " hidden"}`}
      />
    </div>
  );
}
