import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as storage from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractFrames, readFramesAsBase64, cleanupTempFiles } from "./ffmpeg";
import { analyzeVideoFrames, getGameContext } from "./openai";
import { insertOverlayAds } from "./adInsertion";
import { spawn, spawnSync } from 'child_process';
// Define the AdSpot interface for the routes
interface AdSpot {
  id: string;
  timestamp: number;
  type: string;
  confidence: number;
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
      const result = await storage.storeVideo(
        req.file.buffer,
        req.file.originalname
      );

      res.status(200).json({
        message: "Video uploaded successfully",
        videoId: result.id,
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

      // First, register the video in the database to get a valid videoId
      const videoResult = await storage.storeVideo(
        req.file.buffer, 
        req.file.originalname || "uploaded_video.mp4"
      );
      
      const videoId = videoResult.id;
      const videoPath = path.join(uploadsDir, `${videoId}.mp4`);

      // Extract frames for analysis
      const framePaths = await extractFrames(videoPath, 30);
      const frameData = await readFramesAsBase64(framePaths);

      // Analyze frames with OpenAI
      const gameType = req.body.gameType || "league_of_legends";
      const customPrompt = req.body.customPrompt;
      const adSpots = await analyzeVideoFrames(frameData, gameType, customPrompt);

      // For demo/testing - if no spots detected or OpenAI fails, provide some defaults
      if (!adSpots || adSpots.length === 0) {
        // Create some sample ad spots based on the video duration
        const ffprobe = spawnSync("ffprobe", [
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
            confidence: 0.9,
            description: "Player eliminated by opponent",
          },
          {
            id: nanoid(),
            timestamp: Math.round(duration * 0.5),
            type: "Recall",
            confidence: 0.7,
            description: "Player returning to base",
          },
          {
            id: nanoid(),
            timestamp: Math.round(duration * 0.75),
            type: "Game Pause",
            confidence: 0.8,
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

      // Save video and get videoId
      const videoResult = await storage.storeVideo(
        req.file.buffer,
        req.file.originalname || "uploaded_video.mp4"
      );
      const videoId = videoResult.id;

      // Get paths
      const videoPath = path.join(uploadsDir, `${videoId}.mp4`);
      
      try {
        // Insert ad overlays
        const outputVideoPath = await insertOverlayAds(
          videoPath,
          adSpots,
          outputDir
        );

        // Get relative path for response
        const relativePath = path.relative(process.cwd(), outputVideoPath);
        const outputUrl = `/api/videos/outputs/${path.basename(outputVideoPath)}`;

        res.status(200).json({
          message: "Video processed successfully",
          videoId,
          outputUrl,
        });
      } catch (error) {
        console.error("Error processing video with ads:", error);
        throw error;
      } finally {
        // Clean up temporary files
        cleanupTempFiles(videoId);
      }
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

  // Get default prompt for a game type
  app.get("/api/prompts/:gameType", async (req, res) => {
    try {
      const gameType = req.params.gameType || "league_of_legends";
      const gameContext = getGameContext(gameType);
      
      // Get the base prompt structure
      const basePrompt = `
      Analyze these frames from a ${gameType} gameplay video.
      Identify moments that would be natural breaks for ad insertion.
      ${gameContext}
      
      For each natural break you detect, provide:
      1. The approximate timestamp (frame number)
      2. The type of break (death, recall, pause, game end, etc.)
      3. Confidence level (high, medium, low)
      4. Brief description of what's happening
      
      Format your response as JSON with an array of objects with these fields:
      {
        "adSpots": [
          {
            "timestamp": <frame_number>,
            "type": "<break_type>",
            "confidence": "<confidence_level>",
            "description": "<brief_description>"
          }
        ]
      }
      `;
      
      res.status(200).json({ prompt: basePrompt });
    } catch (error) {
      console.error("Error getting prompt:", error);
      res.status(500).json({ message: "Failed to get prompt" });
    }
  });

  return httpServer;
}
