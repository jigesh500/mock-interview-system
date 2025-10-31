import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface VoiceProfile {
  mean: number[];
  variance: number[];
  samples: number[][];
}

interface InterviewVoiceMonitorProps {
  sessionId: string;
  voiceProfile: VoiceProfile;
  onViolation?: (type: string, message: string) => void;
}

const InterviewVoiceMonitor: React.FC<InterviewVoiceMonitorProps> = ({
  sessionId,
  voiceProfile,
  onViolation
}) => {
  const [violations, setViolations] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [threshold, setThreshold] = useState(0.4);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startMonitoring();
    return () => cleanup();
  }, []);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsMonitoring(true);
      startContinuousMonitoring();

    } catch (error) {
      console.error('Failed to start voice monitoring:', error);
    }
  };

  const startContinuousMonitoring = () => {
    let consecutiveViolations = 0;

    const monitor = () => {
      if (!isMonitoring || !analyserRef.current) return;

      const currentVoice = extractVoiceFeatures();
      if (currentVoice.length > 0) {
        const similarity = compareWithProfile(currentVoice);

        console.log(`Voice similarity: ${similarity.toFixed(3)}, Threshold: ${threshold.toFixed(3)}`);

        if (similarity < threshold) {
          consecutiveViolations++;
          console.log(`🚨 Potential violation: ${consecutiveViolations}/3`);

          if (consecutiveViolations >= 3) {
            handleViolation('Unknown voice detected - possible external assistance');
            consecutiveViolations = 0;
          }
        } else {
          consecutiveViolations = Math.max(0, consecutiveViolations - 1);
        }
      }

      monitoringIntervalRef.current = setTimeout(monitor, 2000);
    };

    monitor();
  };

  const extractVoiceFeatures = (): number[] => {
    if (!analyserRef.current) return [];

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
    if (totalEnergy < 100) return [];

    const mfcc = extractMFCC(dataArray);
    const pitch = extractPitch(dataArray);
    const energyDistribution = extractEnergyDistribution(dataArray);

    return [...mfcc, pitch, ...energyDistribution];
  };

  const extractMFCC = (dataArray: Uint8Array): number[] => {
    const numCoefficients = 13;
    const mfcc: number[] = [];

    for (let i = 0; i < numCoefficients; i++) {
      let energy = 0;
      const startBin = Math.floor(i * dataArray.length / numCoefficients);
      const endBin = Math.floor((i + 1) * dataArray.length / numCoefficients);

      for (let j = startBin; j < endBin; j++) {
        energy += dataArray[j];
      }
      mfcc.push(Math.log(Math.max(energy, 1)));
    }

    return mfcc;
  };

  const extractPitch = (dataArray: Uint8Array): number => {
    let maxVal = 0;
    let pitch = 0;

    const minBin = Math.floor(50 * dataArray.length / (audioContextRef.current?.sampleRate || 44100));
    const maxBin = Math.floor(500 * dataArray.length / (audioContextRef.current?.sampleRate || 44100));

    for (let i = minBin; i < maxBin; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        pitch = i;
      }
    }

    return pitch;
  };

  const extractEnergyDistribution = (dataArray: Uint8Array): number[] => {
    const totalBins = dataArray.length;
    const lowEnergy = dataArray.slice(0, Math.floor(totalBins * 0.3)).reduce((a, b) => a + b, 0);
    const midEnergy = dataArray.slice(Math.floor(totalBins * 0.3), Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);
    const highEnergy = dataArray.slice(Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);

    const total = lowEnergy + midEnergy + highEnergy;
    if (total === 0) return [0, 0, 0];

    return [lowEnergy / total, midEnergy / total, highEnergy / total];
  };

  const compareWithProfile = (currentVoice: number[]): number => {
    if (!voiceProfile || voiceProfile.mean.length === 0 || currentVoice.length === 0) return 1;

    const minLength = Math.min(voiceProfile.mean.length, currentVoice.length);

    let dotProduct = 0;
    let profileMagnitude = 0;
    let currentMagnitude = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += voiceProfile.mean[i] * currentVoice[i];
      profileMagnitude += voiceProfile.mean[i] * voiceProfile.mean[i];
      currentMagnitude += currentVoice[i] * currentVoice[i];
    }

    if (profileMagnitude === 0 || currentMagnitude === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(profileMagnitude) * Math.sqrt(currentMagnitude));
    return Math.max(0, Math.min(1, Math.abs(similarity)));
  };

  const handleViolation = async (message: string) => {
    setViolations(prev => prev + 1);

    toast.error(`🚨 Security Alert: ${message}`, {
      duration: 5000,
      icon: '⚠️'
    });

    if (onViolation) {
      onViolation('UNKNOWN_VOICE_DETECTED', message);
    }

    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          eventType: 'UNKNOWN_VOICE_DETECTED',
          description: message,
          metadata: JSON.stringify({
            timestamp: Date.now(),
            violationCount: violations + 1,
            threshold: threshold
          })
        })
      });
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
  };

  const cleanup = () => {
    setIsMonitoring(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (monitoringIntervalRef.current) {
      clearTimeout(monitoringIntervalRef.current);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-red-500' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium text-red-700">
          {isMonitoring ? 'Voice Security Active' : 'Voice Security Inactive'}
        </span>
      </div>

      {violations > 0 && (
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Security Violations: {violations}
        </div>
      )}

      <div className="text-xs text-red-600 mt-1">
        Monitoring for unauthorized assistance
      </div>
    </div>
  );
};

export default InterviewVoiceMonitor;