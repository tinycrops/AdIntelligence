import OpenAI from "openai";
import fs from "fs";
import path from "path";
// Define a local interface for AdSpot to avoid dependency on client-side types
interface AdSpot {
  id: string;
  timestamp: number;
  type: string;
  confidence: string;
  description?: string;
  thumbnailUrl?: string;
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Analyzes video frames to detect natural breaks for ad insertion
 * 
 * @param frames - Array of base64-encoded frame images
 * @param gameType - Type of game content (e.g., "league_of_legends")
 * @param customPrompt - Optional custom prompt to use for analysis
 * @returns Array of detected ad spots
 */
export async function analyzeVideoFrames(
  frames: string[],
  gameType: string = "league_of_legends",
  customPrompt?: string
): Promise<AdSpot[]> {
  try {
    // Prepare frames for analysis (sample frames to avoid excessive API costs)
    const sampledFrames = sampleFrames(frames, 10); // Analyze 10 frames max
    
    // Prepare game-specific context for analysis
    const gameContext = getGameContext(gameType);
    
    // Prepare the analysis prompt
    let prompt = customPrompt;
    
    // If no custom prompt provided, use the default prompt
    if (!prompt) {
      prompt = `
        Analyze these frames from a ${gameType} gameplay video.
        Identify moments that would be natural breaks for ad insertion.
        ${gameContext}
        
        For each natural break you detect, provide:
        1. The approximate timestamp (frame number)
        2. The type of break (death, recall, pause, game end, etc.)
        3. Confidence level (high, medium, low)
        4. Brief description of what's happening
      `;
    }
    
    // Always append the required response format instructions to ensure compatibility
    const responseFormatInstructions = `
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
      
      The "timestamp" must be a number representing the frame number.
      The "type" must be a short string describing the type of break.
      The "confidence" must be one of: "high", "medium", or "low".
      The "description" should be a brief description of what's happening.
      
      This exact response format is required for the system to work.
    `;
    
    // Ensure response format is appended to custom prompts
    if (!prompt.includes('"adSpots"')) {
      prompt = `${prompt}\n\n${responseFormatInstructions}`;
    }

    // Analyze the frames using OpenAI's Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...sampledFrames.map(frame => ({
              type: "image_url" as const,
              image_url: {
                url: `data:image/jpeg;base64,${frame}`
              }
            }))
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    // Parse and return the results
    const content = response.choices[0].message.content || '{"adSpots":[]}';
    let result;
    
    try {
      result = JSON.parse(content);
      
      // Ensure response has the expected structure
      if (!result.adSpots || !Array.isArray(result.adSpots)) {
        console.warn("Invalid response format from OpenAI, missing adSpots array:", content);
        result = { adSpots: [] };
      }
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      console.warn("Raw content:", content);
      result = { adSpots: [] };
    }
    
    // Convert frame numbers to seconds (assuming 1 frame per second for simplicity)
    // Validate and sanitize each spot to ensure it has all required fields
    return result.adSpots.map((spot: any, index: number) => ({
      id: `spot-${index + 1}`,
      timestamp: typeof spot.timestamp === 'number' ? spot.timestamp : parseInt(spot.timestamp) || 0,
      type: spot.type || "Unknown",
      confidence: spot.confidence || "medium",
      description: spot.description || ""
    }));
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw new Error("Failed to analyze video frames for ad spots");
  }
}

/**
 * Sample frames to reduce API calls
 * 
 * @param frames - All available frames
 * @param maxFrames - Maximum number of frames to sample
 * @returns Array of sampled frames
 */
function sampleFrames(frames: string[], maxFrames: number): string[] {
  if (frames.length <= maxFrames) return frames;
  
  const sampledFrames: string[] = [];
  const interval = Math.floor(frames.length / maxFrames);
  
  for (let i = 0; i < maxFrames; i++) {
    sampledFrames.push(frames[i * interval]);
  }
  
  return sampledFrames;
}

/**
 * Get game-specific context for analysis
 * 
 * @param gameType - Type of game content
 * @returns Game-specific context string
 */
export function getGameContext(gameType: string): string {
  switch (gameType) {
    case "league_of_legends":
      return `
        For League of Legends, look for:
        - Player deaths (champion dying animation, gray screen)
        - Recalls (blue swirling animation)
        - Game pauses
        - Fountain visits
        - Between games in a series
        - Post-game stats screens
        - Loading screens
      `;
    case "valorant":
      return `
        For Valorant, look for:
        - Between rounds
        - Player deaths
        - Buy phase
        - Post-game stats
        - Loading screens
      `;
    case "fortnite":
      return `
        For Fortnite, look for:
        - Player eliminations
        - Victory Royale screens
        - Lobby waiting
        - Between matches
        - Menu navigation
      `;
    default:
      return `
        Look for natural breaks in gameplay such as:
        - Death/respawn animations
        - Loading screens
        - Menu navigation
        - Between rounds or matches
        - Cutscenes
      `;
  }
}
