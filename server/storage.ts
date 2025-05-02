import { db } from "@db";
import { videos, adSpots, processingJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import util from "util";
import { nanoid } from "nanoid";

const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

// Storage directories
const UPLOAD_DIR = path.join(process.cwd(), "tmp", "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "output");

// Ensure storage directories exist
(async () => {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
})();

/**
 * Store an uploaded video file
 * 
 * @param file - The video file buffer
 * @param fileName - Original filename
 * @returns Path to the stored video file
 */
export async function storeVideo(file: Buffer, fileName: string): Promise<string> {
  const videoId = nanoid();
  const extension = path.extname(fileName);
  const storedFileName = `${videoId}${extension}`;
  const storedFilePath = path.join(UPLOAD_DIR, storedFileName);
  
  await writeFile(storedFilePath, file);
  
  // Insert record in database
  await db.insert(videos).values({
    id: videoId,
    originalFileName: fileName,
    storedFileName: storedFileName,
    filePath: storedFilePath,
    fileSize: file.length,
    uploadedAt: new Date(),
  });
  
  return storedFilePath;
}

/**
 * Store ad spots in database
 * 
 * @param videoId - ID of the video
 * @param spots - Array of ad spots
 * @returns Array of stored ad spots
 */
export async function storeAdSpots(videoId: string, spots: any[]): Promise<any[]> {
  const storedSpots = [];
  
  for (const spot of spots) {
    const [storedSpot] = await db.insert(adSpots).values({
      videoId,
      timestamp: spot.timestamp,
      type: spot.type,
      confidence: spot.confidence,
      description: spot.description || null,
    }).returning();
    
    storedSpots.push(storedSpot);
  }
  
  return storedSpots;
}

/**
 * Get ad spots for a video
 * 
 * @param videoId - ID of the video
 * @returns Array of ad spots
 */
export async function getAdSpots(videoId: string): Promise<any[]> {
  return db.select().from(adSpots).where(eq(adSpots.videoId, videoId));
}

/**
 * Get video details by ID
 * 
 * @param videoId - ID of the video
 * @returns Video details or null if not found
 */
export async function getVideo(videoId: string): Promise<any | null> {
  const result = await db.select().from(videos).where(eq(videos.id, videoId));
  return result.length > 0 ? result[0] : null;
}

/**
 * Store a processing job
 * 
 * @param videoId - ID of the video
 * @param status - Job status
 * @returns ID of the stored job
 */
export async function storeProcessingJob(videoId: string, status: string): Promise<string> {
  const jobId = nanoid();
  
  await db.insert(processingJobs).values({
    id: jobId,
    videoId,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return jobId;
}

/**
 * Update a processing job
 * 
 * @param jobId - ID of the job
 * @param status - New job status
 * @param outputPath - Path to the processed video (optional)
 * @returns Updated job details
 */
export async function updateProcessingJob(
  jobId: string, 
  status: string, 
  outputPath?: string
): Promise<any> {
  const [updatedJob] = await db.update(processingJobs)
    .set({
      status,
      outputPath: outputPath || null,
      updatedAt: new Date(),
    })
    .where(eq(processingJobs.id, jobId))
    .returning();
  
  return updatedJob;
}

/**
 * Get a processing job
 * 
 * @param jobId - ID of the job
 * @returns Job details or null if not found
 */
export async function getProcessingJob(jobId: string): Promise<any | null> {
  const result = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId));
  return result.length > 0 ? result[0] : null;
}

/**
 * Delete a video and its associated data
 * 
 * @param videoId - ID of the video
 * @returns Whether the deletion was successful
 */
export async function deleteVideo(videoId: string): Promise<boolean> {
  try {
    // Get video details
    const video = await getVideo(videoId);
    if (!video) return false;
    
    // Delete file
    if (fs.existsSync(video.filePath)) {
      await unlink(video.filePath);
    }
    
    // Delete from database
    await db.delete(adSpots).where(eq(adSpots.videoId, videoId));
    await db.delete(videos).where(eq(videos.id, videoId));
    
    return true;
  } catch (error) {
    console.error("Error deleting video:", error);
    return false;
  }
}
