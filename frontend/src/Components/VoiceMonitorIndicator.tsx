import React, { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface VoiceProfile {
  mean: number[];
  variance: number[];
  mfccTemplate: number[][];
}

interface VoiceMonitorIndicatorProps {
  sessionId: string;
  candidateEmail: string;
  onViolation?: (type: string, message: string) => void;
}

const VoiceMonitorIndicator: React.FC<VoiceMonitorIndicatorProps> = ({
  sessionId,
  candidateEmail,
  onViolation
}) => {
  const [status, setStatus] = useState<'initializing' | 'capturing' | 'monitoring' | 'error'>('initializing');
  const [violations, setViolations] = useState(0);
  const [adaptiveThreshold, setAdaptiveThreshold] = useState(0.4);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateVoiceRef = useRef<VoiceProfile | null>(null);
  const baselineSamplesRef = useRef<number[]>([]);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const livenessCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phrases for liveness detection
  const livenessPhrases = [
    "The quick brown fox jumps over the lazy dog",
    "Peter Piper picked a peck of pickled peppers",
    "How much wood would a woodchuck chuck",
    "Sally sells seashells by the seashore",
    "Red lorry, yellow lorry"
  ];

  useEffect(() => {
    initializeVoiceCapture();
    return () => cleanup();
  }, []);

  const initializeVoiceCapture = async () => {
    try {
      setStatus('initializing');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Set up audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start voice capture process
      startVoiceCapture();

    } catch (error) {
      console.error('Voice capture initialization failed:', error);
      setStatus('error');
      toast.error('Failed to access microphone. Please check your permissions.');
    }
  };

  const startVoiceCapture = async () => {
    setStatus('capturing');

    // Show instruction and capture voice
    toast('🎤 Please say: "Hello, I am ready for this interview"', {
      duration: 5000,
      icon: '🗣️'
    });

    // Wait a moment for the user to prepare
    setTimeout(() => {
      captureCandidateVoice();
    }, 2000);
  };

  const captureCandidateVoice = (retryCount = 0) => {
    if (retryCount >= 3) {
      setStatus('error');
      toast.error('Failed to capture voice after multiple attempts. Please check your microphone.');
      return;
    }

    const samples: number[][] = [];
    let sampleCount = 0;
    let hasVoice = false;
    const maxSamples = 20; // Capture for 4 seconds

    setCalibrationProgress(0);

    const collectSample = () => {
      if (sampleCount < maxSamples) {
        const voiceData = extractVoiceFeatures();
        if (voiceData.length > 0) {
          samples.push(voiceData);
          hasVoice = true;
        }
        sampleCount++;
        setCalibrationProgress((sampleCount / maxSamples) * 100);
        setTimeout(collectSample, 200);
      } else {
        if (hasVoice && samples.length > 5) {
          // Create voice profile
          const profile = createVoiceProfile(samples);
          candidateVoiceRef.current = profile;

          setStatus('monitoring');
          toast.success('✅ Voice captured! Monitoring started.');
          startMonitoring();
          scheduleLivenessCheck();
        } else {
          // Retry with a different message
          retryCount++;
          toast.error(`Voice capture failed. Retrying... (${retryCount}/3)`);
          setTimeout(() => {
            toast(`🎤 Please speak clearly: "My voice is being calibrated"`, {
              duration: 4000,
              icon: '🗣️'
            });
            setTimeout(() => captureCandidateVoice(retryCount), 2000);
          }, 1000);
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
    if (totalEnergy < 500) return []; // Adjusted threshold

    // Extract MFCCs (simplified version)
    const mfcc = extractMFCC(dataArray);

    // Extract pitch
    const pitch = extractPitch(dataArray);

    // Extract energy distribution
    const energyDistribution = extractEnergyDistribution(dataArray);

    // Extract spectral features
    const spectralFeatures = extractSpectralFeatures(dataArray);

    return [...mfcc, pitch, ...energyDistribution, ...spectralFeatures];
  };

  const extractMFCC = (dataArray: Uint8Array): number[] => {
    // Simplified MFCC extraction
    // In a real implementation, you would use a proper MFCC algorithm
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const numCoefficients = 13;
    const mfcc: number[] = [];

    // Create mel filterbank (simplified)
    const melFilters = createMelFilterbank(dataArray.length, numCoefficients, sampleRate);

    // Apply filters and compute log energy
    for (let i = 0; i < numCoefficients; i++) {
      let energy = 0;
      for (let j = 0; j < dataArray.length; j++) {
        energy += dataArray[j] * melFilters[i][j];
      }
      mfcc.push(Math.log(Math.max(energy, 1)));
    }

    // Apply DCT (simplified)
    const dctCoefficients: number[] = [];
    for (let i = 0; i < numCoefficients; i++) {
      let sum = 0;
      for (let j = 0; j < numCoefficients; j++) {
        sum += mfcc[j] * Math.cos((Math.PI * i * (j + 0.5)) / numCoefficients);
      }
      dctCoefficients.push(sum);
    }

    return dctCoefficients;
  };

  const createMelFilterbank = (fftSize: number, numFilters: number, sampleRate: number): number[][] => {
    const filters: number[][] = [];
    const nyquist = sampleRate / 2;
    const melLow = hzToMel(0);
    const melHigh = hzToMel(nyquist);
    const melPoints = Array.from({ length: numFilters + 2 }, (_, i) =>
      melToHz(melLow + (melHigh - melLow) * i / (numFilters + 1))
    );

    const binPoints = melPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate));

    for (let i = 1; i <= numFilters; i++) {
      const filter = new Array(fftSize).fill(0);
      const left = binPoints[i - 1];
      const center = binPoints[i];
      const right = binPoints[i + 1];

      for (let j = left; j <= center; j++) {
        filter[j] = (j - left) / (center - left);
      }
      for (let j = center; j <= right; j++) {
        filter[j] = (right - j) / (right - center);
      }

      filters.push(filter);
    }

    return filters;
  };

  const hzToMel = (hz: number): number => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1);

  const extractPitch = (dataArray: Uint8Array): number => {
    // Simplified pitch detection using autocorrelation
    let maxVal = 0;
    let pitch = 0;

    // Focus on the fundamental frequency range (50-500 Hz)
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
    const lowEnergy = dataArray.slice(0, Math.floor(totalBins * 0.2)).reduce((a, b) => a + b, 0);
    const midEnergy = dataArray.slice(Math.floor(totalBins * 0.2), Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);
    const highEnergy = dataArray.slice(Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);

    const total = lowEnergy + midEnergy + highEnergy;
    if (total === 0) return [0, 0, 0];

    return [lowEnergy / total, midEnergy / total, highEnergy / total];
  };

  const extractSpectralFeatures = (dataArray: Uint8Array): number[] => {
    // Calculate spectral centroid, rolloff, and flux
    let weightedSum = 0;
    let magnitudeSum = 0;
    let cumulativeEnergy = 0;
    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);

    for (let i = 0; i < dataArray.length; i++) {
      weightedSum += i * dataArray[i];
      magnitudeSum += dataArray[i];
      cumulativeEnergy += dataArray[i];
    }

    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Spectral rolloff (frequency below which 85% of energy is contained)
    let rolloff = 0;
    let energy = 0;
    for (let i = 0; i < dataArray.length; i++) {
      energy += dataArray[i];
      if (energy >= 0.85 * totalEnergy) {
        rolloff = i;
        break;
      }
    }

    return [spectralCentroid, rolloff];
  };

  const createVoiceProfile = (samples: number[][]): VoiceProfile => {
    if (samples.length === 0) return { mean: [], variance: [], mfccTemplate: [] };

    const featureCount = samples[0].length;
    const mean = new Array(featureCount).fill(0);
    const variance = new Array(featureCount).fill(0);

    // Calculate mean for each feature
    for (let i = 0; i < featureCount; i++) {
      mean[i] = samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length;
    }

    // Calculate variance for each feature
    for (let i = 0; i < featureCount; i++) {
      const squaredDiffs = samples.map(sample => Math.pow(sample[i] - mean[i], 2));
      variance[i] = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / samples.length;
    }

    // Store MFCC templates for more accurate comparison
    const mfccTemplate = samples.map(sample => sample.slice(0, 13)); // Assuming first 13 are MFCCs

    return { mean, variance, mfccTemplate };
  };

  const startMonitoring = () => {
    let baselineSampleCount = 0;
    const maxBaselineSamples = 10;

    const monitor = () => {
      if (status !== 'monitoring') return;

      const currentVoice = extractVoiceFeatures();
      if (currentVoice.length > 0) {
        const similarity = calculateSimilarity(candidateVoiceRef.current!, currentVoice);

        // Collect baseline samples during the first few monitoring cycles
        if (baselineSampleCount < maxBaselineSamples) {
          baselineSamplesRef.current.push(similarity);
          baselineSampleCount++;
        } else if (baselineSampleCount === maxBaselineSamples) {
          // Calculate adaptive threshold based on baseline
          const baselineMean = baselineSamplesRef.current.reduce((a, b) => a + b, 0) / maxBaselineSamples;
          const baselineStdDev = Math.sqrt(
            baselineSamplesRef.current.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / maxBaselineSamples
          );

          // Set adaptive threshold (mean - 2 standard deviations, minimum 0.3)
          const newThreshold = Math.max(0.3, baselineMean - 2 * baselineStdDev);
          setAdaptiveThreshold(newThreshold);
          console.log(`Adaptive threshold set to: ${newThreshold.toFixed(3)}`);
          baselineSampleCount++;
        } else {
          // Use adaptive threshold for comparison
          if (similarity < adaptiveThreshold) {
            handleViolation('Different voice detected during interview');
          }
        }
      }

      monitoringIntervalRef.current = setTimeout(monitor, 1500);
    };

    monitor();
  };

  const calculateSimilarity = (profile: VoiceProfile, currentVoice: number[]): number => {
    if (profile.mean.length === 0 || currentVoice.length === 0) return 1;

    // Calculate Mahalanobis distance
    let distance = 0;
    const minLength = Math.min(profile.mean.length, currentVoice.length);

    for (let i = 0; i < minLength; i++) {
      const diff = currentVoice[i] - profile.mean[i];
      // Avoid division by zero
      const variance = profile.variance[i] > 0.001 ? profile.variance[i] : 0.001;
      distance += (diff * diff) / variance;
    }

    // Convert distance to similarity (higher is more similar)
    // Using exponential decay: similarity = e^(-distance)
    return Math.exp(-distance / minLength);
  };

  const scheduleLivenessCheck = () => {
    // Schedule first liveness check after 5 minutes
    livenessCheckIntervalRef.current = setTimeout(() => {
      performLivenessCheck();
      // Then schedule every 5 minutes
      livenessCheckIntervalRef.current = setInterval(performLivenessCheck, 5 * 60 * 1000);
    }, 5 * 60 * 1000);
  };

  const performLivenessCheck = useCallback(async () => {
    if (status !== 'monitoring') return;

    // Generate a random phrase for the user to repeat
    const randomPhrase = livenessPhrases[Math.floor(Math.random() * livenessPhrases.length)];

    // Show the phrase to the user
    toast(`🎤 Please say: "${randomPhrase}"`, {
      duration: 8000,
      icon: '🔐'
    });

    // Wait for the user to say it and verify
    setTimeout(() => {
      const currentVoice = extractVoiceFeatures();
      if (currentVoice.length > 0) {
        const similarity = calculateSimilarity(candidateVoiceRef.current!, currentVoice);

        if (similarity < 0.5) {
          handleViolation('Voice verification failed during liveness check');
        } else {
          toast.success('✅ Voice verification successful');
        }
      } else {
        handleViolation('No voice detected during liveness check');
      }
    }, 6000);
  }, [status]);

  const handleViolation = async (message: string) => {
    setViolations(prev => prev + 1);

    // Call parent callback if provided
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
          candidateEmail,
          eventType: 'UNKNOWN_VOICE_DETECTED',
          description: message,
          metadata: JSON.stringify({
            timestamp: Date.now(),
            violations: violations + 1,
            adaptiveThreshold
          })
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
    if (monitoringIntervalRef.current) {
      clearTimeout(monitoringIntervalRef.current);
    }
    if (livenessCheckIntervalRef.current) {
      clearTimeout(livenessCheckIntervalRef.current);
      clearInterval(livenessCheckIntervalRef.current);
    }
  };

  return (
    <div className="bg-gray-100 p-3 rounded-lg shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${
          status === 'initializing' ? 'bg-blue-500 animate-pulse' :
          status === 'capturing' ? 'bg-yellow-500 animate-pulse' :
          status === 'monitoring' ? 'bg-green-500' :
          'bg-red-500'
        }`} />
        <span className="text-sm text-gray-700 font-medium">
          {status === 'initializing' ? 'Initializing Voice...' :
           status === 'capturing' ? 'Capturing Voice...' :
           status === 'monitoring' ? 'Voice Monitoring Active' :
           'Voice Error'}
        </span>
      </div>

      {status === 'capturing' && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calibrationProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">Calibrating voice profile...</p>
        </div>
      )}

      {status === 'monitoring' && (
        <div className="text-xs text-gray-600">
          <p>Adaptive Threshold: {adaptiveThreshold.toFixed(3)}</p>
        </div>
      )}

      {violations > 0 && (
        <div className="text-xs text-red-600 mt-2 font-medium">
          ⚠️ Violations: {violations}
        </div>
      )}

      {status === 'error' && (
        <button
          onClick={initializeVoiceCapture}
          className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          Retry Voice Setup
        </button>
      )}
    </div>
  );
};

export default VoiceMonitorIndicator;