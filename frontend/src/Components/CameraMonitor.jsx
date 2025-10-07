// src/components/CameraMonitor.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../hooks/useAuth';

const CameraMonitor = ({ sessionId }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Loading...");
  const { user, isAuthenticated, loading: isLoading } = useAuth();

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
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadeddata = () => {
            console.log('Video loaded and ready for detection');
            setStatus('📹 Camera Ready');
          };
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          setStatus("Camera access denied");
        });
    };

    loadModels();
  }, []);

  // State tracking for event-based monitoring
  const [lastEventType, setLastEventType] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [multipleFaceViolations, setMultipleFaceViolations] = useState(0);
  const [noFaceViolations, setNoFaceViolations] = useState(0);
  const [isViolated, setIsViolated] = useState(false);

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

//     const validFaces = detections.filter(detection => {
//       const box = detection.box;
//       const minFaceSize = 80;     // Minimum face size
//       const minConfidence = 0.75; // High confidence
//
//       return detection.score >= minConfidence &&
//              box.width >= minFaceSize &&
//              box.height >= minFaceSize;
//     });
//
//         const detections = await faceapi.detectAllFaces(videoRef.current, options);
//         const faceDetected = detections.length > 0;
//         const multipleDetected = detections.length > 1;
        
        let currentEventType;
        let currentStatus;
        
        const terminateInterview = async (reason, count) => {
          setIsViolated(true);
          alert(`❌ INTERVIEW TERMINATED: Too many ${reason === 'MULTIPLE_FACES' ? 'multiple face' : 'face detection'} violations.`);
          
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
      <video ref={videoRef} autoPlay muted width="200" height="150" className="rounded" />
      <div className={`text-xs mt-1 px-2 py-1 rounded ${
        status.includes('✅') ? 'bg-green-100 text-green-700' : 
        status.includes('⚠️') ? 'bg-yellow-100 text-yellow-700' : 
        'bg-gray-100 text-gray-600'
      }`}>
        {status}
      </div>
      {/* Show auth status */}
      {!isAuthenticated && (
        <div className="text-xs text-red-500 mt-1">
          Please login to enable monitoring
        </div>
      )}
    </div>
  );
};

export default CameraMonitor;