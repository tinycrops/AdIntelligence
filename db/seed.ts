import { db } from "./index";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

async function seed() {
  try {
    // Check if we already have videos in the database
    const existingVideos = await db.select()
      .from(schema.videos)
      .limit(1);
    
    if (existingVideos.length > 0) {
      console.log('Database already seeded.');
      return;
    }
    
    // Create sample ad directory
    const sampleDataDir = path.join(process.cwd(), "db", "sample_data");
    if (!fs.existsSync(sampleDataDir)) {
      fs.mkdirSync(sampleDataDir, { recursive: true });
    }
    
    // Create sample ad metadata
    const videoId = nanoid();
    
    // Insert sample video for testing
    await db.insert(schema.videos).values({
      id: videoId,
      originalFileName: "sample_gameplay.mp4",
      storedFileName: `${videoId}.mp4`,
      filePath: path.join(sampleDataDir, `${videoId}.mp4`),
      fileSize: 1024 * 1024 * 10, // 10MB
      duration: 300, // 5 minutes
      uploadedAt: new Date(),
      analyzedAt: new Date(),
    });
    
    // Insert sample ad spots
    const adSpotTypes = ["Player Death", "Recall", "Game Pause", "Match End"];
    const confidenceLevels = ["High", "Medium", "High", "High"];
    
    for (let i = 0; i < 4; i++) {
      await db.insert(schema.adSpots).values({
        videoId: videoId,
        timestamp: 42 + (i * 63), // Sample timestamps
        type: adSpotTypes[i],
        confidence: confidenceLevels[i],
        description: `Detected ${adSpotTypes[i].toLowerCase()} at timestamp`,
        createdAt: new Date(),
      });
    }
    
    console.log('Database seeded successfully.');
  }
  catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
