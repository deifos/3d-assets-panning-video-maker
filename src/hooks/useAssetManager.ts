import { useState, useCallback } from 'react';
import * as THREE from 'three';

export interface Asset {
  id: string;
  name: string;
  url: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
}

export const useAssetManager = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addAsset = useCallback((file: File): Promise<Asset> => {
    return new Promise((resolve) => {
      setIsUploading(true);

      // Create object URL for the file
      const url = URL.createObjectURL(file);

      // Generate random position in a circle around origin, all on same base level
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 3; // 1-4 units from center (tighter grouping)
      const position = new THREE.Vector3(
        Math.sin(angle) * radius,
        0, // Keep all assets at ground level (y=0)
        Math.cos(angle) * radius
      );

      const newAsset: Asset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        url,
        position,
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0), // Random Y rotation
        scale: 1 + (Math.random() - 0.5) * 0.5, // 0.75 - 1.25 scale
      };

      setAssets(prev => [...prev, newAsset]);
      setIsUploading(false);
      resolve(newAsset);
    });
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<Omit<Asset, 'id'>>) => {
    setAssets(prev => prev.map(asset =>
      asset.id === id ? { ...asset, ...updates } : asset
    ));
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets(prev => {
      const asset = prev.find(a => a.id === id);
      if (asset) {
        URL.revokeObjectURL(asset.url); // Clean up object URL
      }
      return prev.filter(asset => asset.id !== id);
    });
  }, []);

  const clearAssets = useCallback(() => {
    // Clean up all object URLs
    assets.forEach(asset => {
      URL.revokeObjectURL(asset.url);
    });
    setAssets([]);
  }, [assets]);

  const getAssetsPositions = useCallback(() => {
    return assets.map(asset => asset.position);
  }, [assets]);

  const randomizePositions = useCallback(() => {
    setAssets(prev => prev.map(asset => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 3;
      return {
        ...asset,
        position: new THREE.Vector3(
          Math.sin(angle) * radius,
          0, // Keep all assets at ground level
          Math.cos(angle) * radius
        ),
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
      };
    }));
  }, []);

  return {
    assets,
    isUploading,
    addAsset,
    updateAsset,
    removeAsset,
    clearAssets,
    getAssetsPositions,
    randomizePositions,
  };
};