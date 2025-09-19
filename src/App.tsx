import { useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useVideoCapture } from "./hooks/useVideoCapture";
import { useAssetManager } from "./hooks/useAssetManager";
import { DynamicCameraRig } from "./components/DynamicCameraRig";
import { AssetRenderer } from "./components/AssetRenderer";
import type { DynamicCameraRigRef } from "./components/DynamicCameraRig";


export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRigRef = useRef<DynamicCameraRigRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDraggingAsset, setIsDraggingAsset] = useState(false);

  const { startRecording, downloadVideo } = useVideoCapture();
  const {
    assets,
    isUploading,
    addAsset,
    updateAsset,
    removeAsset,
    clearAssets,
    getAssetsPositions,
    randomizePositions
  } = useAssetManager();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
        try {
          await addAsset(file);
        } catch (error) {
          console.error('Error adding asset:', error);
          alert(`Error loading ${file.name}. Please try again.`);
        }
      } else {
        alert(`${file.name} is not a supported format. Please use .glb or .gltf files.`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAsset]);

  const handleGenerateVideo = useCallback(async () => {
    if (!canvasRef.current || isRecording || assets.length === 0) return;

    try {
      setIsRecording(true);
      setIsVideoMode(true);

      // Wait for the camera rig to mount properly (need more time for React to mount the component)
      console.log('🎬 Starting video generation...');
      console.log('⏱️ Waiting for DynamicCameraRig to mount...');

      // Wait multiple frames for the component to mount and ref to connect
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Check ref status and start animation
      console.log('🎭 Camera rig ref status:', cameraRigRef.current ? 'Connected' : 'NOT Connected');
      let dynamicDuration = 20; // Default fallback

      if (cameraRigRef.current !== null) {
        console.log('🎬 Calling startRecordingAnimation()...');
        (cameraRigRef.current as DynamicCameraRigRef).startRecordingAnimation();
        dynamicDuration = (cameraRigRef.current as DynamicCameraRigRef).getDynamicDuration();
      } else {
        console.error('❌ Camera rig ref is null! Retrying...');

        // Retry after a longer delay
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('🎭 Retry - Camera rig ref status:', cameraRigRef.current ? 'Connected' : 'STILL NOT Connected');

        if (cameraRigRef.current !== null) {
          console.log('🎬 Retry successful - Calling startRecordingAnimation()...');
          (cameraRigRef.current as DynamicCameraRigRef).startRecordingAnimation();
          dynamicDuration = (cameraRigRef.current as DynamicCameraRigRef).getDynamicDuration();
        } else {
          console.error('❌ Camera rig ref is still null after retry! Animation will not work.');
        }
      }

      console.log('📏 Using dynamic duration:', dynamicDuration, 'seconds');
      console.log('🎥 Starting canvas recording...');

      // Start recording with dynamic duration
      const videoData = await startRecording(canvasRef.current, dynamicDuration);

      console.log('✅ Recording completed, stopping animation...');

      // Stop the camera animation
      cameraRigRef.current?.stopRecordingAnimation();

      // Download the video
      downloadVideo(videoData, `dynamic-showcase-${Date.now()}.mp4`);

      console.log('📁 Video downloaded successfully!');
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Error generating video. Please try again.');
    } finally {
      setIsRecording(false);
      setIsVideoMode(false);
      cameraRigRef.current?.resetAnimation();
    }
  }, [startRecording, downloadVideo, isRecording, assets.length]);

  return (
    <div className="relative w-screen h-screen">
      <Canvas
        ref={canvasRef}
        className="w-full h-full bg-gray-900"
        camera={{ position: [0, 3, 8], fov: 50 }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Ground plane for reference (only visible in preview mode) */}
        {!isVideoMode && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial color="#333" transparent opacity={0.2} />
          </mesh>
        )}

        {/* Render all assets */}
        {assets.map((asset) => (
          <AssetRenderer
            key={asset.id}
            asset={asset}
            isSelected={selectedAssetId === asset.id}
            onSelect={() => setSelectedAssetId(asset.id)}
            onPositionChange={(position) => updateAsset(asset.id, { position })}
            onRotationChange={(rotation) => updateAsset(asset.id, { rotation })}
            onDragStart={() => setIsDraggingAsset(true)}
            onDragEnd={() => setIsDraggingAsset(false)}
            isVideoMode={isVideoMode}
          />
        ))}

        {/* Camera controls */}
        {isVideoMode ? (
          <DynamicCameraRig
            ref={cameraRigRef}
            enabled={true}
            duration={20}
            assetsPositions={getAssetsPositions()}
          />
        ) : (
          // In preview mode, just use OrbitControls - no camera rig
          <OrbitControls
            enablePan={!isDraggingAsset}
            enableZoom={!isDraggingAsset}
            enableRotate={!isDraggingAsset}
            minDistance={2}
            maxDistance={20}
            target={[0, 0, 0]}
          />
        )}
      </Canvas>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main UI Panel */}
      <div
        className="absolute top-5 right-5 bottom-5 z-10 flex flex-col gap-4 max-w-80 max-h-[calc(100vh-2.5rem)] overflow-y-auto"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          bottom: '20px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '320px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto'
        }}
      >
        {/* Asset Management */}
        <div
          className="bg-black/90 p-5 rounded-xl border border-white/10 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3
            className="text-white mb-4 text-lg font-bold"
            style={{
              color: 'white',
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            3D Assets ({assets.length})
          </h3>

          {assets.length === 0 ? (
            <div
              className="text-center text-gray-400 text-sm my-5"
              style={{
                textAlign: 'center',
                color: '#ccc',
                fontSize: '14px',
                margin: '20px 0'
              }}
            >
              No assets loaded. Upload .glb or .gltf files to get started!
            </div>
          ) : (
            <div className="mb-4 max-h-48 overflow-y-auto pr-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`flex justify-between items-center px-3 py-2 my-1 rounded-md cursor-pointer border ${
                    selectedAssetId === asset.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-transparent'
                  }`}
                  onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                >
                  <span
                    className="text-white text-sm font-medium"
                    style={{
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    {asset.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAsset(asset.id);
                      if (selectedAssetId === asset.id) setSelectedAssetId(null);
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 px-2 py-1 rounded text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controls Help */}
          {assets.length > 0 && (
            <div
              className="text-xs text-gray-500 mb-3 p-2 bg-gray-800/50 rounded border border-gray-700"
              style={{
                fontSize: '11px',
                color: '#888',
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: 'rgba(50,50,50,0.5)',
                borderRadius: '6px',
                border: '1px solid #444'
              }}
            >
              <div>🖱️ <strong>Drag:</strong> Click and drag to move</div>
              <div>🔄 <strong>Rotate:</strong> Hold Shift + drag to rotate</div>
              <div>📹 <strong>Camera:</strong> Right-click drag to orbit view</div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isUploading ? 'Uploading...' : '+ Add Assets'}
            </button>

            {assets.length > 1 && (
              <button
                onClick={randomizePositions}
                disabled={isRecording}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🎲 Shuffle
              </button>
            )}

            {assets.length > 0 && (
              <button
                onClick={clearAssets}
                disabled={isRecording}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>

        {/* Video Generation */}
        <div
          className="bg-black/90 p-5 rounded-xl border border-white/10 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3
            className="text-white mb-4 text-lg font-bold"
            style={{
              color: 'white',
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            Video Generation
          </h3>

          <div
            className="text-gray-400 text-sm mb-4 leading-relaxed"
            style={{
              color: '#ccc',
              fontSize: '14px',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}
          >
            Creates dynamic videos with ultra-close camera movements. Single assets: 20s dramatic zoom showcase. Multiple assets: Dynamic duration (4s per asset) with individual close-up tours.
          </div>

          <button
            onClick={handleGenerateVideo}
            disabled={isRecording || assets.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg text-lg font-bold transition-colors shadow-lg hover:shadow-xl"
          >
            {isRecording
              ? 'Generating Ultra-Close Video...'
              : assets.length === 0
              ? 'Add Assets to Generate Video'
              : `🎬 Generate Ultra-Close Video ${assets.length === 1 ? '(20s)' : `(${6 + assets.length * 4}s)`}`
            }
          </button>

          {isRecording && (
            <div className="text-white text-sm text-center bg-red-500/20 p-3 rounded-md border border-red-500/30 flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording dynamic showcase...
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
