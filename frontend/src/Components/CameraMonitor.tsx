import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Typography, Button } from '@mui/material';
import toast from 'react-hot-toast';

interface CameraMonitorProps {
  sessionId: string;
  onInterviewEnd?: () => void;
  onCameraReady?: (granted: boolean) => void;
}

const CameraMonitor: React.FC<CameraMonitorProps> = ({ sessionId, onInterviewEnd, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [lastEventType, setLastEventType] = useState<string | null>(null);
  const [interviewStarted, setInterviewStarted] = useState<boolean>(false);
  const [multipleFaceViolations, setMultipleFaceViolations] = useState<number>(0);
  const [noFaceViolations, setNoFaceViolations] = useState<number>(0);
  const [isViolated, setIsViolated] = useState<boolean>(false);

  const handleSecurityViolation = useCallback(async (type: string, message: string) => {
    if (!sessionId) return;

    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          candidateEmail: 'anonymous@interview.com',
          eventType: type,
          description: message,
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        })
      });
    } catch (err) {
      console.error('Error logging security violation:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermission('granted');
        onCameraReady?.(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setStatus('📹 Camera Ready');
          };
        }
      } catch (err) {
        setCameraPermission('denied');
        onCameraReady?.(false);
        setStatus("Camera access denied");
      }
    };

    requestCamera();
  }, [onCameraReady]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        console.log('Face detection models loaded');
      } catch (err) {
        console.error("Error loading models:", err);
        setStatus("Error loading AI models");
      }
    };

    loadModels();
  }, []);

  // Log interview start event
  useEffect(() => {
    if (sessionId && !interviewStarted) {
      const logInterviewStart = async () => {
        const eventData = {
          sessionId,
          candidateEmail: 'anonymous@interview.com',
          eventType: "INTERVIEW_START",
          description: "Interview monitoring started",
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        };

        try {
          await fetch('http://localhost:8081/api/monitoring/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(eventData)
          });
          setInterviewStarted(true);
        } catch (err) {
          console.error("Error logging interview start:", err);
        }
      };

      logInterviewStart();
    }
  }, [sessionId, interviewStarted]);

  // Event-based face detection monitoring
  useEffect(() => {
    if (!sessionId || !interviewStarted) {
      return;
    }

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState < 2) {
        return;
      }

      try {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.3
        });
        const detections = await faceapi.detectAllFaces(videoRef.current, options);
        const faceDetected = detections.length > 0;
        const multipleDetected = detections.length > 1;

        let currentEventType: string;
        let currentStatus: string;

        const terminateInterview = async (reason: string, count: number) => {
          setIsViolated(true);
          toast.error(`❌ INTERVIEW TERMINATED: Due to multiple violations`);

          try {
            await fetch('http://localhost:8081/api/monitoring/log-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                sessionId,
                candidateEmail: 'anonymous@interview.com',
                eventType: 'INTERVIEW_TERMINATED',
                description: `Interview terminated due to ${reason} violations`,
                metadata: JSON.stringify({ violationCount: count, reason })
              })
            });
          } catch (err) {
            console.error('Error logging termination:', err);
          }

          setTimeout(() => {
            window.location.href = '/violation';
          }, 2000);
        };

        if (multipleDetected) {
          currentEventType = "MULTIPLE_FACES";
          currentStatus = "⚠️ Multiple Faces Detected";

          if (lastEventType !== "MULTIPLE_FACES" && !isViolated) {
            const newCount = multipleFaceViolations + 1;
            setMultipleFaceViolations(newCount);

            if (newCount === 1) {
              toast.error("⚠️ WARNING: Multiple faces detected! Please ensure only you are visible.");
            } else if (newCount === 2) {
              toast.error("⚠️ SECOND WARNING: Multiple faces detected again!");
            } else if (newCount === 3) {
              toast.error("🚨 FINAL WARNING: One more multiple face violation will terminate your interview!");
            } else if (newCount >= 4) {
              terminateInterview('MULTIPLE_FACES', newCount);
              return;
            }
          }
        } else if (faceDetected) {
          currentEventType = "FACE_DETECTED";
          currentStatus = "✅ Monitoring Active";
        } else {
          currentEventType = "FACE_NOT_DETECTED";
          currentStatus = "⚠️ Face Not Detected";

          if (lastEventType !== "FACE_NOT_DETECTED" && !isViolated) {
            const newCount = noFaceViolations + 1;
            setNoFaceViolations(newCount);

            if (newCount === 1) {
              toast.error("⚠️ WARNING: Face not detected! Please position yourself in front of the camera.");
            } else if (newCount === 2) {
              toast.error("⚠️ SECOND WARNING: Face still not detected! Ensure proper lighting and camera position.");
            } else if (newCount === 3) {
              toast.error("🚨 FINAL WARNING: One more face detection failure will terminate your interview!");
            } else if (newCount >= 4) {
              terminateInterview('FACE_NOT_DETECTED', newCount);
              return;
            }
          }
        }

        setStatus(currentStatus);

        // Only log if event type changed
        if (currentEventType !== lastEventType) {
          const eventData = {
            sessionId,
            candidateEmail: 'anonymous@interview.com',
            eventType: currentEventType,
            description: currentStatus,
            metadata: JSON.stringify({
              faceCount: detections.length,
              confidence: detections[0]?.score || 0
            })
          };

          try {
            await fetch('http://localhost:8081/api/monitoring/log-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(eventData)
            });

            setLastEventType(currentEventType);
            console.log('State change logged:', currentEventType);
          } catch (err) {
            console.error("Error sending monitoring event:", err);
          }
        }
      } catch (error) {
        console.error("Face detection error:", error);
        setStatus("⚠️ Detection Error");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, interviewStarted, lastEventType, multipleFaceViolations, noFaceViolations, isViolated]);

  if (cameraPermission === 'denied') {
    return (
      <div className="text-center p-4 bg-red-100 rounded">
        <Typography color="error">
          📷 Camera access required to start interview
        </Typography>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <video ref={videoRef} autoPlay muted width={200} height={150} className="rounded" />
      <div className={`text-xs mt-1 px-2 py-1 rounded ${
        status.includes('✅') ? 'bg-green-100 text-green-700' :
        status.includes('⚠️') ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-600'
      }`}>
        {status}
      </div>
    </div>
  );
};

export default CameraMonitor;
