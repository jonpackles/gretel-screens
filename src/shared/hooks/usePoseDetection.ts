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
  const detectionLoopRef = useRef<number | null>(null);
  const cameraTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initCamera = useCallback(async () => {
    try {
      console.log('usePoseDetection: Starting camera initialization...');
      setDebugInfo('Requesting camera access...');
      
      // Stop any existing stream first
      if (cameraStreamRef.current) {
        console.log('usePoseDetection: Stopping existing camera stream');
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      
      // Clear any existing timeout
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      
      console.log('usePoseDetection: Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      console.log('usePoseDetection: getUserMedia successful, stream tracks:', stream.getTracks().length);
      
      if (videoRef.current) {
        console.log('usePoseDetection: Setting video srcObject');
        videoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
        
        // Wait for video to be ready with polling approach
        console.log('usePoseDetection: Waiting for video to be ready...');
        const startTime = Date.now();
        const maxWaitTime = 10000; // 10 seconds
        
        const checkVideoReady = (): boolean => {
          const video = videoRef.current!;
          const isReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
          
          console.log('usePoseDetection: Video check -', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            isReady
          });
          
          return isReady;
        };
        
        // Immediate check
        if (checkVideoReady()) {
          console.log('usePoseDetection: Video already ready');
          setDebugInfo('Camera loaded successfully');
        } else {
          // Poll for readiness
          await new Promise((resolve, reject) => {
            let isResolved = false;
            let pollInterval: NodeJS.Timeout;
            
            // Event listeners as additional triggers
            const onVideoEvent = () => {
              if (isResolved) return;
              
              if (checkVideoReady()) {
                console.log('usePoseDetection: Video ready via event');
                setDebugInfo('Camera loaded successfully');
                resolveOnce(true);
              }
            };
            
            const cleanup = () => {
              if (pollInterval) clearInterval(pollInterval);
              if (cameraTimeoutRef.current) {
                clearTimeout(cameraTimeoutRef.current);
                cameraTimeoutRef.current = null;
              }
              // Remove event listeners
              if (videoRef.current) {
                videoRef.current.removeEventListener('loadeddata', onVideoEvent);
                videoRef.current.removeEventListener('canplay', onVideoEvent);
                videoRef.current.removeEventListener('loadedmetadata', onVideoEvent);
              }
            };
            
            const resolveOnce = (result: any) => {
              if (!isResolved) {
                console.log('usePoseDetection: resolveOnce called, cleaning up...');
                isResolved = true;
                cleanup();
                resolve(result);
              } else {
                console.log('usePoseDetection: resolveOnce called but already resolved');
              }
            };
            
            const rejectOnce = (error: any) => {
              if (!isResolved) {
                console.log('usePoseDetection: rejectOnce called, cleaning up...');
                isResolved = true;
                cleanup();
                reject(error);
              } else {
                console.log('usePoseDetection: rejectOnce called but already resolved');
              }
            };
            
            // Start polling - this handles both success and timeout cases
            pollInterval = setInterval(() => {
              if (isResolved) return;
              
              const elapsed = Date.now() - startTime;
              
              if (checkVideoReady()) {
                console.log('usePoseDetection: Video became ready after', elapsed, 'ms');
                setDebugInfo('Camera loaded successfully');
                resolveOnce(true);
              } else if (elapsed > maxWaitTime) {
                console.error('usePoseDetection: Video timeout after', elapsed, 'ms');
                setDebugInfo('Camera timeout - video not ready');
                rejectOnce(new Error('Camera timeout'));
              }
            }, 100); // Check every 100ms
            
            // Set up event listeners
            videoRef.current!.addEventListener('loadeddata', onVideoEvent);
            videoRef.current!.addEventListener('canplay', onVideoEvent);
            videoRef.current!.addEventListener('loadedmetadata', onVideoEvent);
          });
        }
        
        // Ensure video is playing
        try {
          console.log('usePoseDetection: Attempting to play video...');
          await videoRef.current.play();
          console.log('usePoseDetection: Video playing successfully');
          setDebugInfo('Video playing');
          setCameraActive(true);
        } catch (playError) {
          console.error('usePoseDetection: Play error:', playError);
          setDebugInfo('Play error - trying autoplay workaround');
          
          // Try autoplay workaround
          console.log('usePoseDetection: Trying autoplay workaround...');
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play();
          console.log('usePoseDetection: Video playing (muted)');
          setDebugInfo('Video playing (muted)');
          setCameraActive(true);
        }
      } else {
        console.error('usePoseDetection: videoRef.current is null');
        setDebugInfo('Video ref not available');
        setCameraActive(false);
      }
    } catch (error) {
      console.error('usePoseDetection: Error accessing camera:', error);
      setDebugInfo(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCameraActive(false);
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
          
          // More lenient pose detection - just check for basic landmarks
          const basicLandmarks = [0, 11, 12]; // nose, left shoulder, right shoulder
          const hasBasicPose = basicLandmarks.every(index => 
            landmarks[index] && landmarks[index].visibility > 0.3
          );
          
          // Check for full body pose (more strict)
          const requiredLandmarks = [0, 15, 16, 27, 28]; // nose, wrists, ankles
          const allLandmarksVisible = requiredLandmarks.every(index => 
            landmarks[index] && landmarks[index].visibility > 0.5
          );
          
          const detectionResult: PoseDetectionResult = {
            landmarks,
            isFullBodyDetected: allLandmarksVisible,
            requiredLandmarksVisible: allLandmarksVisible
          };
          
          setLatestResult(detectionResult);
          
          if (hasBasicPose) {
            setPoseDetected(true);
            setDebugInfo(`Pose detected: ${allLandmarksVisible ? 'Full body' : 'Partial'}`);
          } else {
            setPoseDetected(false);
            setDebugInfo('No pose detected - move closer to camera');
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
    try {
      console.log('usePoseDetection: startDetection called');
      detectionActiveRef.current = true;
      setDebugInfo('Starting detection...');
      
      console.log('usePoseDetection: Initializing camera...');
      await initCamera();
      console.log('usePoseDetection: Camera initialization complete, cameraActive:', cameraActive);
      
      console.log('usePoseDetection: Initializing pose detection...');
      await initPoseDetection();
      console.log('usePoseDetection: Pose detection initialization complete');
      
      // Start detection loop
      console.log('usePoseDetection: Starting detection loop...');
      const detectLoop = () => {
        if (detectionActiveRef.current) {
          updatePoseDetection();
          detectionLoopRef.current = requestAnimationFrame(detectLoop);
        }
      };
      detectLoop();
      
      console.log('usePoseDetection: Detection loop started');
      setDebugInfo('Detection started');
    } catch (error) {
      console.error('usePoseDetection: Error starting detection:', error);
      setDebugInfo(`Start error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      detectionActiveRef.current = false;
    }
  }, [initCamera, initPoseDetection, updatePoseDetection, cameraActive]);

  const stopDetection = useCallback(() => {
    detectionActiveRef.current = false;
    
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    
    // Clear camera timeout if it's still running
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    
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