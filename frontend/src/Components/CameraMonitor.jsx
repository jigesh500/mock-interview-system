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
          scoreThreshold: 0.5
        });
        
        const detections = await faceapi.detectAllFaces(videoRef.current, options);
        const faceDetected = detections.length > 0;
        const multipleDetected = detections.length > 1;
        
        let currentEventType;
        let currentStatus;
        
        if (multipleDetected) {
          currentEventType = "MULTIPLE_FACES";
          currentStatus = "⚠️ Multiple Faces Detected";
        } else if (faceDetected) {
          currentEventType = "FACE_DETECTED";
          currentStatus = "✅ Monitoring Active";
        } else {
          currentEventType = "FACE_NOT_DETECTED";
          currentStatus = "⚠️ Face Not Detected";
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
  }, [sessionId, user, isAuthenticated, isLoading, interviewStarted, lastEventType]);

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