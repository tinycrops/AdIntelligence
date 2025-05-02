import { type AdSpot } from "@/lib/types";
import { formatTime } from "@/lib/utils/time";

type AdSpotListProps = {
  adSpots: AdSpot[];
  onRemoveSpot: (spotId: string) => void;
  onJumpToSpot: (timestamp: number) => void;
  disabled?: boolean;
};

export default function AdSpotList({
  adSpots,
  onRemoveSpot,
  onJumpToSpot,
  disabled = false
}: AdSpotListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {adSpots.map((spot) => (
        <div 
          key={spot.id}
          className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer group"
        >
          <div className="w-12 h-12 rounded bg-gray-200 flex-shrink-0 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium">{formatTime(spot.timestamp)}</span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <div className="text-sm font-medium">{spot.type}</div>
            <div className="text-xs text-gray-500">Confidence: {spot.confidence}</div>
          </div>
          <div className="flex items-center">
            <button 
              className="text-gray-400 hover:text-secondary-500 p-1" 
              title="Preview"
              onClick={() => onJumpToSpot(spot.timestamp)}
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              className="text-gray-400 hover:text-red-500 p-1 ml-1" 
              title="Remove"
              onClick={() => onRemoveSpot(spot.id)}
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
