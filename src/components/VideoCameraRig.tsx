import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type AnimationStyle =
  | 'orbit'           // Original circular orbit
  | 'zoom-reveal'     // Zoom in from far to close
  | 'side-pan'        // Smooth side-to-side pan
  | 'dramatic-sweep'  // Low to high dramatic sweep
  | 'reel-showcase'   // Instagram reel style with multiple moves
  | 'zoom-orbit';     // Zoom + orbit combination

export interface VideoCameraRigRef {
  startRecordingAnimation: () => void;
  stopRecordingAnimation: () => void;
  resetAnimation: () => void;
}

interface VideoCameraRigProps {
  radius?: number;
  speed?: number;
  enabled?: boolean;
  animationStyle?: AnimationStyle;
  duration?: number;
}

export const VideoCameraRig = forwardRef<VideoCameraRigRef, VideoCameraRigProps>(
  ({ radius = 5, speed = 0.2, enabled = false, animationStyle = 'orbit', duration = 5 }, ref) => {
    const { camera } = useThree();
    const animationStartTimeRef = useRef<number | null>(null);
    const isRecordingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      startRecordingAnimation: () => {
        isRecordingRef.current = true;
        animationStartTimeRef.current = null; // Will be set on first frame
      },
      stopRecordingAnimation: () => {
        isRecordingRef.current = false;
        animationStartTimeRef.current = null;
      },
      resetAnimation: () => {
        isRecordingRef.current = false;
        animationStartTimeRef.current = null;
        // Reset camera to initial position
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 1, 0);
      },
    }));

    const getAnimationPosition = (progress: number) => {
      const targetPosition = new THREE.Vector3(0, 1, 0); // Look at target

      switch (animationStyle) {
        case 'zoom-reveal': {
          // Start far away and zoom in dramatically
          const startDistance = 15;
          const endDistance = 3;
          const distance = THREE.MathUtils.lerp(startDistance, endDistance, progress);

          // Slight arc movement while zooming
          const angle = progress * Math.PI * 0.3; // 54 degrees arc
          return {
            position: new THREE.Vector3(
              Math.sin(angle) * distance,
              2 + Math.sin(progress * Math.PI) * 1.5, // Height variation
              Math.cos(angle) * distance
            ),
            lookAt: targetPosition
          };
        }

        case 'side-pan': {
          // Smooth side-to-side pan with slight zoom
          const distance = radius - progress * 1.5; // Slight zoom in
          const panRange = 4;
          const x = Math.sin(progress * Math.PI * 2) * panRange;

          return {
            position: new THREE.Vector3(x, 2.5, distance),
            lookAt: targetPosition
          };
        }

        case 'dramatic-sweep': {
          // Low dramatic angle sweeping up and around
          const angle = progress * Math.PI * 1.5; // 270 degrees
          const height = 0.5 + progress * 3; // From low to high
          const distance = radius + Math.sin(progress * Math.PI) * 2;

          return {
            position: new THREE.Vector3(
              Math.sin(angle) * distance,
              height,
              Math.cos(angle) * distance
            ),
            lookAt: new THREE.Vector3(0, 1 + progress * 0.5, 0)
          };
        }

        case 'reel-showcase': {
          // Instagram reel style - multiple movements in one take
          if (progress < 0.3) {
            // Phase 1: Close-up reveal (0-30%)
            const p = progress / 0.3;
            const distance = THREE.MathUtils.lerp(8, 3, p);
            return {
              position: new THREE.Vector3(distance * 0.3, 1.5, distance),
              lookAt: new THREE.Vector3(0, 1.2, 0)
            };
          } else if (progress < 0.7) {
            // Phase 2: Side pan with orbit (30-70%)
            const p = (progress - 0.3) / 0.4;
            const angle = p * Math.PI;
            const distance = 4;
            return {
              position: new THREE.Vector3(
                Math.sin(angle) * distance,
                2 + Math.sin(p * Math.PI * 2) * 0.5,
                Math.cos(angle) * distance
              ),
              lookAt: targetPosition
            };
          } else {
            // Phase 3: Pull back reveal (70-100%)
            const p = (progress - 0.7) / 0.3;
            const distance = THREE.MathUtils.lerp(4, 7, p);
            return {
              position: new THREE.Vector3(
                Math.sin(Math.PI) * distance,
                3 + p * 1,
                Math.cos(Math.PI) * distance
              ),
              lookAt: targetPosition
            };
          }
        }

        case 'zoom-orbit': {
          // Combination of zoom and orbit
          const angle = progress * Math.PI * 2; // Full rotation
          const distance = radius + Math.sin(progress * Math.PI) * 3; // Distance variation

          return {
            position: new THREE.Vector3(
              Math.sin(angle) * distance,
              2 + Math.sin(progress * Math.PI * 3) * 0.8, // Height variation
              Math.cos(angle) * distance
            ),
            lookAt: targetPosition
          };
        }

        case 'orbit':
        default: {
          // Original smooth circular motion with improvements
          const angle = progress * Math.PI * 2 * speed;
          return {
            position: new THREE.Vector3(
              Math.sin(angle) * radius,
              2 + Math.sin(progress * Math.PI * 2) * 0.5,
              Math.cos(angle) * radius
            ),
            lookAt: targetPosition
          };
        }
      }
    };

    useFrame(({ clock }) => {
      if (!enabled) return;

      let t: number;

      if (isRecordingRef.current) {
        // Use controlled time for recording
        if (animationStartTimeRef.current === null) {
          animationStartTimeRef.current = clock.getElapsedTime();
        }
        t = clock.getElapsedTime() - animationStartTimeRef.current;
      } else {
        // Use regular clock for preview
        t = clock.getElapsedTime();
      }

      // Calculate progress (0 to 1) over the duration
      const progress = isRecordingRef.current
        ? Math.min(t / duration, 1)
        : (t * 0.1) % 1; // Slower preview

      // Get animation position and target
      const { position, lookAt } = getAnimationPosition(progress);

      // Smooth camera movement
      camera.position.lerp(position, 0.1);
      camera.lookAt(lookAt);
    });

    return null;
  }
);