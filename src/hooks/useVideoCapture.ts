import { useCallback, useRef } from 'react';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';

export const useVideoCapture = () => {
  const isRecordingRef = useRef(false);
  const outputRef = useRef<Output | null>(null);
  const videoSourceRef = useRef<CanvasSource | null>(null);

  const startRecording = useCallback(async (canvas: HTMLCanvasElement, duration: number = 5) => {
    if (isRecordingRef.current) {
      throw new Error('Already recording');
    }

    isRecordingRef.current = true;

    // Log canvas dimensions for debugging
    console.log(`🖼️ Canvas dimensions: ${canvas.width}x${canvas.height}`);

    // Ensure canvas dimensions are even numbers (required by some encoders)
    if (canvas.width % 2 !== 0 || canvas.height % 2 !== 0) {
      console.warn('⚠️ Canvas dimensions should be even numbers for better codec compatibility');
    }

    // Create output with MP4 format
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // Create video source from canvas with the original working configuration
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: 2e6, // Back to 2 Mbps which was working
    });

    // Add video track with 30 FPS
    output.addVideoTrack(videoSource, { frameRate: 30 });

    // Store references
    outputRef.current = output;
    videoSourceRef.current = videoSource;

    // Start the output
    await output.start();

    // Capture frames at 30 FPS for the specified duration
    const fps = 30;
    const totalFrames = duration * fps;
    let frameCount = 0;

    return new Promise<Uint8Array>((resolve, reject) => {
      const captureFrame = () => {
        if (!isRecordingRef.current || frameCount >= totalFrames) {
          // Finish recording
          finishRecording()
            .then(resolve)
            .catch(reject);
          return;
        }

        const timestampInSeconds = frameCount / fps;
        const durationInSeconds = 1 / fps;

        try {
          videoSource.add(timestampInSeconds, durationInSeconds);
          frameCount++;

          // Schedule next frame
          requestAnimationFrame(captureFrame);
        } catch (error) {
          console.error('❌ Frame capture error:', error);
          reject(error);
        }
      };

      // Start capturing
      requestAnimationFrame(captureFrame);
    });
  }, []);

  const finishRecording = useCallback(async (): Promise<Uint8Array> => {
    if (!outputRef.current || !isRecordingRef.current) {
      throw new Error('No active recording');
    }

    try {
      await outputRef.current.finalize();
      const buffer = (outputRef.current.target as BufferTarget).buffer;

      if (!buffer) {
        throw new Error('Failed to get video buffer');
      }

      return new Uint8Array(buffer);
    } finally {
      // Clean up
      isRecordingRef.current = false;
      outputRef.current = null;
      videoSourceRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!outputRef.current || !isRecordingRef.current) {
      return;
    }

    try {
      await outputRef.current.cancel();
    } finally {
      isRecordingRef.current = false;
      outputRef.current = null;
      videoSourceRef.current = null;
    }
  }, []);

  const downloadVideo = useCallback((videoData: Uint8Array, filename: string = 'asset-panning-video.mp4') => {
    const blob = new Blob([videoData], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }, []);

  return {
    startRecording,
    stopRecording,
    downloadVideo,
    isRecording: isRecordingRef.current,
  };
};