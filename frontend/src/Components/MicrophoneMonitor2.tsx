import React, { useEffect, useRef, useState } from 'react';
import { interviewAPI } from '../../../services/api'; // Assuming this is your API client

interface MicrophoneMonitorProps {
  sessionId: string;
  onMicReady?: (ready: boolean) => void;
  onAudioViolation?: (type: string, message: string) => void;
  threshold?: number;
  // --- NEW PROPS ---
  enrollmentMode?: boolean;
  onEnrollmentComplete?: () => void;
}

const MicrophoneMonitor: React.FC<MicrophoneMonitorProps> = ({
  sessionId,
  onMicReady,
  onAudioViolation,
  threshold = 50,
  enrollmentMode = false,
  onEnrollmentComplete
}) => {
  const [micPermission, setMicPermission] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isBreaching, setIsBreaching] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);

  // --- NEW STATES FOR ENROLLMENT ---
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastViolationRef = useRef<number>(0);
  const verificationStreamRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    requestMicrophonePermission();
    return () => {
      stopMicrophone();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      streamRef.current = stream;
      setMicPermission(true);
      onMicReady?.(true);

      startAudioMonitoring(stream);

    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicPermission(false);
      onMicReady?.(false);
    }
  };

  // --- NEW FUNCTION FOR ENROLLMENT ---
  const startVoiceEnrollment = async () => {
    if (!streamRef.current) {
      setEnrollmentStatus("Microphone not ready. Please allow permission.");
      return;
    }
    setIsEnrolling(true);
    setEnrollmentStatus('Recording... Please read the sentence clearly.');

    const mediaRecorder = new MediaRecorder(streamRef.current);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'enrollment.webm');
      formData.append('sessionId', sessionId);

      try {
        await interviewAPI.post('/monitoring/voice-enroll', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setEnrollmentStatus('Voice profile created successfully!');
        onEnrollmentComplete?.();
      } catch (error) {
        setEnrollmentStatus('Failed to create voice profile. Please try again.');
        console.error(error);
      } finally {
        setIsEnrolling(false);
      }
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    // --- EXISTING AUDIO LEVEL MONITORING (UNCHANGED) ---
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    microphone.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    monitorAudioLevel();

    // --- NEW: START VERIFICATION STREAM IF NOT IN ENROLLMENT MODE ---
    if (!enrollmentMode) {
      const verificationRecorder = new MediaRecorder(stream);
      verificationStreamRef.current = verificationRecorder;

      verificationRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const formData = new FormData();
          formData.append('audio', event.data, 'chunk.webm');
          formData.append('sessionId', sessionId);

          try {
            // Fire-and-forget call to the backend
            interviewAPI.post('/monitoring/voice-verify', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (error) {
            console.error('Error sending voice verification chunk:', error);
          }
        }
      };

      verificationRecorder.start(2000); // Send a chunk every 2 seconds
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkAudio = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      setAudioLevel(average);

      const isBreach = average > threshold;
      setIsBreaching(isBreach);

      if (isBreach && Date.now() - lastViolationRef.current > 2000) {
        setViolationCount(prev => prev + 1);
        lastViolationRef.current = Date.now();
        onAudioViolation?.('SOUND_BREACH', `Audio level exceeded threshold: ${Math.round(average)}/${threshold}`);
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  };

  const stopMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (verificationStreamRef.current && verificationStreamRef.current.state !== 'inactive') {
      verificationStreamRef.current.stop();
    }
  };

  return (
    <div className="bg-gray-100 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">🎤 Microphone</span>
        <div className={`w-3 h-3 rounded-full ${micPermission ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* --- NEW ENROLLMENT UI --- */}
      {enrollmentMode && micPermission && (
        <div className="space-y-2 border-b pb-2 mb-2">
          <p className="text-xs text-gray-600">Please read the sentence below to create your voice profile.</p>
          <p className="text-sm font-mono bg-white p-2 rounded border">"The quick brown fox jumps over the lazy dog."</p>
          <button
            onClick={startVoiceEnrollment}
            disabled={isEnrolling}
            className="w-full bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
          >
            {isEnrolling ? 'Recording...' : 'Start Enrollment'}
          </button>
          {enrollmentStatus && <p className="text-xs text-center mt-1">{enrollmentStatus}</p>}
        </div>
      )}

      {/* --- EXISTING MONITORING UI (SHOWN WHEN NOT IN ENROLLMENT MODE) --- */}
      {!enrollmentMode && micPermission && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">Audio Level:</div>
            <div className="text-xs font-mono">
              <span className={audioLevel > threshold ? 'text-red-600 font-bold' : 'text-gray-500'}>
                {Math.round(audioLevel)}
              </span>
              <span className="text-gray-400">/{threshold}</span>
            </div>
          </div>

          <div className="relative w-full bg-gray-300 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-100 ${
                isBreaching ? 'bg-red-500' : audioLevel > threshold * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            />
            <div
              className="absolute top-0 w-0.5 h-3 bg-red-600 opacity-70"
              style={{ left: `${Math.min(threshold * 2, 100)}%` }}
              title={`Threshold: ${threshold}`}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <div className={`flex items-center gap-1 ${
              isBreaching ? 'text-red-600' : 'text-green-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isBreaching ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`} />
              {isBreaching ? 'BREACH' : 'NORMAL'}
            </div>

            {violationCount > 0 && (
              <div className="text-red-600 font-medium">
                Violations: {violationCount}
              </div>
            )}
          </div>
        </div>
      )}

      {!micPermission && (
        <div className="text-xs text-red-600 mt-1">
          Microphone access required
        </div>
      )}

      {micPermission && (
        <div className="text-xs text-gray-500 mt-1 border-t pt-1">
          {enrollmentMode ? 'Enrollment Mode' : 'Monitoring Mode'} | Threshold: {threshold}
        </div>
      )}
    </div>
  );
};

export default MicrophoneMonitor;