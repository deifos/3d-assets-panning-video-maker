import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Asset } from '../hooks/useAssetManager';

interface AssetRendererProps {
  asset: Asset;
  isSelected?: boolean;
  onSelect?: () => void;
  onPositionChange?: (position: THREE.Vector3) => void;
  onRotationChange?: (rotation: THREE.Euler) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isVideoMode?: boolean;
}

export function AssetRenderer({ asset, isSelected, onSelect, onPositionChange, onRotationChange, onDragStart, onDragEnd, isVideoMode }: AssetRendererProps) {
  const { scene } = useGLTF(asset.url);
  const meshRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragPlane] = useState(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)); // XZ plane
  const [dragPoint] = useState(new THREE.Vector3());
  const [lastPointerPosition] = useState(new THREE.Vector2());
  const { camera, raycaster, pointer } = useThree();

  // Add subtle animation when not in video mode
  useFrame(({ clock }) => {
    if (!meshRef.current || isVideoMode) return;

    // Gentle floating animation
    const time = clock.getElapsedTime();
    meshRef.current.position.y = asset.position.y + Math.sin(time + asset.position.x) * 0.1;
  });

  const handlePointerDown = useCallback((event: any) => {
    if (isVideoMode) return;

    event.stopPropagation();

    // Check if Shift key is held for rotation mode
    if (event.shiftKey) {
      setIsRotating(true);
      lastPointerPosition.set(pointer.x, pointer.y);
    } else {
      setIsDragging(true);
    }

    onSelect?.();
    onDragStart?.();
  }, [isVideoMode, onSelect, onDragStart, pointer, lastPointerPosition]);

  const handlePointerMove = useCallback((event: any) => {
    if ((!isDragging && !isRotating) || isVideoMode || !meshRef.current) return;

    event.stopPropagation();

    if (isDragging) {
      // Position dragging
      raycaster.setFromCamera(pointer, camera);

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const newPosition = new THREE.Vector3(dragPoint.x, 0, dragPoint.z);
        meshRef.current.position.copy(newPosition);
        onPositionChange?.(newPosition);
      }
    } else if (isRotating) {
      // Rotation mode
      const deltaX = pointer.x - lastPointerPosition.x;

      // Rotate around Y-axis based on horizontal movement
      const rotationSpeed = 3;
      const newRotationY = asset.rotation.y + deltaX * rotationSpeed;
      const newRotation = new THREE.Euler(asset.rotation.x, newRotationY, asset.rotation.z);

      meshRef.current.rotation.copy(newRotation);
      onRotationChange?.(newRotation);

      lastPointerPosition.set(pointer.x, pointer.y);
    }
  }, [isDragging, isRotating, isVideoMode, camera, raycaster, pointer, dragPlane, dragPoint, onPositionChange, onRotationChange, asset.rotation, lastPointerPosition]);

  const handlePointerUp = useCallback(() => {
    if (isDragging || isRotating) {
      setIsDragging(false);
      setIsRotating(false);
      onDragEnd?.();
    }
  }, [isDragging, isRotating, onDragEnd]);

  return (
    <group
      ref={meshRef}
      position={[asset.position.x, asset.position.y, asset.position.z]}
      rotation={[asset.rotation.x, asset.rotation.y, asset.rotation.z]}
      scale={asset.scale}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={onSelect}
    >
      <primitive object={scene.clone()} />

      {/* Selection indicator */}
      {isSelected && !isVideoMode && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Drag indicator */}
      {isDragging && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      )}

      {/* Rotation indicator */}
      {isRotating && (
        <>
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial color="#ff00ff" />
          </mesh>
          {/* Rotation ring indicator */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.5, 2.8, 16]} />
            <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} />
          </mesh>
        </>
      )}

    </group>
  );
}