import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface PreInterviewSetupProps {
  sessionId: string;
  onSetupComplete: (voiceProfile: any) => void;
}

const PreInterviewSetup: React.FC<PreInterviewSetupProps> = ({
  sessionId,
  onSetupComplete
}) => {
  const [step, setStep] = useState<'permissions' | 'complete'>('permissions');
  const [cameraReady, setCameraReady] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }

      setVoiceReady(true);
      setStep('complete');
      toast.success('✅ Camera and microphone access granted! Starting interview...');
      
      logEventToBackend('SETUP_COMPLETE', 'Interview setup completed (voice calibration skipped)');
      
      setTimeout(() => {
        onSetupComplete(null);
      }, 2000);
      
    } catch (error) {
      console.error('Permission denied:', error);
      toast.error('Please allow camera and microphone access to continue');
    }
  };

  const logEventToBackend = async (eventType: string, description: string) => {
    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          eventType,
          description,
          metadata: JSON.stringify({ timestamp: Date.now() })
        })
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Interview Setup</h1>

        {step === 'permissions' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-4">Camera & Microphone Access Required</h2>
              <p className="text-gray-600 mb-6">
                We need access to your camera and microphone for proctoring during the interview.
              </p>
            </div>
            <button
              onClick={requestPermissions}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Grant Permissions
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-4">Setup Complete!</h2>
            <p className="text-gray-600 mb-6">
              Camera and microphone access granted. The interview will start shortly.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreInterviewSetup;