export type VideoFile = {
  file: File;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type AdSpot = {
  id: string;
  timestamp: number; // in seconds
  type: string; // e.g., "Player Death", "Recall", "Game Pause", etc.
  confidence: string; // "Low", "Medium", or "High"
  description?: string;
  thumbnailUrl?: string;
};

export type ProcessSettings = {
  gameType: string;
  sensitivity: number;
  prioritizeBreaks: boolean;
};

export type AdSettings = {
  adType: string;
  adDuration: number;
};

export type VideoAnalysisResult = {
  adSpots: AdSpot[];
  duration: number;
  analyzedAt: string;
};

export type VideoProcessingResult = {
  downloadUrl: string;
  processingTime: number;
  adSpotsUsed: number;
};
