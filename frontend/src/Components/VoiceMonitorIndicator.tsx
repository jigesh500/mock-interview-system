import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface VoiceMonitorIndicatorProps {
  sessionId: string;
  candidateEmail: string;
}

const VoiceMonitorIndicator: React.FC<VoiceMonitorIndicatorProps> = ({
  sessionId,
  candidateEmail
}) => {
  const [status, setStatus] = useState<'capturing' | 'monitoring'>('capturing');
  const [violations, setViolations] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateVoiceRef = useRef<number[]>([]);

  useEffect(() => {
    startVoiceCapture();
    return () => cleanup();
  }, []);

  const startVoiceCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Show instruction and capture voice
      toast('🎤 Please say: "Hello, I am ready for this interview"', { duration: 4000 });
      
      setTimeout(() => {
        captureCandidateVoice();
      }, 2000);
      
    } catch (error) {
      console.error('Voice capture failed:', error);
    }
  };

  const captureCandidateVoice = () => {
    const samples: number[][] = [];
    let sampleCount = 0;
    
    const collectSample = () => {
      if (sampleCount < 15) { // Capture for 3 seconds
        const voiceData = extractVoiceFeatures();
        if (voiceData.length > 0) samples.push(voiceData);
        sampleCount++;
        setTimeout(collectSample, 200);
      } else {
        // Create voice profile
        if (samples.length > 0) {
          const profile = samples[0].map((_, i) => 
            samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length
          );
          candidateVoiceRef.current = profile;
          setStatus('monitoring');
          toast.success('✅ Voice captured! Monitoring started.');
          startMonitoring();
        }
      }
    };
    
    collectSample();
  };

  const extractVoiceFeatures = (): number[] => {
    if (!analyserRef.current) return [];
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
    if (totalEnergy < 300) return [];
    
    // Extract simple voice features
    const features: number[] = [];
    
    // Pitch (fundamental frequency)
    let maxVal = 0;
    let pitch = 0;
    for (let i = 5; i < 40; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        pitch = i;
      }
    }
    features.push(pitch);
    
    // Energy distribution
    const lowEnergy = dataArray.slice(0, 20).reduce((a, b) => a + b, 0);
    const midEnergy = dataArray.slice(20, 60).reduce((a, b) => a + b, 0);
    const highEnergy = dataArray.slice(60, 100).reduce((a, b) => a + b, 0);
    
    features.push(lowEnergy, midEnergy, highEnergy);
    
    return features;
  };

  const startMonitoring = () => {
    const monitor = () => {
      if (status !== 'monitoring') return;
      
      const currentVoice = extractVoiceFeatures();
      if (currentVoice.length > 0) {
        const similarity = calculateSimilarity(candidateVoiceRef.current, currentVoice);
        
        // If similarity is too low, different person speaking
        if (similarity < 0.4) {
          handleViolation('Different voice detected during interview');
        }
      }
      
      setTimeout(monitor, 1500);
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
    <div className="bg-gray-100 p-2 rounded text-center">
      <div className="flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'capturing' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
        }`} />
        <span className="text-xs text-gray-700">
          {status === 'capturing' ? 'Capturing Voice...' : 'Voice Monitoring Active'}
        </span>
      </div>
      {violations > 0 && (
        <div className="text-xs text-red-600 mt-1">
          Violations: {violations}
        </div>
      )}
    </div>
  );
};

export default VoiceMonitorIndicator;