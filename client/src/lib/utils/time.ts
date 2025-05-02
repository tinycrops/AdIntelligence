/**
 * Formats seconds into MM:SS format
 * 
 * @param seconds - Time in seconds to format
 * @returns Formatted time string in MM:SS format
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Converts a timestamp string (MM:SS) to seconds
 * 
 * @param timestamp - Time string in MM:SS format
 * @returns Time in seconds
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return (minutes * 60) + seconds;
  }
  
  return 0;
}

/**
 * Calculates percentage position on a timeline
 * 
 * @param current - Current time in seconds
 * @param total - Total duration in seconds
 * @returns Percentage position (0-100)
 */
export function calculateTimelinePosition(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current / total) * 100;
}
