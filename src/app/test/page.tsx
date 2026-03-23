'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const ImageFrameAnimator = () => {
  const [image, setImage] = useState(null);
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(2);
  const [fps, setFps] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [frameInfo, setFrameInfo] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const imageRef = useRef(null);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImage(img);
        setPreviewUrl(event.target.result);
        
        // Ensure canvas is initialized with this image
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width / columns;
          canvas.height = img.height / rows;
        }
        
        resetAnimation();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Calculate frame information
  const calculateFrames = useCallback(() => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const frameWidth = img.width / columns;
    const frameHeight = img.height / rows;
    const frames = [];
    
    const totalFrameCount = rows * columns;
    setTotalFrames(totalFrameCount);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const frameIndex = row * columns + col;
        if (frameIndex < totalFrameCount) {
          frames.push({
            sx: col * frameWidth,
            sy: row * frameHeight,
            sWidth: frameWidth,
            sHeight: frameHeight,
          });
        }
      }
    }
    
    setFrameInfo(frames);
    
    // Initialize canvas if needed
    if (canvasRef.current) {
      canvasRef.current.width = frameWidth;
      canvasRef.current.height = frameHeight;
    }
    
    drawFrame(0, frames);
  }, [rows, columns]);
  
  // Recalculate frames when image or grid changes
  useEffect(() => {
    if (imageRef.current) {
      calculateFrames();
    }
  }, [image, rows, columns, calculateFrames]);

  // Draw a specific frame
  const drawFrame = (frameIndex, frames) => {
    if (!canvasRef.current || !imageRef.current || !frames.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (frameIndex >= frames.length) {
      frameIndex = 0;
    }
    
    const frame = frames[frameIndex];
    
    // Make sure canvas dimensions match frame dimensions
    if (canvas.width !== frame.sWidth) {
      canvas.width = frame.sWidth;
    }
    if (canvas.height !== frame.sHeight) {
      canvas.height = frame.sHeight;
    }
    
    // Draw the specific portion of the image
    ctx.drawImage(
      imageRef.current,
      frame.sx, frame.sy,
      frame.sWidth, frame.sHeight,
      0, 0,
      frame.sWidth, frame.sHeight
    );
    
    setCurrentFrame(frameIndex);
  };

  // Animation loop
  const animate = () => {
    if (!frameInfo.length) return;
    
    const nextFrame = (currentFrame + 1) % totalFrames;
    drawFrame(nextFrame, frameInfo);
    
    const frameDelay = 1000 / fps;
    animationRef.current = setTimeout(() => {
      if (isPlaying) {
        animate();
      }
    }, frameDelay);
  };

  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
      animate();
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentFrame, fps, frameInfo]);

  // Reset animation
  const resetAnimation = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    setCurrentFrame(0);
    drawFrame(0, frameInfo);
  };

  // Update grid layout
  const updateGrid = () => {
    if (imageRef.current) {
      resetAnimation();
      calculateFrames();
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-4xl mx-auto p-4 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800">Image Frame Animator</h2>
      
      {/* Upload section */}
      <div className="flex flex-col space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Upload sprite sheet image:
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">Supported formats: PNG, JPG, GIF, etc.</p>
      </div>
      
      {/* Settings section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700">Rows:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value))}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700">Columns:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={columns}
            onChange={(e) => setColumns(parseInt(e.target.value))}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700">FPS:</label>
          <input
            type="number"
            min="1"
            max="60"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>
      
      <button
        onClick={updateGrid}
        className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Apply Grid Settings
      </button>
      
      {/* Preview section */}
      {previewUrl && (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={resetAnimation}
              className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-start">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-2">Current Frame</h3>
              <div className="border-2 border-blue-400 rounded-md p-1 bg-white">
                <canvas
                  ref={canvasRef}
                  width="200"
                  height="200"
                  className="max-w-full"
                  style={{ imageRendering: 'pixelated' }}
                ></canvas>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Frame: {currentFrame + 1} / {totalFrames}
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-2">Sprite Sheet</h3>
              <div className="border-2 border-gray-300 rounded-md p-1 bg-white overflow-auto max-h-64 relative">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Uploaded sprite sheet"
                    className="max-w-full"
                    style={{ maxHeight: '16rem' }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!previewUrl && (
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-md border-2 border-dashed border-gray-300">
          <p className="text-gray-500">Upload an image to begin</p>
        </div>
      )}
      
      <div className="text-sm text-gray-600 mt-4">
        <p>
          <strong>Instructions:</strong> Upload a sprite sheet image, set the number of rows and columns,
          and click "Apply Grid Settings". Then use the Play/Pause button to animate through the frames.
        </p>
      </div>
    </div>
  );
};

export default ImageFrameAnimator;
