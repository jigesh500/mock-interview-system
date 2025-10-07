import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../hooks/useAuth';
import { useExamSecurity } from '../hooks/useExamSecurity';

interface CameraMonitorProps {
  sessionId: string;
}

interface User {
  email?: string;
  [key: string]: any;
}

const CameraMonitor: React.FC<CameraMonitorProps> = ({ sessionId }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const { user, isAuthenticated, loading: isLoading } = useAuth() as {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
  };

  const handleSecurityViolation = useCallback(async (type: string, message: string) => {
    if (!isAuthenticated || !user?.email || !sessionId) return;

    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          candidateEmail: user.email,
          eventType: type,
          description: message,
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        })
      });
    } catch (err) {
      console.error('Error logging security violation:', err);
    }
  }, [isAuthenticated, user?.email, sessionId]);

  const { enterFullscreen } = useExamSecurity(handleSecurityViolation);
//   useEffect(() => {
//       if (isAuthenticated && user?.email && sessionId && interviewStarted) {
//         // Activate exam security mode
//         enterFullscreen();
//       }
//     }, [isAuthenticated, user?.email, sessionId, interviewStarted, enterFullscreen]);

  // State tracking for event-based monitoring
  const [lastEventType, setLastEventType] = useState<string | null>(null);
  const [interviewStarted, setInterviewStarted] = useState<boolean>(false);
  const [multipleFaceViolations, setMultipleFaceViolations] = useState<number>(0);
  const [noFaceViolations, setNoFaceViolations] = useState<number>(0);
  const [isViolated, setIsViolated] = useState<boolean>(false);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        startVideo();
      } catch (err) {
        console.error("Error loading models:", err);
        setStatus("Error loading AI models");
      }
    };

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
              console.log('Video loaded and ready for detection');
              setStatus('📹 Camera Ready');
            };
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          setStatus("Camera access denied");
        });
    };

    loadModels();
  }, []);

  // Log interview start event
  useEffect(() => {
    if (isAuthenticated && user?.email && sessionId && !interviewStarted) {
      const logInterviewStart = async () => {
        const eventData = {
          sessionId,
          candidateEmail: user.email,
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
  }, [isAuthenticated, user?.email, sessionId, interviewStarted]);

  // Event-based face detection monitoring
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user?.email || !sessionId || !interviewStarted) {
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
          alert(`❌ INTERVIEW TERMINATED: Due to multiple violations`);

          try {
            await fetch('http://localhost:8081/api/monitoring/log-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                sessionId,
                candidateEmail: user.email,
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
              alert("⚠️ WARNING: Multiple faces detected! Please ensure only you are visible.");
            } else if (newCount === 2) {
              alert("⚠️ SECOND WARNING: Multiple faces detected again!");
            } else if (newCount === 3) {
              alert("🚨 FINAL WARNING: One more multiple face violation will terminate your interview!");
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
              alert("⚠️ WARNING: Face not detected! Please position yourself in front of the camera.");
            } else if (newCount === 2) {
              alert("⚠️ SECOND WARNING: Face still not detected! Ensure proper lighting and camera position.");
            } else if (newCount === 3) {
              alert("🚨 FINAL WARNING: One more face detection failure will terminate your interview!");
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
            candidateEmail: user.email,
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
  }, [sessionId, user, isAuthenticated, isLoading, interviewStarted, lastEventType, multipleFaceViolations, noFaceViolations, isViolated]);

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
      <button 
        onClick={enterFullscreen} 
        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
      >
        🔒 Enter Exam Mode
      </button>
      {!isAuthenticated && (
        <div className="text-xs text-red-500 mt-1">
          Please login to enable monitoring
        </div>
      )}
    </div>
  );
};

export default CameraMonitor;