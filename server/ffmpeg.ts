import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { AdSpot } from "@/lib/types";

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

// Paths for storing videos and frames
const UPLOAD_DIR = path.join(process.cwd(), "tmp", "uploads");
const FRAMES_DIR = path.join(process.cwd(), "tmp", "frames");
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "output");

// Ensure directories exist
async function ensureDirectories() {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(FRAMES_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract frames from a video for analysis
 * 
 * @param videoPath - Path to the video file
 * @param frameCount - Number of frames to extract
 * @returns Array of paths to extracted frames
 */
export async function extractFrames(
  videoPath: string,
  frameCount: number = 30
): Promise<string[]> {
  await ensureDirectories();
  
  // Create a unique directory for this video's frames
  const videoId = path.basename(videoPath, path.extname(videoPath));
  const framesDir = path.join(FRAMES_DIR, videoId);
  await mkdir(framesDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    // Get video duration first
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath
    ]);
    
    let duration = "";
    
    ffprobe.stdout.on("data", (data) => {
      duration += data.toString();
    });
    
    ffprobe.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error("Failed to get video duration"));
      }
      
      const videoDuration = parseFloat(duration.trim());
      
      if (isNaN(videoDuration)) {
        return reject(new Error("Invalid video duration"));
      }
      
      // Calculate interval between frames
      const interval = videoDuration / frameCount;
      
      // Extract frames at calculated intervals
      const ffmpeg = spawn("ffmpeg", [
        "-i", videoPath,
        "-vf", `fps=1/${interval}`,
        "-q:v", "2",
        path.join(framesDir, "frame_%04d.jpg")
      ]);
      
      ffmpeg.stderr.on("data", (data) => {
        console.log(`ffmpeg: ${data}`);
      });
      
      ffmpeg.on("close", async (code) => {
        if (code !== 0) {
          return reject(new Error("Failed to extract frames"));
        }
        
        // Get list of extracted frames
        const files = await readdir(framesDir);
        const framePaths = files
          .filter(file => file.startsWith("frame_") && file.endsWith(".jpg"))
          .sort()
          .map(file => path.join(framesDir, file));
        
        resolve(framePaths);
      });
    });
  });
}

/**
 * Read frames as base64 encoded strings
 * 
 * @param framePaths - Array of paths to frame images
 * @returns Array of base64 encoded frame images
 */
export async function readFramesAsBase64(framePaths: string[]): Promise<string[]> {
  const base64Frames: string[] = [];
  
  for (const framePath of framePaths) {
    const data = await fs.promises.readFile(framePath);
    base64Frames.push(data.toString("base64"));
  }
  
  return base64Frames;
}

/**
 * Insert ads into video at specified timestamps
 * 
 * @param videoPath - Path to the original video
 * @param adPath - Path to the ad video
 * @param adSpots - Array of ad spot timestamps
 * @returns Path to the processed video
 */
export async function insertAdsIntoVideo(
  videoPath: string,
  adPath: string,
  adSpots: AdSpot[]
): Promise<string> {
  await ensureDirectories();
  
  const videoId = path.basename(videoPath, path.extname(videoPath));
  const outputPath = path.join(OUTPUT_DIR, `${videoId}_with_ads.mp4`);
  
  // Sort ad spots by timestamp
  const sortedAdSpots = [...adSpots].sort((a, b) => a.timestamp - b.timestamp);
  
  // Create FFmpeg complex filter for ad insertion
  let filterComplex = "";
  let inputCount = 2; // 0=video, 1=ad
  
  sortedAdSpots.forEach((spot, index) => {
    // Split video at ad spot timestamp
    filterComplex += `[0:v]split=${sortedAdSpots.length + 1}`;
    
    for (let i = 0; i < sortedAdSpots.length + 1; i++) {
      filterComplex += `[v${i}]`;
    }
    
    filterComplex += ";";
  });
  
  // Create FFmpeg command
  const ffmpegArgs = [
    "-i", videoPath,
    "-i", adPath,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-c:a", "aac",
    outputPath
  ];
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ffmpegArgs);
    
    ffmpeg.stderr.on("data", (data) => {
      console.log(`ffmpeg: ${data}`);
    });
    
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error("Failed to insert ads into video"));
      }
      
      resolve(outputPath);
    });
  });
}

/**
 * Clean up temporary files
 * 
 * @param videoId - ID of the video to clean up
 */
export async function cleanupTempFiles(videoId: string): Promise<void> {
  try {
    // Clean up frames
    const framesDir = path.join(FRAMES_DIR, videoId);
    if (fs.existsSync(framesDir)) {
      const files = await readdir(framesDir);
      for (const file of files) {
        await unlink(path.join(framesDir, file));
      }
      fs.rmdirSync(framesDir);
    }
    
    // Clean up uploaded video
    const videoPath = path.join(UPLOAD_DIR, `${videoId}.mp4`);
    if (fs.existsSync(videoPath)) {
      await unlink(videoPath);
    }
    
    console.log(`Cleaned up temp files for video ${videoId}`);
  } catch (error) {
    console.error("Error cleaning up temp files:", error);
  }
}
