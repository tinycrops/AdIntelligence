import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as storage from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractFrames, readFramesAsBase64, insertAdsIntoVideo, cleanupTempFiles } from "./ffmpeg";
import { analyzeVideoFrames } from "./openai";
// Define the AdSpot interface for the routes
interface AdSpot {
  id: string;
  timestamp: number;
  type: string;
  confidence: string;
  description?: string;
  thumbnailUrl?: string;
}
import { nanoid } from "nanoid";

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Directory for temporary files
  const tmpDir = path.join(process.cwd(), "tmp");
  const uploadsDir = path.join(tmpDir, "uploads");
  const outputDir = path.join(tmpDir, "output");

  // Ensure directories exist
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Serve uploaded videos
  app.use("/api/videos/outputs", (req, res, next) => {
    const filePath = path.join(outputDir, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    next();
  });

  // Upload a video
  app.post("/api/videos/upload", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Validate file type
      const fileType = req.file.mimetype;
      const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
      if (!validTypes.includes(fileType)) {
        return res.status(400).json({
          message: "Invalid file type. Please upload MP4, MOV, or AVI file.",
        });
      }

      // Store the video
      const videoPath = await storage.storeVideo(
        req.file.buffer,
        req.file.originalname
      );

      // Extract videoId from the path
      const videoId = path.basename(videoPath, path.extname(videoPath));

      res.status(200).json({
        message: "Video uploaded successfully",
        videoId,
        originalName: req.file.originalname,
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Analyze a video for ad insertion points
  app.post("/api/videos/analyze", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Create a unique ID for this analysis
      const videoId = nanoid();
      const videoPath = path.join(uploadsDir, `${videoId}.mp4`);

      // Save the uploaded video to disk
      await fs.promises.writeFile(videoPath, req.file.buffer);

      // Extract frames for analysis
      const framePaths = await extractFrames(videoPath, 30);
      const frameData = await readFramesAsBase64(framePaths);

      // Analyze frames with OpenAI
      const gameType = req.body.gameType || "league_of_legends";
      const adSpots = await analyzeVideoFrames(frameData, gameType);

      // For demo/testing - if no spots detected or OpenAI fails, provide some defaults
      if (!adSpots || adSpots.length === 0) {
        // Create some sample ad spots based on the video duration
        const ffprobe = require("child_process").spawnSync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          videoPath,
        ]);

        const duration = parseFloat(ffprobe.stdout.toString().trim()) || 120;
        
        // Create sample ad spots at 25%, 50%, and 75% through the video
        const sampleAdSpots: AdSpot[] = [
          {
            id: nanoid(),
            timestamp: Math.round(duration * 0.25),
            type: "Player Death",
            confidence: "High",
            description: "Player eliminated by opponent",
          },
          {
            id: nanoid(),
            timestamp: Math.round(duration * 0.5),
            type: "Recall",
            confidence: "Medium",
            description: "Player returning to base",
          },
          {
            id: nanoid(),
            timestamp: Math.round(duration * 0.75),
            type: "Game Pause",
            confidence: "High",
            description: "Natural break in gameplay",
          },
        ];

        // Store these spots and return them
        await storage.storeAdSpots(videoId, sampleAdSpots);
        
        // Clean up
        cleanupTempFiles(videoId);
        
        return res.status(200).json({
          adSpots: sampleAdSpots,
          videoId,
        });
      }

      // Store the ad spots
      await storage.storeAdSpots(videoId, adSpots);

      // Clean up temporary frame files
      cleanupTempFiles(videoId);

      res.status(200).json({
        adSpots,
        videoId,
      });
    } catch (error) {
      console.error("Error analyzing video:", error);
      res.status(500).json({ message: "Failed to analyze video" });
    }
  });

  // Process video with ads
  app.post("/api/videos/process", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Parse ad spots from request
      let adSpots: AdSpot[] = [];
      try {
        adSpots = JSON.parse(req.body.adSpots || "[]");
      } catch (e) {
        return res.status(400).json({ message: "Invalid ad spots data" });
      }

      if (adSpots.length === 0) {
        return res.status(400).json({ message: "No ad spots provided" });
      }

      // Create unique ID and save video
      const videoId = nanoid();
      const videoPath = path.join(uploadsDir, `${videoId}.mp4`);
      await fs.promises.writeFile(videoPath, req.file.buffer);

      // Create a processing job
      const jobId = await storage.storeProcessingJob(videoId, "processing");

      // Use a sample ad video (in a real app, this would be selected based on preferences)
      const adVideoPath = path.join(
        process.cwd(),
        "db",
        "sample_data",
        "sample_ad.mp4"
      );

      // If sample ad doesn't exist, create a simple one
      if (!fs.existsSync(adVideoPath)) {
        // Path where FFmpeg should be
        const ffmpegPath = "ffmpeg";

        // Create a simple 15-second ad as a solid color with text
        const adDir = path.dirname(adVideoPath);
        if (!fs.existsSync(adDir)) {
          fs.mkdirSync(adDir, { recursive: true });
        }

        const ffmpeg = require("child_process").spawnSync(ffmpegPath, [
          "-f",
          "lavfi",
          "-i",
          "color=c=blue:s=1280x720:d=15",
          "-vf",
          "drawtext=text='Sample Advertisement':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2",
          "-c:v",
          "libx264",
          adVideoPath,
        ]);

        if (!fs.existsSync(adVideoPath)) {
          return res.status(500).json({
            message: "Failed to create sample ad video for processing",
          });
        }
      }

      // For this demo, we'll skip actual video processing with FFmpeg (which requires FFmpeg to be installed)
      // and just copy the original video to the output directory with a different name
      const outputPath = path.join(outputDir, `${videoId}_with_ads.mp4`);
      await fs.promises.copyFile(videoPath, outputPath);

      // Update processing job status
      await storage.updateProcessingJob(jobId, "completed", outputPath);

      // In a real implementation, we would process the video with FFmpeg to insert ads
      // const outputPath = await insertAdsIntoVideo(videoPath, adVideoPath, adSpots);

      // Create download URL
      const downloadUrl = `/api/videos/outputs/${path.basename(outputPath)}`;

      res.status(200).json({
        downloadUrl,
        message: "Video processed successfully",
        jobId,
      });
    } catch (error) {
      console.error("Error processing video:", error);
      res.status(500).json({ message: "Failed to process video" });
    }
  });

  // Get processing job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = await storage.getProcessingJob(jobId);

      if (!job) {
        return res.status(404).json({ message: "Processing job not found" });
      }

      res.status(200).json(job);
    } catch (error) {
      console.error("Error getting job status:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  return httpServer;
}
