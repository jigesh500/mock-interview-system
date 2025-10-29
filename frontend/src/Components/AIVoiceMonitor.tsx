import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface AIVoiceMonitorProps {
  sessionId: string;
  candidateEmail: string;
  onCalibrationComplete?: () => void;
}

const AIVoiceMonitor: React.FC<AIVoiceMonitorProps> = ({
  sessionId,
  candidateEmail,
  onCalibrationComplete
}) => {
  const [status, setStatus] = useState<'initializing' | 'calibrating' | 'monitoring' | 'error'>('initializing');
  const [violations, setViolations] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [soundLevel, setSoundLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateVoiceRef = useRef<number[]>([]);
  const calibrationSamplesRef = useRef<number[][]>([]);

  useEffect(() => {
    initializeVoiceMonitoring();
    return () => cleanup();
  }, []);

  const initializeVoiceMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false
        }
      });

      streamRef.current = stream;
      setupAudioAnalysis(stream);
      setStatus('calibrating');
      startCalibration();
      
    } catch (error) {
      console.error('Voice monitoring initialization failed:', error);
      setStatus('error');
    }
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
  };

  const startCalibration = () => {
    toast('🎤 Please read: "Hello, my name is [Your Name] and I am ready for this interview"', { duration: 4000 });
    
    const calibrationDuration = 3000; // Reduced to 3 seconds
    const sampleInterval = 150;
    let samplesCollected = 0;
    const totalSamples = calibrationDuration / sampleInterval;

    const collectSample = () => {
      const voiceFeatures = extractVoiceFeatures();
      if (voiceFeatures && voiceFeatures.length > 0) {
        calibrationSamplesRef.current.push(voiceFeatures);
        samplesCollected++;
        setCalibrationProgress((samplesCollected / totalSamples) * 100);
      }

      if (samplesCollected < totalSamples) {
        setTimeout(collectSample, sampleInterval);
      } else {
        completeCalibration();
      }
    };

    collectSample();
  };

  const completeCalibration = async () => {
    if (calibrationSamplesRef.current.length === 0) {
      setStatus('error');
      toast.error('Voice calibration failed - no voice detected');
      return;
    }

    const featureCount = calibrationSamplesRef.current[0].length;
    const voiceProfile = new Array(featureCount).fill(0);
    
    calibrationSamplesRef.current.forEach(sample => {
      sample.forEach((feature, index) => {
        voiceProfile[index] += feature;
      });
    });

    voiceProfile.forEach((_, index) => {
      voiceProfile[index] /= calibrationSamplesRef.current.length;
    });

    candidateVoiceRef.current = voiceProfile;
    setStatus('monitoring');
    
    await logEvent('VOICE_CALIBRATION_COMPLETE', 'Candidate voice profile created');
    toast.success('✅ Voice calibration complete - monitoring started');
    onCalibrationComplete?.();
    
    startMonitoring();
  };

  const extractVoiceFeatures = (): number[] | null => {
    if (!analyserRef.current) return null;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
    if (totalEnergy < 1000) return null;

    const features: number[] = [];

    // Pitch
    const pitch = findPitch(dataArray);
    features.push(pitch);

    // Formants
    const formants = extractFormants(dataArray);
    features.push(...formants);

    // Spectral centroid
    const centroid = calculateSpectralCentroid(dataArray);
    features.push(centroid);

    // Energy ratio
    const energyRatio = calculateEnergyRatio(dataArray);
    features.push(energyRatio);

    return features;
  };

  const findPitch = (dataArray: Uint8Array): number => {
    let maxVal = 0;
    let pitch = 0;
    
    const startBin = Math.floor((80 / 8000) * dataArray.length);
    const endBin = Math.floor((400 / 8000) * dataArray.length);
    
    for (let i = startBin; i < endBin; i++) {
      if (dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        pitch = (i / dataArray.length) * 8000;
      }
    }
    
    return pitch;
  };

  const extractFormants = (dataArray: Uint8Array): number[] => {
    const peaks: { freq: number; amplitude: number }[] = [];
    
    for (let i = 1; i < dataArray.length - 1; i++) {
      if (dataArray[i] > dataArray[i-1] && dataArray[i] > dataArray[i+1] && dataArray[i] > 30) {
        const freq = (i / dataArray.length) * 8000;
        if (freq >= 200 && freq <= 3000) {
          peaks.push({ freq, amplitude: dataArray[i] });
        }
      }
    }
    
    peaks.sort((a, b) => b.amplitude - a.amplitude);
    const formants = [0, 0, 0];
    for (let i = 0; i < Math.min(3, peaks.length); i++) {
      formants[i] = peaks[i].freq;
    }
    
    return formants;
  };

  const calculateSpectralCentroid = (dataArray: Uint8Array): number => {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const freq = (i / dataArray.length) * 8000;
      weightedSum += freq * dataArray[i];
      magnitudeSum += dataArray[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  };

  const calculateEnergyRatio = (dataArray: Uint8Array): number => {
    const midPoint = Math.floor(dataArray.length / 2);
    let lowEnergy = 0;
    let highEnergy = 0;
    
    for (let i = 0; i < midPoint; i++) {
      lowEnergy += dataArray[i];
    }
    for (let i = midPoint; i < dataArray.length; i++) {
      highEnergy += dataArray[i];
    }
    
    return lowEnergy > 0 ? highEnergy / lowEnergy : 0;
  };

  const startMonitoring = () => {
    const monitor = () => {
      if (status !== 'monitoring') return;
      
      // Update sound level for visual indicator
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avgLevel = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setSoundLevel(avgLevel);
        setIsListening(avgLevel > 20); // Show listening indicator when sound detected
      }
      
      const currentFeatures = extractVoiceFeatures();
      if (currentFeatures) {
        const similarity = calculateSimilarity(candidateVoiceRef.current, currentFeatures);
        
        if (similarity < 0.6) {
          handleViolation('UNKNOWN_VOICE_DETECTED', `Voice mismatch detected (similarity: ${Math.round(similarity * 100)}%)`);
        }
        
        if (detectMultipleVoices(currentFeatures)) {
          handleViolation('MULTIPLE_VOICES_DETECTED', 'Multiple voices detected simultaneously');
        }
      }
      
      setTimeout(monitor, 300); // Faster monitoring for better responsiveness
    };
    
    monitor();
  };

  const calculateSimilarity = (profile1: number[], profile2: number[]): number => {
    if (profile1.length === 0 || profile2.length === 0) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    const minLength = Math.min(profile1.length, profile2.length);
    for (let i = 0; i < minLength; i++) {
      dotProduct += profile1[i] * profile2[i];
      norm1 += profile1[i] * profile1[i];
      norm2 += profile2[i] * profile2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  };

  const detectMultipleVoices = (features: number[]): boolean => {
    if (candidateVoiceRef.current.length === 0) return false;
    
    const pitchDiff = Math.abs(features[0] - candidateVoiceRef.current[0]);
    const formantDiff = Math.abs(features[1] - candidateVoiceRef.current[1]) + 
                       Math.abs(features[2] - candidateVoiceRef.current[2]);
    
    return pitchDiff > 80 || formantDiff > 600;
  };

  const handleViolation = async (type: string, message: string) => {
    setViolations(prev => prev + 1);
    await logEvent(type, message);
    toast.error(`🚨 ${message}`, { duration: 4000 });
  };

  const logEvent = async (eventType: string, description: string) => {
    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          candidateEmail,
          eventType,
          description,
          metadata: JSON.stringify({ timestamp: Date.now() })
        })
      });
    } catch (error) {
      console.error('Failed to log voice event:', error);
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

  const getStatusColor = () => {
    switch (status) {
      case 'calibrating': return 'bg-yellow-500';
      case 'monitoring': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'initializing': return 'Starting...';
      case 'calibrating': return `Calibrating... ${Math.round(calibrationProgress)}%`;
      case 'monitoring': return 'Monitoring Active';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-800">🤖 AI Voice Monitor</span>
        <div className="flex items-center gap-2">
          {status === 'monitoring' && (
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} 
                 title={isListening ? 'Listening to sounds' : 'No sound detected'} />
          )}
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-gray-700">
          Status: <span className="font-medium">{getStatusText()}</span>
        </div>
        
        {status === 'calibrating' && (
          <>
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2">
              <div className="text-yellow-800 text-xs font-medium">
                🎤 Please read aloud: "Hello, my name is [Your Name] and I am ready for this interview"
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calibrationProgress}%` }}
              />
            </div>
          </>
        )}
        
        {status === 'monitoring' && (
          <>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Sound Level:</span>
              <span className={`font-mono ${soundLevel > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                {Math.round(soundLevel)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-200 ${
                  soundLevel > 80 ? 'bg-red-500' : soundLevel > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(soundLevel * 1.5, 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className={`flex items-center gap-1 ${
                isListening ? 'text-green-600' : 'text-gray-500'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                {isListening ? 'Monitoring' : 'Silent'}
              </div>
              
              {violations > 0 && (
                <div className="text-red-600 font-medium">
                  ⚠️ {violations} violations
                </div>
              )}
            </div>
          </>
        )}
        
        {violations > 0 && status === 'monitoring' && (
          <div className="bg-red-100 border border-red-300 rounded p-2">
            <div className="text-red-800 text-xs font-medium">
              🚨 Unauthorized voices detected during interview
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 border-t pt-1">
          {status === 'calibrating' && 'Speak the sentence above to calibrate'}
          {status === 'monitoring' && '🔊 Monitoring surrounding sounds for security'}
          {status === 'error' && 'Voice monitoring unavailable'}
        </div>
      </div>
    </div>
  );
};

export default AIVoiceMonitor;