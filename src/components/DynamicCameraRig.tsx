import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface DynamicCameraRigRef {
  startRecordingAnimation: () => void;
  stopRecordingAnimation: () => void;
  resetAnimation: () => void;
  getDynamicDuration: () => number;
}

interface DynamicCameraRigProps {
  enabled?: boolean;
  duration?: number;
  assetsPositions?: THREE.Vector3[];
  startPosition?: THREE.Vector3;
}

interface CameraKeyframe {
  time: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
}

export const DynamicCameraRig = forwardRef<DynamicCameraRigRef, DynamicCameraRigProps>(
  ({ enabled = false, duration = 20, assetsPositions = [new THREE.Vector3(0, 0, 0)], startPosition }, ref) => {
    const { camera } = useThree();
    const animationStartTimeRef = useRef<number | null>(null);
    const isRecordingRef = useRef(false);
    const keyframesRef = useRef<CameraKeyframe[]>([]);
    const dynamicDurationRef = useRef<number>(duration);

    // Log when component mounts
    console.log('🎭 DynamicCameraRig mounted with enabled:', enabled, 'duration:', duration);

    const generateRandomKeyframes = () => {
      const center = new THREE.Vector3();

      // Calculate center of all assets
      if (assetsPositions.length > 0) {
        assetsPositions.forEach(pos => center.add(pos));
        center.divideScalar(assetsPositions.length);
      }

      const baseAngle = Math.random() * Math.PI * 2;
      const assetCount = assetsPositions.length;

      console.log(`🎭 Generating smart keyframes for ${assetCount} asset(s)`);

      // Different animation strategies based on asset count
      if (assetCount === 1) {
        return { keyframes: generateSingleAssetAnimation(assetsPositions[0], baseAngle), dynamicDuration: duration };
      } else {
        return generateMultiAssetAnimation(center, assetsPositions, baseAngle);
      }
    };

    const generateSingleAssetAnimation = (assetPos: THREE.Vector3, baseAngle: number) => {
      console.log('🎯 Single asset: Creating close-up dramatic orbit with zoom effects');

      // Vary the movement pattern based on the base angle
      const movementVariation = (baseAngle % (Math.PI * 2)) / (Math.PI * 2);
      const heightVariation = movementVariation > 0.5 ? 1 : -1; // Sometimes go lower, sometimes higher

      // Create more varied movement patterns
      const sideMovement = movementVariation > 0.5 ? 1 : -1; // Sometimes clockwise, sometimes counter-clockwise
      const heightPattern = heightVariation > 0 ? 0.5 : -0.5; // Vary the height approach

      return [
        // 0s - Start from current camera position
        {
          time: 0,
          position: startPosition ? startPosition.clone() : new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle) * 3,
            assetPos.y + 2,
            assetPos.z + Math.cos(baseAngle) * 3
          ),
          lookAt: assetPos.clone(),
          fov: 50
        },

        // 3s - Very slow, smooth transition (longer time for smoothness)
        {
          time: 3,
          position: startPosition ? new THREE.Vector3().lerpVectors(
            startPosition,
            new THREE.Vector3(
              assetPos.x + Math.sin(baseAngle + 0.2 * sideMovement) * 3,
              assetPos.y + 2 + heightPattern,
              assetPos.z + Math.cos(baseAngle + 0.2 * sideMovement) * 3
            ),
            0.5
          ) : new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 0.2 * sideMovement) * 3,
            assetPos.y + 2 + heightPattern,
            assetPos.z + Math.cos(baseAngle + 0.2 * sideMovement) * 3
          ),
          lookAt: assetPos.clone(),
          fov: 45
        },

        // 6s - Gentle approach
        {
          time: 6,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 0.6 * sideMovement) * 2.5,
            assetPos.y + 1.5 + heightPattern * 0.5,
            assetPos.z + Math.cos(baseAngle + 0.6 * sideMovement) * 2.5
          ),
          lookAt: assetPos.clone(),
          fov: 40
        },

        // 9s - Intimate orbit
        {
          time: 9,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 1.2 * sideMovement) * 2,
            assetPos.y + 1.2,
            assetPos.z + Math.cos(baseAngle + 1.2 * sideMovement) * 2
          ),
          lookAt: assetPos.clone(),
          fov: 35
        },

        // 12s - Close inspection
        {
          time: 12,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 2 * sideMovement) * 1.8,
            assetPos.y + 0.8,
            assetPos.z + Math.cos(baseAngle + 2 * sideMovement) * 1.8
          ),
          lookAt: assetPos.clone(),
          fov: 30
        },

        // 15s - Start pulling back smoothly
        {
          time: 15,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 2.8 * sideMovement) * 2.5,
            assetPos.y + 1.5,
            assetPos.z + Math.cos(baseAngle + 2.8 * sideMovement) * 2.5
          ),
          lookAt: assetPos.clone(),
          fov: 40
        },

        // 18s - Continuing zoom out
        {
          time: 18,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 3.5 * sideMovement) * 4,
            assetPos.y + 2.5,
            assetPos.z + Math.cos(baseAngle + 3.5 * sideMovement) * 4
          ),
          lookAt: assetPos.clone(),
          fov: 50
        },

        // 20s - Final moderate zoom out (closer)
        {
          time: 20,
          position: new THREE.Vector3(
            assetPos.x + Math.sin(baseAngle + 4.2 * sideMovement) * 4.5,
            assetPos.y + 2.5,
            assetPos.z + Math.cos(baseAngle + 4.2 * sideMovement) * 4.5
          ),
          lookAt: assetPos.clone(),
          fov: 55
        }
      ];
    };

    const generateMultiAssetAnimation = (center: THREE.Vector3, assets: THREE.Vector3[], baseAngle: number) => {
      // Calculate dynamic duration: 4 seconds per asset + 6 seconds intro = minimum showcase time
      const minSecondsPerAsset = 4;
      const introDuration = 6;
      const dynamicDuration = Math.max(20, introDuration + (assets.length * minSecondsPerAsset));

      console.log(`🎯 Multiple assets: Creating ${dynamicDuration}s video for ${assets.length} assets (${minSecondsPerAsset}s each + ${introDuration}s intro)`);

      const movements = [
        // 0s: Start from current camera position
        {
          time: 0,
          position: startPosition ? startPosition.clone() : new THREE.Vector3(
            center.x + Math.sin(baseAngle) * 3.5,
            center.y + 2.5,
            center.z + Math.cos(baseAngle) * 3.5
          ),
          lookAt: center.clone(),
          fov: 50
        },

        // 2s: Very slow, smooth transition to planned showcase
        {
          time: 2,
          position: startPosition ? new THREE.Vector3().lerpVectors(
            startPosition,
            new THREE.Vector3(
              center.x + Math.sin(baseAngle) * 3.5,
              center.y + 2.5,
              center.z + Math.cos(baseAngle) * 3.5
            ),
            0.4
          ) : new THREE.Vector3(
            center.x + Math.sin(baseAngle) * 3.5,
            center.y + 2.5,
            center.z + Math.cos(baseAngle) * 3.5
          ),
          lookAt: center.clone(),
          fov: 45
        },

        // 4s: Continue gentle movement
        {
          time: 4,
          position: new THREE.Vector3(
            center.x + Math.sin(baseAngle + 0.4) * 3.5,
            center.y + 2.5,
            center.z + Math.cos(baseAngle + 0.4) * 3.5
          ),
          lookAt: center.clone(),
          fov: 40
        },

        {
          time: 6,
          position: new THREE.Vector3(
            center.x + Math.sin(baseAngle + 0.8) * 3,
            center.y + 2,
            center.z + Math.cos(baseAngle + 0.8) * 3
          ),
          lookAt: center.clone(),
          fov: 45
        }
      ];

      // 6s to end: Close-up tour of each asset (final phase)
      const tourDuration = dynamicDuration - introDuration;
      const timePerAsset = tourDuration / assets.length;

      assets.forEach((asset, index) => {
        const startTime = introDuration + (index * timePerAsset);
        const midTime = startTime + (timePerAsset * 0.5);
        const endTime = startTime + timePerAsset;

        // Approach asset - safe distance
        movements.push({
          time: startTime,
          position: new THREE.Vector3(
            asset.x + Math.sin(baseAngle + index) * 2.5,
            asset.y + 1.5,
            asset.z + Math.cos(baseAngle + index) * 2.5
          ),
          lookAt: asset.clone(),
          fov: 40
        });

        // Close-up of asset - safe but close
        movements.push({
          time: midTime,
          position: new THREE.Vector3(
            asset.x + Math.sin(baseAngle + index + 0.3) * 2,
            asset.y + 1,
            asset.z + Math.cos(baseAngle + index + 0.3) * 2
          ),
          lookAt: asset.clone(),
          fov: 35
        });

        // Transition to next (unless it's the last asset)
        if (index < assets.length - 1) {
          movements.push({
            time: endTime,
            position: new THREE.Vector3(
              asset.x + Math.sin(baseAngle + index + 0.6) * 2.2,
              asset.y + 1.2,
              asset.z + Math.cos(baseAngle + index + 0.6) * 2.2
            ),
            lookAt: assets[index + 1].clone(),
            fov: 45
          });
        }
      });

      // Final moderate zoom-out (dynamic time) - closer
      movements.push({
        time: dynamicDuration,
        position: new THREE.Vector3(
          center.x + Math.sin(baseAngle + 6) * 5,
          center.y + 3,
          center.z + Math.cos(baseAngle + 6) * 5
        ),
        lookAt: center.clone(),
        fov: 60
      });

      // Sort by time to ensure proper order
      const sortedMovements = movements.sort((a, b) => a.time - b.time);

      console.log('📋 Generated', sortedMovements.length, 'keyframes for', assets.length, 'assets:');
      sortedMovements.forEach((movement, index) => {
        console.log(`  ${index}: t=${movement.time}s, pos=(${movement.position.x.toFixed(1)}, ${movement.position.y.toFixed(1)}, ${movement.position.z.toFixed(1)}), fov=${movement.fov}`);
      });

      // Store dynamic duration for later use
      return { keyframes: sortedMovements, dynamicDuration };
    };

    const interpolateKeyframes = (currentTime: number): { position: THREE.Vector3; lookAt: THREE.Vector3; fov: number } => {
      const keyframes = keyframesRef.current;

      if (keyframes.length === 0) {
        return {
          position: new THREE.Vector3(0, 2, 5),
          lookAt: new THREE.Vector3(0, 0, 0),
          fov: 50
        };
      }

      // Clamp time to valid range using dynamic duration
      const clampedTime = Math.max(0, Math.min(currentTime, dynamicDurationRef.current));

      // Find surrounding keyframes
      let beforeFrame = keyframes[0];
      let afterFrame = keyframes[keyframes.length - 1];

      // Handle edge cases
      if (clampedTime <= keyframes[0].time) {
        return {
          position: keyframes[0].position.clone(),
          lookAt: keyframes[0].lookAt.clone(),
          fov: keyframes[0].fov || 50
        };
      }

      if (clampedTime >= keyframes[keyframes.length - 1].time) {
        const lastFrame = keyframes[keyframes.length - 1];
        return {
          position: lastFrame.position.clone(),
          lookAt: lastFrame.lookAt.clone(),
          fov: lastFrame.fov || 50
        };
      }

      // Find the correct keyframe interval
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (clampedTime >= keyframes[i].time && clampedTime <= keyframes[i + 1].time) {
          beforeFrame = keyframes[i];
          afterFrame = keyframes[i + 1];
          break;
        }
      }

      // Calculate interpolation factor
      const timeDiff = afterFrame.time - beforeFrame.time;
      const t = timeDiff > 0 ? (clampedTime - beforeFrame.time) / timeDiff : 0;

      // Debug log which keyframes we're interpolating between (occasionally during recording)
      if (isRecordingRef.current && Math.floor(clampedTime * 2) !== Math.floor((clampedTime - 0.016) * 2)) {
        console.log(`🔄 Interpolating: t=${clampedTime.toFixed(2)}s between keyframes [${beforeFrame.time}s → ${afterFrame.time}s] progress: ${(t * 100).toFixed(1)}%`);
      }

      // Use different easing based on recording state
      let easedT: number;
      if (isRecordingRef.current) {
        // Smoother easing for recording - hermite interpolation
        easedT = t * t * (3.0 - 2.0 * t);
      } else {
        // Even smoother for preview
        easedT = t * t * t * (t * (t * 6 - 15) + 10);
      }

      // Interpolate position with smooth curves
      const position = new THREE.Vector3().lerpVectors(beforeFrame.position, afterFrame.position, easedT);

      // Interpolate look-at target
      const lookAt = new THREE.Vector3().lerpVectors(beforeFrame.lookAt, afterFrame.lookAt, easedT);

      // Interpolate FOV with smoother transitions
      const fov = THREE.MathUtils.lerp(beforeFrame.fov || 50, afterFrame.fov || 50, easedT);

      return { position, lookAt, fov };
    };

    useImperativeHandle(ref, () => ({
      startRecordingAnimation: () => {
        console.log('🎭 DynamicCameraRig.startRecordingAnimation() called');
        isRecordingRef.current = true;
        animationStartTimeRef.current = null;
        const result = generateRandomKeyframes();
        keyframesRef.current = result.keyframes;
        dynamicDurationRef.current = result.dynamicDuration;
        console.log('🎯 Generated keyframes:', keyframesRef.current.length);
        console.log('📋 Dynamic duration:', dynamicDurationRef.current);
        console.log('📋 Recording state set to:', isRecordingRef.current);
      },
      stopRecordingAnimation: () => {
        isRecordingRef.current = false;
        animationStartTimeRef.current = null;
      },
      resetAnimation: () => {
        isRecordingRef.current = false;
        animationStartTimeRef.current = null;
        keyframesRef.current = [];
        dynamicDurationRef.current = duration; // Reset to original duration
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);
        if ('fov' in camera) {
          camera.fov = 50;
          camera.updateProjectionMatrix();
        }
      },
      getDynamicDuration: () => {
        return dynamicDurationRef.current;
      },
    }));

    useFrame(({ clock }) => {
      if (!enabled) {
        console.log('⚠️ DynamicCameraRig useFrame: not enabled');
        return;
      }

      // Debug: Log useFrame calls occasionally
      if (Math.floor(clock.getElapsedTime() * 4) !== Math.floor((clock.getElapsedTime() - 0.016) * 4)) {
        console.log(`🔄 useFrame: enabled=${enabled}, recording=${isRecordingRef.current}, clock=${clock.getElapsedTime().toFixed(2)}s`);
      }

      let currentTime: number;

      if (isRecordingRef.current) {
        if (animationStartTimeRef.current === null) {
          animationStartTimeRef.current = clock.getElapsedTime();
          console.log('🎬 Recording started at clock time:', animationStartTimeRef.current);
          console.log('🎭 Keyframes available:', keyframesRef.current.length);
        }
        currentTime = clock.getElapsedTime() - animationStartTimeRef.current;

        // Debug logging every half second during recording
        if (Math.floor(currentTime * 2) !== Math.floor((currentTime - 0.016) * 2)) {
          console.log(`🎥 Recording: ${currentTime.toFixed(2)}s / ${dynamicDurationRef.current}s - Clock: ${clock.getElapsedTime().toFixed(2)}s`);
        }
      } else {
        // Preview mode - slow continuous movement using dynamic duration
        currentTime = (clock.getElapsedTime() * 0.1) % dynamicDurationRef.current;
      }

      const { position, lookAt, fov } = interpolateKeyframes(currentTime);

      // Apply camera movement - direct during recording for clear motion
      if (isRecordingRef.current) {
        // Direct movement during recording
        camera.position.copy(position);
        camera.lookAt(lookAt);

        // Debug log camera position every second and useFrame calls
        if (Math.floor(currentTime) !== Math.floor((currentTime - 0.016)) && currentTime > 0) {
          console.log(`📍 Camera: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) FOV: ${fov.toFixed(1)} | Time: ${currentTime.toFixed(2)}s`);
        }

        // Log that useFrame is being called during recording (every 2 seconds)
        if (Math.floor(currentTime / 2) !== Math.floor((currentTime - 0.016) / 2)) {
          console.log(`🔄 useFrame active during recording at ${currentTime.toFixed(2)}s`);
        }
      } else {
        // Smooth movement for preview
        camera.position.lerp(position, 0.05);
        camera.lookAt(lookAt);
      }

      // Update FOV if it changed (only for perspective cameras)
      if ('fov' in camera) {
        if (isRecordingRef.current) {
          // Direct FOV change during recording
          camera.fov = fov;
          camera.updateProjectionMatrix();
        } else if (Math.abs(camera.fov - fov) > 0.1) {
          // Smooth FOV change for preview
          camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 0.02);
          camera.updateProjectionMatrix();
        }
      }
    });

    return null;
  }
);