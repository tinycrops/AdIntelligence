import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (required for the base template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Videos table
export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  originalFileName: text("original_file_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  analyzedAt: timestamp("analyzed_at"),
});

export const videosInsertSchema = createInsertSchema(videos, {
  originalFileName: (schema) => schema.min(1, "File name is required"),
  storedFileName: (schema) => schema.min(1, "Stored file name is required"),
  filePath: (schema) => schema.min(1, "File path is required"),
  fileSize: (schema) => schema.min(1, "File size must be positive"),
});

export type InsertVideo = z.infer<typeof videosInsertSchema>;
export type Video = typeof videos.$inferSelect;

// Ad spots table
export const adSpots = pgTable("ad_spots", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(), // in seconds
  type: text("type").notNull(), // e.g., "Player Death", "Recall"
  confidence: text("confidence").notNull(), // Low, Medium, High
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adSpotsInsertSchema = createInsertSchema(adSpots, {
  videoId: (schema) => schema.min(1, "Video ID is required"),
  timestamp: (schema) => schema.min(0, "Timestamp must be non-negative"),
  type: (schema) => schema.min(1, "Type is required"),
  confidence: (schema) => schema.min(1, "Confidence is required"),
});

export type InsertAdSpot = z.infer<typeof adSpotsInsertSchema>;
export type AdSpot = typeof adSpots.$inferSelect;

// Processing jobs table
export const processingJobs = pgTable("processing_jobs", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // pending, processing, completed, failed
  outputPath: text("output_path"),
  error: text("error"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const processingJobsInsertSchema = createInsertSchema(processingJobs, {
  videoId: (schema) => schema.min(1, "Video ID is required"),
  status: (schema) => schema.min(1, "Status is required"),
});

export type InsertProcessingJob = z.infer<typeof processingJobsInsertSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;

// Define relations
export const videosRelations = relations(videos, ({ many }) => ({
  adSpots: many(adSpots),
  processingJobs: many(processingJobs),
}));

export const adSpotsRelations = relations(adSpots, ({ one }) => ({
  video: one(videos, {
    fields: [adSpots.videoId],
    references: [videos.id],
  }),
}));

export const processingJobsRelations = relations(processingJobs, ({ one }) => ({
  video: one(videos, {
    fields: [processingJobs.videoId],
    references: [videos.id],
  }),
}));
