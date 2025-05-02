import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import UploadSection from "@/components/upload-section";
import VideoPreview from "@/components/video-preview";
import { type VideoFile, type AdSpot } from "@/lib/types";

export default function Home() {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [adSpots, setAdSpots] = useState<AdSpot[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Initializing...");
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileUpload = (file: VideoFile) => {
    setVideoFile(file);
    setAdSpots([]);
  };

  const handleRemoveFile = () => {
    setVideoFile(null);
    setAdSpots([]);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("Analyzing game content");
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("video", videoFile.file);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress === 25) {
            setProcessingStatus("Detecting game events...");
          } else if (newProgress === 50) {
            setProcessingStatus("Identifying optimal ad spots...");
          } else if (newProgress === 75) {
            setProcessingStatus("Finalizing analysis...");
          }
          
          if (newProgress >= 100) {
            clearInterval(progressInterval);
          }
          
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 300);
      
      // API call to analyze video
      const response = await fetch("/api/videos/analyze", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Update state with detected ad spots
      setAdSpots(data.adSpots);
    } catch (error) {
      console.error("Video analysis failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAdSpot = (spotId: string) => {
    setAdSpots(adSpots.filter(spot => spot.id !== spotId));
  };

  const handleGenerateVideo = async () => {
    if (!videoFile || adSpots.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("Generating video with ads...");
    
    try {
      // Create FormData for video processing request
      const formData = new FormData();
      formData.append("video", videoFile.file);
      formData.append("adSpots", JSON.stringify(adSpots));
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + 2;
          
          if (newProgress >= 100) {
            clearInterval(progressInterval);
          }
          
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 200);
      
      // API call to process video
      const response = await fetch("/api/videos/process", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Get download URL from response
      const data = await response.json();
      
      // Trigger download
      window.location.href = data.downloadUrl;
    } catch (error) {
      console.error("Video processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* App intro section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">AI-Powered Ad Insertion</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Automatically detect natural breaks in your gaming videos and insert ads at the perfect moments.
            </p>
          </div>
          
          {/* Process steps */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold">1</div>
              <div className="ml-3">Upload Video</div>
            </div>
            <div className="hidden sm:block text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center font-semibold">2</div>
              <div className="ml-3">AI Analysis</div>
            </div>
            <div className="hidden sm:block text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">3</div>
              <div className="ml-3">Insert Ads</div>
            </div>
            <div className="hidden sm:block text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">4</div>
              <div className="ml-3">Download</div>
            </div>
          </div>
          
          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Upload & Settings Column */}
            <UploadSection 
              videoFile={videoFile}
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
              onAnalyzeVideo={handleAnalyzeVideo}
              isProcessing={isProcessing}
            />
            
            {/* Video preview & Ad spots Column */}
            <VideoPreview 
              videoFile={videoFile}
              adSpots={adSpots}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              processingProgress={processingProgress}
              onRemoveAdSpot={handleRemoveAdSpot}
              onGenerateVideo={handleGenerateVideo}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
