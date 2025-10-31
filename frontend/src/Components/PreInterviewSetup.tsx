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
  const [step, setStep] = useState<'permissions' | 'voice-capture' | 'complete'>('permissions');
  const [cameraReady, setCameraReady] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requestPermissions = async () => {
    try {
      // Request both camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Setup video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }

      // Setup audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setVoiceReady(true);
      setStep('voice-capture');

      toast.success('✅ Camera and microphone access granted!');
    } catch (error) {
      console.error('Permission denied:', error);
      toast.error('Please allow camera and microphone access to continue');
    }
  };

  const captureVoiceProfile = async () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    toast('🎤 Please say: "I am ready to start my interview and I will complete it honestly"', {
      duration: 8000,
      icon: '🗣️'
    });

    // Wait 3 seconds for user to prepare
    setTimeout(() => {
      const samples: number[][] = [];
      let sampleCount = 0;
      const maxSamples = 25; // 5 seconds of capture

      const collectSample = () => {
        if (sampleCount < maxSamples) {
          const voiceData = extractVoiceFeatures();
          if (voiceData.length > 0) {
            samples.push(voiceData);
          }
          sampleCount++;
          setCalibrationProgress((sampleCount / maxSamples) * 100);
          setTimeout(collectSample, 200);
        } else {
          if (samples.length > 10) {
            const voiceProfile = createVoiceProfile(samples);

            // Log voice calibration to backend
            logEventToBackend('VOICE_CALIBRATION_COMPLETE', 'Candidate voice profile captured');

            setStep('complete');
            toast.success('✅ Voice captured successfully! Starting interview...');

            setTimeout(() => {
              onSetupComplete(voiceProfile);
            }, 2000);
          } else {
            toast.error('Voice capture failed. Please try again.');
            setCalibrationProgress(0);
          }
        }
      };

      collectSample();
    }, 3000);
  };

  const extractVoiceFeatures = (): number[] => {
    if (!analyserRef.current) return [];

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
    if (totalEnergy < 200) return [];

    // Extract MFCC features
    const mfcc = extractMFCC(dataArray);
    const pitch = extractPitch(dataArray);
    const energyDistribution = extractEnergyDistribution(dataArray);

    return [...mfcc, pitch, ...energyDistribution];
  };

  const extractMFCC = (dataArray: Uint8Array): number[] => {
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
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

  const createVoiceProfile = (samples: number[][]) => {
    const featureCount = samples[0].length;
    const mean = new Array(featureCount).fill(0);
    const variance = new Array(featureCount).fill(0);

    // Calculate mean
    for (let i = 0; i < featureCount; i++) {
      mean[i] = samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length;
    }

    // Calculate variance
    for (let i = 0; i < featureCount; i++) {
      const squaredDiffs = samples.map(sample => Math.pow(sample[i] - mean[i], 2));
      variance[i] = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / samples.length;
    }

    return { mean, variance, samples };
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
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
                We need access to your camera and microphone for proctoring and voice verification during the interview.
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

        {step === 'voice-capture' && (
          <div className="text-center">
            <div className="mb-6">
              {/* Camera Preview */}
              <div className="mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-64 h-48 bg-gray-200 rounded-lg mx-auto"
                />
              </div>

              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-4">Voice Calibration</h2>
              <p className="text-gray-600 mb-6">
                We'll now capture your voice profile for security monitoring during the interview.
              </p>

              {calibrationProgress > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${calibrationProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Capturing voice... {Math.round(calibrationProgress)}%</p>
                </div>
              )}
            </div>

            <button
              onClick={captureVoiceProfile}
              disabled={calibrationProgress > 0}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
            >
              {calibrationProgress > 0 ? 'Capturing Voice...' : 'Start Voice Capture'}
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
              Your voice profile has been captured. The interview will start shortly.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreInterviewSetup;