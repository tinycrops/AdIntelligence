import { useEffect, useRef } from "react";
import { type AdSpot } from "@/lib/types";

type TimelineProps = {
  currentTime: number;
  duration: number;
  adSpots: AdSpot[];
  onSeek: (time: number) => void;
  disabled?: boolean;
};

export default function Timeline({
  currentTime,
  duration,
  adSpots,
  onSeek,
  disabled = false
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleTimelineClick = (e: MouseEvent) => {
      if (disabled || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = offsetX / rect.width;
      const seekTime = percentage * duration;
      
      onSeek(seekTime);
    };
    
    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('click', handleTimelineClick);
    }
    
    return () => {
      if (timeline) {
        timeline.removeEventListener('click', handleTimelineClick);
      }
    };
  }, [duration, onSeek, disabled]);
  
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`video-timeline ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      ref={timelineRef}
    >
      <div 
        className="timeline-progress"
        style={{ width: `${progressPercentage}%` }}
      ></div>
      
      <div 
        className="timeline-current"
        style={{ left: `${progressPercentage}%` }}
      ></div>
      
      {/* Ad Markers */}
      {adSpots.map((spot) => {
        const markerPosition = (spot.timestamp / duration) * 100;
        return (
          <div 
            key={spot.id}
            className="timeline-marker group"
            style={{ left: `${markerPosition}%` }}
            title={`Ad Break: ${spot.type} at ${spot.timestamp}s`}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(spot.timestamp);
            }}
          >
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded px-2 py-1 text-xs font-medium invisible group-hover:visible whitespace-nowrap">
              {spot.type}
            </div>
          </div>
        );
      })}
    </div>
  );
}
