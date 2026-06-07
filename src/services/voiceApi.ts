/**
 * voiceApi.ts
 * API service for the Voice Assistant feature (Record → Process → Respond).
 */

import { CHAT_API_BASE_URL } from "./chatApi";

export interface VoiceProcessResponse {
  success: boolean;
  transcript: string;
  response_text: string;
  audio_base64: string;
}

/**
 * Upload a recorded audio file to the backend for STT → Gemini → TTS processing.
 * @param audioUri  Local file URI from expo-av recording
 * @param token     User access token for authentication
 */
export async function processVoiceMessage(
  audioUri: string,
  token: string
): Promise<VoiceProcessResponse> {
  const formData = new FormData();

  formData.append("audio_file", {
    uri: audioUri,
    type: "audio/m4a",
    name: "voice_recording.m4a",
  } as any);

  const response = await fetch(`${CHAT_API_BASE_URL}/voice/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // ⚠️ Do NOT set Content-Type manually — fetch sets it with the multipart boundary
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Voice processing failed";
    try {
      const error = await response.json();
      errorMessage = error.detail || error.message || errorMessage;
    } catch (_) {
      // Ignore parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
