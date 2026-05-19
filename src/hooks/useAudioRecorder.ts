import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export function useAudioRecorder() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [metering, setMetering] = useState<number>(-160);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const response = await requestPermission();
        if (response.status !== 'granted') {
          throw new Error('Permission to access microphone was denied');
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering !== undefined) {
            setMetering(status.metering);
          }
        },
        100 // update interval ms
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (!recording) return null;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setMetering(-160);
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordingUri,
    metering,
    hasPermission: permissionResponse?.status === 'granted',
  };
}
