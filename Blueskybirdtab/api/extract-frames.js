/**
 * Extract Frames API - Extracts key frames from videos for analysis
 * Uses canvas-based frame extraction in the browser (this is a placeholder)
 * In production, use a service like AWS Lambda with ffmpeg or a video processing API
 *
 * For now, this endpoint accepts a video URL/base64 and returns frame timestamps
 * The actual frame extraction happens client-side using canvas
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { videoDuration } = req.body || {};

    if (!videoDuration || typeof videoDuration !== 'number') {
      return res.status(400).json({ error: 'videoDuration is required' });
    }

    // Calculate optimal frame timestamps (max 4 frames for cost efficiency)
    const maxFrames = 4;
    const frameTimestamps = [];

    if (videoDuration <= 5) {
      // Short video: just get start and middle
      frameTimestamps.push(0);
      if (videoDuration > 1) {
        frameTimestamps.push(Math.floor(videoDuration / 2));
      }
    } else if (videoDuration <= 30) {
      // Medium video: 4 evenly spaced frames
      const interval = videoDuration / (maxFrames + 1);
      for (let i = 1; i <= maxFrames; i++) {
        frameTimestamps.push(Math.floor(interval * i));
      }
    } else {
      // Long video: key moments (start, 1/4, 1/2, 3/4)
      frameTimestamps.push(1); // Skip first second (often black)
      frameTimestamps.push(Math.floor(videoDuration * 0.25));
      frameTimestamps.push(Math.floor(videoDuration * 0.5));
      frameTimestamps.push(Math.floor(videoDuration * 0.75));
    }

    return res.status(200).json({
      frameTimestamps,
      totalFrames: frameTimestamps.length,
      videoDuration,
    });

  } catch (error) {
    console.error('Extract frames error:', error.message || error);
    return res.status(500).json({
      error: error.message || 'Failed to calculate frame timestamps',
    });
  }
}
