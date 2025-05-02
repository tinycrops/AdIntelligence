import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Timeline from "@/components/timeline";
import AdSpotList from "@/components/ad-spot-list";
import ProcessingOverlay from "@/components/processing-overlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/utils/time";
import { type VideoFile, type AdSpot } from "@/lib/types";

type VideoPreviewProps = {
  videoFile: VideoFile | null;
  adSpots: AdSpot[];
  isProcessing: boolean;
  processingStatus: string;
  processingProgress: number;
  onRemoveAdSpot: (spotId: string) => void;
  onGenerateVideo: () => void;
};

export default function VideoPreview({
  videoFile,
  adSpots,
  isProcessing,
  processingStatus,
  processingProgress,
  onRemoveAdSpot,
  onGenerateVideo,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [adType, setAdType] = useState("pre_selected");
  const [adDuration, setAdDuration] = useState("15");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
    });
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
    };
  }, [videoFile]);
  
  const seekToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  };
  
  const handleJumpToAdSpot = (timestamp: number) => {
    seekToTime(timestamp);
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play();
    }
  };

  return (
    <Card className="col-span-2">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 3a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm3 0a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm3 0a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Preview & Ad Spots
        </h2>
        
        {/* Video Player */}
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
          {/* Empty State */}
          {!videoFile && (
            <div className="text-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p>Upload a video to preview</p>
            </div>
          )}
          
          {/* Actual Video */}
          {videoFile && (
            <video 
              ref={videoRef}
              className="w-full h-full" 
              controls
              src={videoFile.url}
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {/* Processing Overlay */}
          {isProcessing && (
            <ProcessingOverlay 
              status={processingStatus}
              progress={processingProgress}
            />
          )}
        </div>
        
        {/* Video Timeline */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Timeline</span>
            <span>{formatTime(currentTime)} / {formatTime(duration || 0)}</span>
          </div>
          
          <Timeline 
            currentTime={currentTime}
            duration={duration}
            adSpots={adSpots}
            onSeek={seekToTime}
            disabled={!videoFile || isProcessing}
          />
        </div>
        
        {/* Detected Ad Spots */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
              <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
            </svg>
            Detected Ad Insertion Points
          </h3>
          
          {/* Empty State */}
          {(!adSpots || adSpots.length === 0) && (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Upload and analyze a video to detect optimal ad spots</p>
            </div>
          )}
          
          {/* Ad Spot List */}
          {adSpots && adSpots.length > 0 && (
            <AdSpotList 
              adSpots={adSpots}
              onRemoveSpot={onRemoveAdSpot}
              onJumpToSpot={handleJumpToAdSpot}
              disabled={isProcessing}
            />
          )}
        </div>
        
        {/* Ad Settings */}
        {adSpots && adSpots.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3">Ad Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ad-type">Ad Type</Label>
                <Select 
                  value={adType} 
                  onValueChange={setAdType}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="ad-type">
                    <SelectValue placeholder="Select ad type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_selected">Pre-selected Ads</SelectItem>
                    <SelectItem value="custom_upload">Custom Ad Upload</SelectItem>
                    <SelectItem value="ad_network">Ad Network Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ad-duration">Ad Duration</Label>
                <Select 
                  value={adDuration} 
                  onValueChange={setAdDuration}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="ad-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            disabled={!videoFile || isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Manual Spot
          </Button>
          
          <div className="space-x-3">
            <Button 
              variant="secondary" 
              disabled={!videoFile || isProcessing || adSpots.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Preview
            </Button>
            
            <Button
              onClick={onGenerateVideo}
              disabled={!videoFile || isProcessing || adSpots.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Generate & Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
