import { useCallback, useRef } from 'react';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, MediaStreamAudioTrackSource } from 'mediabunny';

export const useVideoCapture = () => {
  const isRecordingRef = useRef(false);
  const outputRef = useRef<Output | null>(null);
  const videoSourceRef = useRef<CanvasSource | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioTrackSource | null>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);

  const createAudioStreamFromFile = useCallback(async (audioPath: string, duration: number): Promise<{ audioSource: MediaStreamAudioTrackSource; cleanup: () => void } | null> => {
    try {
      console.log('🎵 Creating audio element for playback...');

      // Create audio element (simpler approach)
      const audioElement = new Audio();
      audioElement.src = audioPath;
      audioElement.crossOrigin = 'anonymous';
      audioElement.loop = true; // Loop the audio if it's shorter than the video

      // Load and wait for metadata
      await new Promise((resolve, reject) => {
        audioElement.addEventListener('loadedmetadata', resolve);
        audioElement.addEventListener('error', reject);
        audioElement.load();
      });

      // Calculate random start position
      const maxStartTime = Math.max(0, audioElement.duration - duration);
      const randomStartTime = Math.random() * maxStartTime;

      console.log(`🎵 Audio: ${audioElement.duration.toFixed(1)}s total, starting at ${randomStartTime.toFixed(1)}s for ${duration}s`);

      // Set start time and volume
      audioElement.currentTime = randomStartTime;
      audioElement.volume = 0.3; // Set element volume as backup

      // Create audio context for MediaStream
      const audioContext = new AudioContext();
      const mediaElementSource = audioContext.createMediaElementSource(audioElement);

      // Create gain node for volume control and fading
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Start silent for fade in

      const destination = audioContext.createMediaStreamDestination();

      // Connect audio graph: mediaElement -> gainNode -> destination/speakers
      mediaElementSource.connect(gainNode);
      gainNode.connect(destination);
      gainNode.connect(audioContext.destination); // This allows us to hear the audio

      // Add event listeners for debugging
      audioElement.addEventListener('ended', () => {
        console.log('🎵 Audio element ended naturally');
      });

      audioElement.addEventListener('pause', () => {
        console.log('🎵 Audio element was paused');
      });

      // Start playing the audio BEFORE getting the track
      await audioElement.play();
      console.log('✅ Audio element started playing');
      console.log('🎵 Audio will play from', randomStartTime.toFixed(1), 'to', (randomStartTime + duration).toFixed(1));

      // Wait a moment for the stream to be fully active
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set constant volume (no fading)
      const targetVolume = 0.3; // Lower volume (30% instead of 70%)

      console.log('🎵 Setting constant volume:', targetVolume);

      // Set constant gain value
      gainNode.gain.value = targetVolume;

      // Get audio track
      const audioTrack = destination.stream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error('No audio track available from audio element');
      }

      console.log('🎵 Audio track state:', audioTrack.readyState);
      console.log('🎵 Audio track enabled:', audioTrack.enabled);

      // Create MediaBunny audio source with explicit duration
      const audioSource = new MediaStreamAudioTrackSource(audioTrack, {
        codec: 'aac',
        bitrate: 128e3,
      });

      console.log('🎵 Audio source created, duration will be:', duration, 'seconds');

      // Cleanup function to stop audio
      const cleanup = () => {
        audioElement.pause();
        audioElement.src = '';
        audioContext.close();
      };

      // Keep audio playing for slightly longer than video duration
      setTimeout(() => {
        console.log('🎵 Video duration reached, but keeping audio playing...');
      }, duration * 1000);

      // Only stop after extra time to ensure full capture
      const stopTimeout = (duration + 1) * 1000;
      console.log(`🎵 Audio will stop after ${stopTimeout}ms (${duration + 1}s)`);
      setTimeout(() => {
        console.log(`🎵 Now stopping audio element after ${duration + 1}s...`);
        audioElement.pause();
      }, stopTimeout);

      return { audioSource, cleanup };

    } catch (error) {
      console.error('❌ Error creating audio stream:', error);
      return null;
    }
  }, []);

  const startRecording = useCallback(async (canvas: HTMLCanvasElement, duration: number = 5, enableMusic: boolean = false) => {
    if (isRecordingRef.current) {
      throw new Error('Already recording');
    }

    isRecordingRef.current = true;

    // Lock canvas size during recording to prevent MediaBunny errors
    const originalCanvasWidth = canvas.width;
    const originalCanvasHeight = canvas.height;

    console.log(`🖼️ Canvas dimensions locked at: ${originalCanvasWidth}x${originalCanvasHeight}`);

    // Ensure canvas dimensions are even numbers (required by some encoders)
    if (originalCanvasWidth % 2 !== 0 || originalCanvasHeight % 2 !== 0) {
      console.warn('⚠️ Canvas dimensions should be even numbers for better codec compatibility');
    }

    // Store original canvas style to restore later
    // const originalCanvasStyle = {
    //   width: canvas.style.width,
    //   height: canvas.style.height,
    // };

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

    // Add audio track if music is enabled
    if (enableMusic) {
      try {
        console.log('🎵 Loading background music...');
        const audioResult = await createAudioStreamFromFile('/background-music.mp3', duration);
        if (audioResult) {
          output.addAudioTrack(audioResult.audioSource);
          audioSourceRef.current = audioResult.audioSource;
          audioCleanupRef.current = audioResult.cleanup;
          console.log('✅ Background music added');
          console.log('🎵 Audio track will be active for:', duration, 'seconds');
        } else {
          console.warn('⚠️ Failed to load music, continuing without audio');
        }
      } catch (error) {
        console.warn('⚠️ Music loading failed, continuing without audio:', error);
      }
    }

    // Store references
    outputRef.current = output;
    videoSourceRef.current = videoSource;

    // Start the output
    await output.start();

    // Capture frames at 30 FPS for the specified duration
    const fps = 30;
    const totalFrames = duration * fps;
    let frameCount = 0;
    const startTime = performance.now();

    return new Promise<Uint8Array>((resolve, reject) => {
      const captureFrame = () => {
        if (!isRecordingRef.current || frameCount >= totalFrames) {
          // Finish recording
          console.log(`🎥 Recording finished: captured ${frameCount} frames for ${duration}s video`);
          finishRecording()
            .then(resolve)
            .catch(reject);
          return;
        }

        const timestampInSeconds = frameCount / fps;
        const durationInSeconds = 1 / fps;

        // Log progress every 30 frames (every second at 30fps)
        if (frameCount % 30 === 0) {
          console.log(`🎥 Frame capture: ${frameCount}/${totalFrames} frames (${timestampInSeconds.toFixed(1)}s)`);
        }

        try {
          // Ensure canvas size remains constant during recording
          if (canvas.width !== originalCanvasWidth || canvas.height !== originalCanvasHeight) {
            console.warn(`⚠️ Canvas size changed during recording: ${canvas.width}x${canvas.height}, forcing back to ${originalCanvasWidth}x${originalCanvasHeight}`);
            canvas.width = originalCanvasWidth;
            canvas.height = originalCanvasHeight;
          }

          videoSource.add(timestampInSeconds, durationInSeconds);
          frameCount++;

          // Calculate when the next frame should be captured
          const expectedTime = startTime + (frameCount * 1000 / fps);
          const currentTime = performance.now();
          const delay = Math.max(0, expectedTime - currentTime);

          // Use requestAnimationFrame with timing control
          if (delay > 10) {
            // If we're ahead of schedule, wait a bit
            setTimeout(() => requestAnimationFrame(captureFrame), delay - 10);
          } else {
            // Otherwise, capture next frame immediately
            requestAnimationFrame(captureFrame);
          }
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
      // Clean up video first, then audio after a small delay
      isRecordingRef.current = false;
      outputRef.current = null;
      videoSourceRef.current = null;
      audioSourceRef.current = null;

      // Delay audio cleanup to ensure all audio data is captured
      if (audioCleanupRef.current) {
        setTimeout(() => {
          if (audioCleanupRef.current) {
            console.log('🎵 Cleaning up audio...');
            audioCleanupRef.current();
            audioCleanupRef.current = null;
          }
        }, 500);
      }
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!outputRef.current || !isRecordingRef.current) {
      return;
    }

    try {
      await outputRef.current.cancel();
    } finally {
      if (audioCleanupRef.current) {
        audioCleanupRef.current();
        audioCleanupRef.current = null;
      }
      isRecordingRef.current = false;
      outputRef.current = null;
      videoSourceRef.current = null;
      audioSourceRef.current = null;
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
    createAudioStreamFromFile,
    isRecording: isRecordingRef.current,
  };
};