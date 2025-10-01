// src/components/CameraMonitor.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth0 } from "@auth0/auth0-react";

const CameraMonitor = ({ sessionId }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Loading...");
  const { user } = useAuth0(); // get candidate email from Auth0

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models'); // models in public/models
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
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          setStatus("Camera access denied");
        });
    };

    loadModels();
  }, []);

  // Detect face and send monitoring events
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return;

      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      const faceDetected = detections.length > 0;
      const currentStatus = faceDetected ? "Present" : "Face not detected";
      setStatus(currentStatus);

      // Send monitoring event to backend
      const eventData = {
        sessionId,
//         candidateEmail: user.email,
        eventType: faceDetected ? "PRESENT" : "FACE_NOT_DETECTED",
        description: currentStatus,
        metadata: JSON.stringify({ faceCount: detections.length })
      };

      try {
        await fetch('http://localhost:8081/api/monitoring/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });
      } catch (err) {
        console.error("Error sending monitoring event:", err);
      }
    }, 2000); // every 2 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div>
      <video ref={videoRef} autoPlay muted width="400" height="300" />
      <p>Status: {status}</p>
    </div>
  );
};

export default CameraMonitor;
