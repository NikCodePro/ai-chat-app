import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useAudioPlayer() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  async function playAudio(uri: string) {
    try {
      setIsLoading(true);
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        }
      );
      
      setSound(newSound);
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }

  async function stopAudio() {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  }

  return {
    playAudio,
    stopAudio,
    isPlaying,
    isLoading,
  };
}
