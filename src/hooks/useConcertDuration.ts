import { useState, useEffect, useCallback } from "react";

export const useConcertDuration = (startedAt: string | null, isLive: boolean) => {
  const [duration, setDuration] = useState<number>(0);
  const [formattedDuration, setFormattedDuration] = useState<string>("00:00:00");

  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!isLive || !startedAt) {
      setDuration(0);
      setFormattedDuration("00:00:00");
      return;
    }

    const startTime = new Date(startedAt).getTime();

    const updateDuration = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setDuration(elapsed);
      setFormattedDuration(formatDuration(elapsed));
    };

    // Update immediately
    updateDuration();

    // Then update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isLive, formatDuration]);

  return { duration, formattedDuration };
};
