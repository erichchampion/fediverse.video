import { useState, useEffect } from "react";
import { useAuth } from "@contexts/AuthContext";
import { storageService } from "@lib/storage";

/**
 * Hook to access user preferences/settings
 * Automatically loads and caches preferences for the current instance
 */
export function useSettings() {
  const { instance } = useAuth();
  const [autoPlayMedia, setAutoPlayMedia] = useState(true);
  const [highQualityUploads, setHighQualityUploads] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instance?.id) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const [autoPlay, highQuality] = await Promise.all([
          storageService.getPreference(instance.id, "autoPlayMedia"),
          storageService.getPreference(instance.id, "highQualityUploads"),
        ]);

        setAutoPlayMedia(autoPlay !== false); // Default to true
        setHighQualityUploads(highQuality !== false); // Default to true
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [instance?.id]);

  return {
    autoPlayMedia,
    highQualityUploads,
    isLoading,
  };
}
