import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface SimpleVoiceMonitorProps {
  sessionId: string;
  candidateEmail: string;
  onVoiceRecorded?: () => void;
}

const SimpleVoiceMonitor: React.FC<SimpleVoiceMonitorProps> = ({
  sessionId,
  candidateEmail,
  onVoiceRecorded
}) => {
  const [status, setStatus] = useState<'recording' | 'monitoring' | 'violation'>('recording');
  const [violations, setViolations] = useState(0);
  const [recordingTime, setRecordingTime] = useState(10);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateVoiceRef = useRef<number[]>([]);

  useEffect(() => {
    startVoiceRecording();
    return () => cleanup();
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 1024;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      toast('🎤 Recording your voice for 10 seconds...', { duration: 3000 });
      recordCandidateVoice();
      
    } catch (error) {
      console.error('Voice recording failed:', error);
    }
  };

  const recordCandidateVoice = () => {
    const samples: number[][] = [];
    let timeLeft = 10;
    
    const recordSample = () => {
      if (timeLeft > 0) {
        const voiceData = getVoiceData();
        if (voiceData.length > 0) samples.push(voiceData);
        
        setRecordingTime(timeLeft);
        timeLeft--;
        setTimeout(recordSample, 1000);
      } else {
        // Create voice profile
        if (samples.length > 0) {
          const profile = samples[0].map((_, i) => 
            samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length
          );
          candidateVoiceRef.current = profile;
          setStatus('monitoring');
          toast.success('✅ Voice recorded! Monitoring started.');
          onVoiceRecorded?.();
          startMonitoring();
        }
      }
    };
    
    recordSample();
  };

  const getVoiceData = (): number[] => {
    if (!analyserRef.current) return [];
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
    if (totalEnergy < 500) return [];
    
    // Extract voice features
    const features: number[] = [];
    
    // Pitch
    let maxVal = 0;
    let pitch = 0;
    for (let i = 10; i < 50; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        pitch = i;
      }
    }
    features.push(pitch);
    
    // Energy in different frequency bands
    const lowEnergy = dataArray.slice(0, 32).reduce((a, b) => a + b, 0);
    const midEnergy = dataArray.slice(32, 64).reduce((a, b) => a + b, 0);
    const highEnergy = dataArray.slice(64, 96).reduce((a, b) => a + b, 0);
    
    features.push(lowEnergy, midEnergy, highEnergy);
    
    return features;
  };

  const startMonitoring = () => {
    const monitor = () => {
      if (status !== 'monitoring') return;
      
      const currentVoice = getVoiceData();
      if (currentVoice.length > 0) {
        const similarity = calculateSimilarity(candidateVoiceRef.current, currentVoice);
        
        if (similarity < 0.5) {
          handleViolation('Different voice detected');
        }
      }
      
      setTimeout(monitor, 1000);
    };
    
    monitor();
  };

  const calculateSimilarity = (voice1: number[], voice2: number[]): number => {
    if (voice1.length === 0 || voice2.length === 0) return 1;
    
    let similarity = 0;
    const minLength = Math.min(voice1.length, voice2.length);
    
    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(voice1[i] - voice2[i]);
      const maxVal = Math.max(voice1[i], voice2[i]);
      similarity += maxVal > 0 ? (1 - diff / maxVal) : 1;
    }
    
    return similarity / minLength;
  };

  const handleViolation = async (message: string) => {
    setViolations(prev => prev + 1);
    setStatus('violation');
    
    // Log violation
    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          candidateEmail,
          eventType: 'UNKNOWN_VOICE_DETECTED',
          description: message,
          metadata: JSON.stringify({ timestamp: Date.now() })
        })
      });
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
    
    toast.error(`🚨 ${message}`, { duration: 4000 });
    
    // Reset to monitoring after 3 seconds
    setTimeout(() => setStatus('monitoring'), 3000);
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  return (
    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-purple-800">🎙️ Voice Monitor</span>
        <div className={`w-3 h-3 rounded-full ${
          status === 'recording' ? 'bg-red-500 animate-pulse' :
          status === 'monitoring' ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
      </div>
      
      <div className="space-y-2">
        {status === 'recording' && (
          <>
            <div className="bg-red-100 border border-red-300 rounded p-2">
              <div className="text-red-800 text-xs font-medium">
                🔴 Recording your voice... {recordingTime}s
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Please speak naturally during recording
            </div>
          </>
        )}
        
        {status === 'monitoring' && (
          <>
            <div className="bg-green-100 border border-green-300 rounded p-2">
              <div className="text-green-800 text-xs font-medium">
                ✅ Monitoring for other voices
              </div>
            </div>
            {violations > 0 && (
              <div className="text-red-600 text-xs font-medium">
                ⚠️ Violations: {violations}
              </div>
            )}
          </>
        )}
        
        {status === 'violation' && (
          <div className="bg-red-100 border border-red-300 rounded p-2">
            <div className="text-red-800 text-xs font-medium">
              🚨 Unauthorized voice detected!
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 border-t pt-1">
          AI voice authentication active
        </div>
      </div>
    </div>
  );
};

export default SimpleVoiceMonitor;