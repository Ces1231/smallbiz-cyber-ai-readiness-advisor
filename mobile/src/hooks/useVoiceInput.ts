/**
 * useVoiceInput — records audio via expo-av and sends to backend /ai/transcribe.
 * Falls back gracefully if recording fails or backend returns no text.
 */
import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export function useVoiceInput() {
  const { token } = useAuthStore();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Cleanup: unload recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  async function startRecording(): Promise<void> {
    setError(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied. Please enable it in your device settings.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = newRecording;
      setRecording(true);
    } catch (exc: any) {
      setError('Could not start recording. Please try again.');
      setRecording(false);
    }
  }

  async function stopRecording(): Promise<string | null> {
    if (!recordingRef.current) {
      setRecording(false);
      return null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      setRecording(false);

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setError('No audio recorded. Please try again.');
        return null;
      }

      if (!token) {
        setError('Not logged in.');
        return null;
      }

      // Send audio to backend /ai/transcribe as multipart FormData
      const filename = uri.split('/').pop() ?? 'audio.m4a';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'm4a';
      const mimeMap: Record<string, string> = {
        m4a: 'audio/m4a',
        wav: 'audio/wav',
        aac: 'audio/aac',
        mp4: 'audio/mp4',
      };
      const mimeType = mimeMap[ext] ?? 'audio/m4a';

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: filename,
        type: mimeType,
      } as any);

      const resp = await fetch(`${BASE_URL}/ai/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type — fetch sets it automatically for FormData
        },
        body: formData,
      });

      if (!resp.ok) {
        setError('Transcription request failed. Please try again.');
        return null;
      }

      const data = await resp.json();
      if (!data.text) {
        setError(data.message ?? 'Could not transcribe audio — try again.');
        return null;
      }

      setError(null);
      return data.text as string;
    } catch (exc: any) {
      setRecording(false);
      recordingRef.current = null;
      setError('Transcription failed. Please try again.');
      return null;
    }
  }

  return { recording, startRecording, stopRecording, error };
}
