import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface AdSpot {
  id: string;
  timestamp: number;
  type: string;
  confidence: number;
}

export async function insertOverlayAds(
  inputVideoPath: string,
  adSpots: AdSpot[],
  outputDir: string
): Promise<string> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputVideoPath = path.join(outputDir, `output_${Date.now()}.mp4`);
  
  // Create a simple test overlay image
  const overlayText = 'AD OVERLAY TEST';
  const overlayPath = path.join(outputDir, 'overlay.png');
  
  await createTestOverlay(overlayPath, overlayText);

  // Simplify filter complex command
  // Use a simple, reliable approach with a single overlay that toggles visibility
  let enableExpressions = adSpots.map(spot => {
    const start = spot.timestamp;
    const end = start + 5; // 5 seconds overlay duration
    return `between(t,${start},${end})`;
  }).join('+'); // '+' means OR in FFmpeg's filter expression

  // If no ad spots, make sure overlay is never shown
  if (enableExpressions === '') {
    enableExpressions = '0';
  }

  // Simple filter with one overlay that's enabled at multiple timestamps
  const filterComplex = `[0:v][1:v]overlay=x=(W-w)/2:y=(H-h)/2:enable='${enableExpressions}'[outv]`;

  // Construct FFmpeg command
  const ffmpegArgs = [
    '-i', inputVideoPath,           // Input video
    '-i', overlayPath,              // Overlay image
    '-filter_complex', filterComplex, // Filter complex for overlays
    '-map', '[outv]',               // Map video output
    '-map', '0:a',                  // Map original audio
    '-c:v', 'libx264',              // Video codec
    '-c:a', 'copy',                 // Copy audio codec
    '-y',                           // Overwrite output
    outputVideoPath                  // Output path
  ];

  // Execute FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`ffmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputVideoPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

async function createTestOverlay(outputPath: string, text: string): Promise<void> {
  // Create a simple overlay using FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-f', 'lavfi',                // Use lavfi input format
      '-i', 'color=c=black@0.5:s=640x120', // Semi-transparent background
      '-vf', `drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-frames:v', '1',             // Single frame
      '-y',                         // Overwrite output
      outputPath                    // Output path
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`ffmpeg overlay: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg overlay process exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
} 