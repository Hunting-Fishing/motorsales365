
// This is a utility file for playing notification sounds

// Audio cache to prevent reloading the same sound
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a notification sound
 * @param sound The sound identifier
 * @returns Promise that resolves when the sound is played
 */
export const playNotificationSound = (sound: string): Promise<void> => {
  return new Promise((resolve) => {
    if (sound === 'none') {
      resolve();
      return;
    }

    try {
      // Use data URLs for simple notification sounds instead of missing files
      const soundMap: Record<string, string> = {
        'default': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'bell': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'chime': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'alert': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
      };

      const soundPath = soundMap[sound] || soundMap.default;

      // Check if we have a cached audio instance
      if (!audioCache[sound]) {
        audioCache[sound] = new Audio(soundPath);
        audioCache[sound].volume = 0.3; // Set a reasonable volume
      }

      const audio = audioCache[sound];
      
      // Reset the audio to the beginning if it's already played
      audio.currentTime = 0;
      
      // Play the sound
      audio.play()
        .then(() => resolve())
        .catch(err => {
          console.warn('Unable to play notification sound:', err);
          resolve(); // Resolve anyway to not block the notification flow
        });

      // Cleanup listeners
      audio.onended = () => resolve();
      audio.onerror = () => {
        console.warn('Error playing notification sound');
        resolve();  // Resolve anyway to not block the notification flow
      };
    } catch (error) {
      console.warn('Error initializing notification sound:', error);
      resolve();  // Resolve anyway to not block the notification flow
    }
  });
};

/**
 * Preload sounds for faster playback
 */
export const preloadNotificationSounds = (): void => {
  const sounds = ['default', 'bell', 'chime', 'alert'];
  
  sounds.forEach(sound => {
    try {
      // Use the same data URLs as above
      const soundMap: Record<string, string> = {
        'default': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'bell': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'chime': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
        'alert': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAiQFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAUON3/LaAg==',
      };

      const audio = new Audio(soundMap[sound]);
      audio.preload = 'auto';
      audio.volume = 0.3;
      audioCache[sound] = audio;
    } catch (error) {
      console.warn(`Failed to preload sound: ${sound}`, error);
    }
  });
};
