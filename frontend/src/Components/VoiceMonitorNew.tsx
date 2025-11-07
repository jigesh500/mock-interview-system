import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface VoiceMonitorNewProps {
  sessionId: string;
  candidateEmail: string;
  onViolation?: (type: string, message: string) => void;
}

const VoiceMonitorNew: React.FC<VoiceMonitorNewProps> = ({
  sessionId,
  candidateEmail,
  onViolation
}) => {
  const [status, setStatus] = useState<'initializing' | 'capturing' | 'monitoring' | 'error'>('initializing');
  const [violations, setViolations] = useState(0);
  const [baselineStored, setBaselineStored] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeVoiceCapture();
    return () => cleanup();
  }, []);

  const initializeVoiceCapture = async () => {
    try {
      setStatus('initializing');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      startVoiceCapture();
      
    } catch (error) {
      console.error('Voice capture failed:', error);
      setStatus('error');
      toast.error('Microphone access failed');
    }
  };

  const startVoiceCapture = () => {
    setStatus('capturing');
    toast('🎤 Say: "Hello, I am ready for this interview"', { duration: 4000 });
    
    setTimeout(() => {
      captureBaseline();
    }, 4000);
  };

  const captureBaseline = async () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await storeBaseline(audioBlob);
      };
      
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 4000);
      
    } catch (error) {
      console.error('Baseline capture failed:', error);
      setStatus('error');
    }
  };

  const storeBaseline = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'baseline.webm');
      formData.append('sessionId', sessionId);
      formData.append('candidateEmail', candidateEmail);
      
      const response = await fetch('http://localhost:8081/api/voice/store-baseline', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBaselineStored(true);
        setStatus('monitoring');
        toast.success('✅ Voice baseline stored! Monitoring started.');
        startMonitoring();
      } else {
        throw new Error(result.error || 'Failed to store baseline');
      }
      
    } catch (error) {
      console.error('Baseline storage failed:', error);
      setStatus('error');
      toast.error('Failed to store voice baseline');
    }
  };

  const startMonitoring = () => {
    monitoringIntervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 8000);
  };

  const captureAndAnalyze = async () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await analyzeVoice(audioBlob);
      };
      
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Voice analysis capture failed:', error);
    }
  };

  const analyzeVoice = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'sample.webm');
      formData.append('sessionId', sessionId);
      formData.append('candidateEmail', candidateEmail);
      
      const response = await fetch('http://localhost:8081/api/voice/verify-unknown', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.violation) {
        setViolations(prev => prev + 1);
        onViolation?.('UNKNOWN_VOICE_DETECTED', result.message);
        toast.error('🚨 ' + result.message);
      }
      
    } catch (error) {
      console.error('Voice analysis failed:', error);
    }
  };

  const cleanup = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-800">🎤 AI Voice Monitor</span>
        <div className={`w-3 h-3 rounded-full ${
          status === 'monitoring' ? 'bg-green-500' :
          status === 'capturing' ? 'bg-yellow-500' :
          status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-gray-700">
          Status: <span className="font-medium">
            {status === 'initializing' && 'Starting...'}
            {status === 'capturing' && 'Capturing baseline...'}
            {status === 'monitoring' && 'Active monitoring'}
            {status === 'error' && 'Error'}
          </span>
        </div>
        
        {violations > 0 && (
          <div className="text-xs text-red-600 font-medium">
            ⚠️ {violations} voice violations detected
          </div>
        )}
        
        <div className="text-xs text-gray-500 border-t pt-1">
          {status === 'monitoring' && '🔊 Comparing voices with AI'}
          {status === 'capturing' && 'Please speak the phrase clearly'}
          {status === 'error' && 'Voice monitoring unavailable'}
        </div>
      </div>
    </div>
  );
};

export default VoiceMonitorNew;