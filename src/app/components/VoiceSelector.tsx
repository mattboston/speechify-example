import React, { useState, useEffect } from "react";

interface Voice {
  id: string;
  display_name: string;
  models: Array<{
    name: string;
    languages: Array<{
      locale: string;
    }>;
  }>;
}

interface VoiceSelectorProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoice: string;
}

export default function VoiceSelector({ onVoiceSelect, selectedVoice }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("/api/voices");
        if (!response.ok) throw new Error("Failed to fetch voices");
        const data = await response.json();
        
        setVoices(data);
        const silkyVoice = data.find(voice => voice.display_name === "SilkyJohnson");
        if (silkyVoice) {
          onVoiceSelect(silkyVoice.id);
        } else if (data.length > 0 && !selectedVoice) {
          onVoiceSelect(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
      }
    };

    fetchVoices();
  }, []);

  return (
    <div className="mb-4 max-w-md">
      <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
        Select Voice
      </label>
      <select
        id="voice"
        value={selectedVoice}
        onChange={(e) => onVoiceSelect(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.display_name}
          </option>
        ))}
      </select>
    </div>
  );
} 