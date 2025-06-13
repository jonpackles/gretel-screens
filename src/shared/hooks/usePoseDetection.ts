'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface PoseDetectionResult {
  landmarks: any[] | null;
  isFullBodyDetected: boolean;
  requiredLandmarksVisible: boolean;
}

export interface UsePoseDetectionReturn {
  // State
  cameraActive: boolean;
  poseDetected: boolean;
  debugInfo: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  
  // Methods
  startDetection: () => void;
  stopDetection: () => void;
  
  // Detection result
  latestResult: PoseDetectionResult | null;
}

export function usePoseDetection(): UsePoseDetectionReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [latestResult, setLatestResult] = useState<PoseDetectionResult | null>(null);
  
  // Pose detection refs
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const detectionActiveRef = useRef(false);

  const initCamera = useCallback(async () => {
    try {
      setDebugInfo('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
        
        await new Promise((resolve, reject) => {
          videoRef.current!.onloadeddata = () => {
            console.log('Camera loaded', videoRef.current!.videoWidth, 'x', videoRef.current!.videoHeight);
            setDebugInfo('Camera loaded successfully');
            resolve(true);
          };
          videoRef.current!.onerror = (e) => {
            console.error('Video error:', e);
            setDebugInfo('Camera error');
            reject(e);
          };
          setTimeout(() => {
            setDebugInfo('Camera timeout');
            reject(new Error('Camera timeout'));
          }, 5000);
        });
        
        // Ensure video is playing
        try {
          await videoRef.current.play();
          console.log('Video playing');
          setDebugInfo('Video playing');
        } catch (playError) {
          console.error('Play error:', playError);
          setDebugInfo('Play error');
        }
        
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setDebugInfo(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const initPoseDetection = useCallback(async () => {
    try {
      console.log('Loading MediaPipe...');
      setDebugInfo('Loading MediaPipe...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      console.log('MediaPipe loaded successfully');
      setDebugInfo('MediaPipe loaded');
    } catch (error) {
      console.error('Error initializing pose detection:', error);
      setDebugInfo(`MediaPipe error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const updatePoseDetection = useCallback(() => {
    if (!videoRef.current || !poseLandmarkerRef.current || !detectionActiveRef.current) {
      return;
    }

    try {
      if (videoRef.current.videoWidth > 0 && videoRef.current.readyState >= 2) {
        const results = poseLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Check if we have all required landmarks for full pose
          const requiredLandmarks = [0, 15, 16, 27, 28]; // nose, wrists, ankles
          const allLandmarksVisible = requiredLandmarks.every(index => 
            landmarks[index] && landmarks[index].visibility > 0.6
          );
          
          const detectionResult: PoseDetectionResult = {
            landmarks,
            isFullBodyDetected: allLandmarksVisible,
            requiredLandmarksVisible: allLandmarksVisible
          };
          
          setLatestResult(detectionResult);
          
          if (allLandmarksVisible) {
            setPoseDetected(true);
            setDebugInfo(`Full pose detected: all required landmarks visible`);
          } else {
            setPoseDetected(false);
            setDebugInfo('Incomplete pose - some landmarks missing');
          }
        } else {
          setPoseDetected(false);
          setDebugInfo('No pose landmarks detected');
          setLatestResult({
            landmarks: null,
            isFullBodyDetected: false,
            requiredLandmarksVisible: false
          });
        }
      } else {
        setDebugInfo(`Video not ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}, readyState: ${videoRef.current.readyState}`);
      }
    } catch (error) {
      console.error('Pose detection error:', error);
      setDebugInfo(`Pose error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const startDetection = useCallback(async () => {
    detectionActiveRef.current = true;
    await initCamera();
    await initPoseDetection();
    
    // Start detection loop
    const detectLoop = () => {
      if (detectionActiveRef.current) {
        updatePoseDetection();
        requestAnimationFrame(detectLoop);
      }
    };
    detectLoop();
  }, [initCamera, initPoseDetection, updatePoseDetection]);

  const stopDetection = useCallback(() => {
    detectionActiveRef.current = false;
    
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    
    setCameraActive(false);
    setPoseDetected(false);
    setLatestResult(null);
    setDebugInfo('Detection stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    cameraActive,
    poseDetected,
    debugInfo,
    videoRef,
    startDetection,
    stopDetection,
    latestResult
  };
} 