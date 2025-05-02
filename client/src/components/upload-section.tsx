import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFileSize } from "@/lib/utils/file";
import { type VideoFile } from "@/lib/types";

type UploadSectionProps = {
  videoFile: VideoFile | null;
  isProcessing: boolean;
  onFileUpload: (file: VideoFile) => void;
  onRemoveFile: () => void;
  onAnalyzeVideo: () => void;
};

export default function UploadSection({
  videoFile,
  isProcessing,
  onFileUpload,
  onRemoveFile,
  onAnalyzeVideo,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [gameType, setGameType] = useState("league_of_legends");
  const [sensitivity, setSensitivity] = useState([5]);
  const [prioritizeBreaks, setPrioritizeBreaks] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  };
  
  const validateAndUploadFile = (file: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid video file (MP4, MOV, AVI).');
      return;
    }
    
    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      alert('File size exceeds 500MB limit.');
      return;
    }
    
    const videoFileObj: VideoFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file)
    };
    
    onFileUpload(videoFileObj);
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  };
  
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card className="col-span-1">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Upload Video
        </h2>
        
        {/* Upload Zone */}
        {!videoFile && (
          <div 
            className={`upload-zone rounded-lg p-8 mb-6 text-center ${isDragging ? 'active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-gray-600">Drag and drop your video file here</p>
            <p className="text-sm text-gray-500 mb-4">Supports MP4, MOV, AVI (max 500MB)</p>
            <Button>Browse Files</Button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              accept="video/mp4,video/quicktime,video/x-msvideo"
              onChange={handleFileChange}
            />
          </div>
        )}
        
        {/* Uploaded Video */}
        {videoFile && (
          <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 truncate">
              <span className="text-sm font-medium">{videoFile.name}</span>
              <span className="text-xs text-gray-500 block">{formatFileSize(videoFile.size)}</span>
            </div>
            <button 
              className="text-gray-400 hover:text-gray-600"
              onClick={onRemoveFile}
              disabled={isProcessing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Processing Settings */}
        <div className="mt-6">
          <h3 className="text-md font-medium mb-3">Processing Settings</h3>
          
          <div className="mb-4">
            <Label htmlFor="game-type">Game Content Type</Label>
            <Select 
              value={gameType} 
              onValueChange={setGameType}
              disabled={isProcessing}
            >
              <SelectTrigger id="game-type" className="w-full">
                <SelectValue placeholder="Select game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="league_of_legends">League of Legends</SelectItem>
                <SelectItem value="valorant">Valorant</SelectItem>
                <SelectItem value="fortnite">Fortnite</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="sensitivity" className="mb-2 block">Detection Sensitivity</Label>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Low</span>
              <Slider
                id="sensitivity"
                value={sensitivity}
                min={1}
                max={10}
                step={1}
                onValueChange={setSensitivity}
                disabled={isProcessing}
                className="flex-1 mx-2"
              />
              <span className="text-xs text-gray-500 ml-2">High</span>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="prioritize" 
                checked={prioritizeBreaks}
                onCheckedChange={(checked) => setPrioritizeBreaks(checked as boolean)}
                disabled={isProcessing}
              />
              <Label 
                htmlFor="prioritize" 
                className="text-sm text-gray-600"
              >
                Prioritize deaths & recalls
              </Label>
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={onAnalyzeVideo}
            disabled={!videoFile || isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
            </svg>
            Analyze Video
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
