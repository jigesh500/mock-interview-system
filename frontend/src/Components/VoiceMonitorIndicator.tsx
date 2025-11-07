// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import toast from 'react-hot-toast';
//
// interface VoiceProfile {
//   mean: number[];
//   variance: number[];
//   mfccTemplate: number[][];
// }
//
// interface VoiceMonitorIndicatorProps {
//   sessionId: string;
//   candidateEmail: string;
//   onViolation?: (type: string, message: string) => void;
// }
//
// const VoiceMonitorIndicator: React.FC<VoiceMonitorIndicatorProps> = ({
//   sessionId,
//   candidateEmail,
//   onViolation
// }) => {
//   const [status, setStatus] = useState<'initializing' | 'capturing' | 'monitoring' | 'error'>('initializing');
//   const [violations, setViolations] = useState(0);
//   const [adaptiveThreshold, setAdaptiveThreshold] = useState(0.4);
//   const [calibrationProgress, setCalibrationProgress] = useState(0);
//
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const analyserRef = useRef<AnalyserNode | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const candidateVoiceRef = useRef<VoiceProfile | null>(null);
//   const baselineSamplesRef = useRef<number[]>([]);
//   const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const livenessCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
//
//   // Phrases for liveness detection
//   const livenessPhrases = [
//     "The quick brown fox jumps over the lazy dog",
//     "Peter Piper picked a peck of pickled peppers",
//     "How much wood would a woodchuck chuck",
//     "Sally sells seashells by the seashore",
//     "Red lorry, yellow lorry"
//   ];
//
//   useEffect(() => {
//     testBackendConnection();
//     initializeVoiceCapture();
//     return () => cleanup();
//   }, []);
//
//   const testBackendConnection = async () => {
//     try {
//       const response = await fetch('http://localhost:8081/api/voice/test', {
//         method: 'GET',
//         credentials: 'include'
//       });
//       const result = await response.json();
//       console.log('Backend connection test:', result);
//     } catch (error) {
//       console.error('Backend connection failed:', error);
//       toast.error('⚠️ Voice API connection failed');
//     }
//   };
//
//   const initializeVoiceCapture = async () => {
//     try {
//       setStatus('initializing');
//
//       // Request microphone access - optimized for multiple voice detection
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: false,  // Disabled for multiple voice detection
//           noiseSuppression: false,  // Disabled for multiple voice detection
//           autoGainControl: false,   // Disabled for multiple voice detection
//           channelCount: 2,
//           sampleRate: 44100
//         }
//       });
//       streamRef.current = stream;
//
//       // Set up audio context and analyser
//       const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
//       const analyser = audioContext.createAnalyser();
//       const source = audioContext.createMediaStreamSource(stream);
//
//       analyser.fftSize = 4096;              // Increased for better detection
//       analyser.smoothingTimeConstant = 0.3; // Reduced for responsiveness
//       source.connect(analyser);
//
//       audioContextRef.current = audioContext;
//       analyserRef.current = analyser;
//
//       // Start voice capture process
//       startVoiceCapture();
//
//     } catch (error) {
//       console.error('Voice capture initialization failed:', error);
//       setStatus('error');
//       toast.error('Failed to access microphone. Please check your permissions.');
//     }
//   };
//
//   const startVoiceCapture = async () => {
//     setStatus('capturing');
//
//     // Show instruction and capture voice
//     toast('🎤 Please say: "Hello, I am ready for this interview"', {
//       duration: 5000,
//       icon: '🗣️'
//     });
//
//     // Wait a moment for the user to prepare
//     setTimeout(() => {
//       captureCandidateVoice();
//     }, 2000);
//   };
//
//   const captureCandidateVoice = (retryCount = 0) => {
//     if (retryCount >= 3) {
//       setStatus('error');
//       toast.error('Failed to capture voice after multiple attempts. Please check your microphone.');
//       return;
//     }
//
//     const samples: number[][] = [];
//     let sampleCount = 0;
//     let hasVoice = false;
//     const maxSamples = 20; // Capture for 4 seconds
//
//     setCalibrationProgress(0);
//
//     const collectSample = () => {
//       if (sampleCount < maxSamples) {
//         const voiceData = extractVoiceFeatures();
//         if (voiceData.length > 0) {
//           samples.push(voiceData);
//           hasVoice = true;
//         }
//         sampleCount++;
//         setCalibrationProgress((sampleCount / maxSamples) * 100);
//         setTimeout(collectSample, 200);
//       } else {
//         if (hasVoice && samples.length > 5) {
//           // Create voice profile
//           const profile = createVoiceProfile(samples);
//           candidateVoiceRef.current = profile;
//
//           setStatus('monitoring');
//           toast.success('✅ Voice captured! Monitoring started.');
//           startMonitoring();
//           scheduleLivenessCheck();
//         } else {
//           // Retry with a different message
//           retryCount++;
//           toast.error(`Voice capture failed. Retrying... (${retryCount}/3)`);
//           setTimeout(() => {
//             toast(`🎤 Please speak clearly: "My voice is being calibrated"`, {
//               duration: 4000,
//               icon: '🗣️'
//             });
//             setTimeout(() => captureCandidateVoice(retryCount), 2000);
//           }, 1000);
//         }
//       }
//     };
//
//     collectSample();
//   };
//
//   const extractVoiceFeatures = (): number[] => {
//     if (!analyserRef.current) return [];
//
//     const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
//     analyserRef.current.getByteFrequencyData(dataArray);
//
//     const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
//     if (totalEnergy < 500) return []; // Adjusted threshold
//
//     // Extract MFCCs (simplified version)
//     const mfcc = extractMFCC(dataArray);
//
//     // Extract pitch
//     const pitch = extractPitch(dataArray);
//
//     // Extract energy distribution
//     const energyDistribution = extractEnergyDistribution(dataArray);
//
//     // Extract spectral features
//     const spectralFeatures = extractSpectralFeatures(dataArray);
//
//     return [...mfcc, pitch, ...energyDistribution, ...spectralFeatures];
//   };
//
//   const extractMFCC = (dataArray: Uint8Array): number[] => {
//     // Simplified MFCC extraction
//     // In a real implementation, you would use a proper MFCC algorithm
//     const sampleRate = audioContextRef.current?.sampleRate || 44100;
//     const numCoefficients = 13;
//     const mfcc: number[] = [];
//
//     // Create mel filterbank (simplified)
//     const melFilters = createMelFilterbank(dataArray.length, numCoefficients, sampleRate);
//
//     // Apply filters and compute log energy
//     for (let i = 0; i < numCoefficients; i++) {
//       let energy = 0;
//       for (let j = 0; j < dataArray.length; j++) {
//         energy += dataArray[j] * melFilters[i][j];
//       }
//       mfcc.push(Math.log(Math.max(energy, 1)));
//     }
//
//     // Apply DCT (simplified)
//     const dctCoefficients: number[] = [];
//     for (let i = 0; i < numCoefficients; i++) {
//       let sum = 0;
//       for (let j = 0; j < numCoefficients; j++) {
//         sum += mfcc[j] * Math.cos((Math.PI * i * (j + 0.5)) / numCoefficients);
//       }
//       dctCoefficients.push(sum);
//     }
//
//     return dctCoefficients;
//   };
//
//   const createMelFilterbank = (fftSize: number, numFilters: number, sampleRate: number): number[][] => {
//     const filters: number[][] = [];
//     const nyquist = sampleRate / 2;
//     const melLow = hzToMel(0);
//     const melHigh = hzToMel(nyquist);
//     const melPoints = Array.from({ length: numFilters + 2 }, (_, i) =>
//       melToHz(melLow + (melHigh - melLow) * i / (numFilters + 1))
//     );
//
//     const binPoints = melPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate));
//
//     for (let i = 1; i <= numFilters; i++) {
//       const filter = new Array(fftSize).fill(0);
//       const left = binPoints[i - 1];
//       const center = binPoints[i];
//       const right = binPoints[i + 1];
//
//       for (let j = left; j <= center; j++) {
//         filter[j] = (j - left) / (center - left);
//       }
//       for (let j = center; j <= right; j++) {
//         filter[j] = (right - j) / (right - center);
//       }
//
//       filters.push(filter);
//     }
//
//     return filters;
//   };
//
//   const hzToMel = (hz: number): number => 2595 * Math.log10(1 + hz / 700);
//   const melToHz = (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1);
//
//   const extractPitch = (dataArray: Uint8Array): number => {
//     // Simplified pitch detection using autocorrelation
//     let maxVal = 0;
//     let pitch = 0;
//
//     // Focus on the fundamental frequency range (50-500 Hz)
//     const minBin = Math.floor(50 * dataArray.length / (audioContextRef.current?.sampleRate || 44100));
//     const maxBin = Math.floor(500 * dataArray.length / (audioContextRef.current?.sampleRate || 44100));
//
//     for (let i = minBin; i < maxBin; i++) {
//       if (dataArray[i] > maxVal) {
//         maxVal = dataArray[i];
//         pitch = i;
//       }
//     }
//
//     return pitch;
//   };
//
//   const extractEnergyDistribution = (dataArray: Uint8Array): number[] => {
//     const totalBins = dataArray.length;
//     const lowEnergy = dataArray.slice(0, Math.floor(totalBins * 0.2)).reduce((a, b) => a + b, 0);
//     const midEnergy = dataArray.slice(Math.floor(totalBins * 0.2), Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);
//     const highEnergy = dataArray.slice(Math.floor(totalBins * 0.7)).reduce((a, b) => a + b, 0);
//
//     const total = lowEnergy + midEnergy + highEnergy;
//     if (total === 0) return [0, 0, 0];
//     return [lowEnergy / total, midEnergy / total, highEnergy / total];
//   };
//
//   const extractSpectralFeatures = (dataArray: Uint8Array): number[] => {
//     const spectralCentroid = calculateSpectralCentroid(dataArray);
//     const spectralRolloff = calculateSpectralRolloff(dataArray);
//     const zeroCrossingRate = calculateZeroCrossingRate(dataArray);
//     return [spectralCentroid, spectralRolloff, zeroCrossingRate];
//   };
//
//   const calculateSpectralCentroid = (dataArray: Uint8Array): number => {
//     let weightedSum = 0;
//     let magnitudeSum = 0;
//     for (let i = 0; i < dataArray.length; i++) {
//       const freq = (i / dataArray.length) * (audioContextRef.current?.sampleRate || 44100) / 2;
//       weightedSum += freq * dataArray[i];
//       magnitudeSum += dataArray[i];
//     }
//     return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
//   };
//
//   const calculateSpectralRolloff = (dataArray: Uint8Array): number => {
//     const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
//     const threshold = totalEnergy * 0.85;
//     let cumulativeEnergy = 0;
//     for (let i = 0; i < dataArray.length; i++) {
//       cumulativeEnergy += dataArray[i];
//       if (cumulativeEnergy >= threshold) {
//         return (i / dataArray.length) * (audioContextRef.current?.sampleRate || 44100) / 2;
//       }
//     }
//     return 0;
//   };
//
//   const calculateZeroCrossingRate = (dataArray: Uint8Array): number => {
//     let crossings = 0;
//     for (let i = 1; i < dataArray.length; i++) {
//       if ((dataArray[i] >= 128) !== (dataArray[i - 1] >= 128)) {
//         crossings++;
//       }
//     }
//     return crossings / dataArray.length;
//   };
//
//   const createVoiceProfile = (samples: number[][]): VoiceProfile => {
//     const numFeatures = samples[0].length;
//     const mean = new Array(numFeatures).fill(0);
//     const variance = new Array(numFeatures).fill(0);
//
//     // Calculate mean
//     samples.forEach(sample => {
//       sample.forEach((feature, index) => {
//         mean[index] += feature;
//       });
//     });
//     mean.forEach((_, index) => {
//       mean[index] /= samples.length;
//     });
//
//     // Calculate variance
//     samples.forEach(sample => {
//       sample.forEach((feature, index) => {
//         variance[index] += Math.pow(feature - mean[index], 2);
//       });
//     });
//     variance.forEach((_, index) => {
//       variance[index] /= samples.length;
//     });
//
//     return {
//       mean,
//       variance,
//       mfccTemplate: samples.slice(0, 5) // Store first 5 samples as template
//     };
//   };
//
//   const calculateVoiceSimilarity = (profile: VoiceProfile, currentFeatures: number[]): number => {
//     if (!profile || currentFeatures.length !== profile.mean.length) return 0;
//
//     let similarity = 0;
//     for (let i = 0; i < profile.mean.length; i++) {
//       const diff = Math.abs(currentFeatures[i] - profile.mean[i]);
//       const normalizedDiff = profile.variance[i] > 0 ? diff / Math.sqrt(profile.variance[i]) : diff;
//       similarity += Math.exp(-normalizedDiff);
//     }
//     return similarity / profile.mean.length;
//   };
//
//   // Audio processing for Gemini
//   const createAudioBlob = (audioBuffer: Float32Array): Blob => {
//     const wavBuffer = encodeWAV(audioBuffer, 44100);
//     return new Blob([wavBuffer], { type: 'audio/wav' });
//   };
//
//   const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
//     const buffer = new ArrayBuffer(44 + samples.length * 2);
//     const view = new DataView(buffer);
//
//     const writeString = (offset: number, string: string) => {
//       for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//       }
//     };
//
//     writeString(0, 'RIFF');
//     view.setUint32(4, 36 + samples.length * 2, true);
//     writeString(8, 'WAVE');
//     writeString(12, 'fmt ');
//     view.setUint32(16, 16, true);
//     view.setUint16(20, 1, true);
//     view.setUint16(22, 1, true);
//     view.setUint32(24, sampleRate, true);
//     view.setUint32(28, sampleRate * 2, true);
//     view.setUint16(32, 2, true);
//     view.setUint16(34, 16, true);
//     writeString(36, 'data');
//     view.setUint32(40, samples.length * 2, true);
//
//     let offset = 44;
//     for (let i = 0; i < samples.length; i++) {
//       const sample = Math.max(-1, Math.min(1, samples[i]));
//       view.setInt16(offset, sample * 0x7FFF, true);
//       offset += 2;
//     }
//
//     return buffer;
//   };
//
//   const sendToGeminiForVerification = async (audioBlob: Blob) => {
//     try {
//       console.log('Sending audio to Gemini for analysis...');
//
//       const formData = new FormData();
//       formData.append('audio', audioBlob, 'voice-sample.webm');
//       formData.append('sessionId', sessionId);
//       formData.append('candidateEmail', candidateEmail);
//
//       const response = await fetch('http://localhost:8081/api/voice/verify-unknown', {
//         method: 'POST',
//         body: formData,
//         credentials: 'include'
//       });
//
//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }
//
//       const result = await response.json();
//       console.log('Gemini analysis result:', result);
//
//       if (result.violation) {
//         setViolations(prev => prev + 1);
//         onViolation?.('UNKNOWN_VOICE_DETECTED', result.message);
//         toast.error('🚨 Unknown voice detected!');
//       } else {
//         console.log('Voice verified as candidate');
//       }
//     } catch (error) {
//       console.error('Voice verification failed:', error);
//       // Log as potential violation even if API fails
//       setViolations(prev => prev + 1);
//       onViolation?.('UNKNOWN_VOICE_DETECTED', `Voice analysis failed: ${error}`);
//       toast.error('⚠️ Voice analysis failed - logged as violation');
//     }
//   };
//
//   const detectUnknownVoice = useCallback(async () => {
//     if (!candidateVoiceRef.current || !analyserRef.current || !audioContextRef.current) return;
//
//     const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
//     analyserRef.current.getByteFrequencyData(dataArray);
//
//     const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
//     if (totalEnergy < 1000) return; // Skip if no significant audio
//
//     const currentFeatures = extractVoiceFeatures();
//     if (currentFeatures.length === 0) return;
//
//     const similarity = calculateVoiceSimilarity(candidateVoiceRef.current, currentFeatures);
//     console.log('Voice similarity:', similarity.toFixed(3));
//
//     // If similarity is too low, capture audio and send to Gemini
//     if (similarity < 0.5) {
//       console.log('Low similarity detected, capturing audio for Gemini analysis');
//       captureAudioForAnalysis();
//     }
//   }, [sessionId, candidateEmail, onViolation]);
//
//   const captureAudioForAnalysis = async () => {
//     if (!audioContextRef.current || !streamRef.current) return;
//
//     try {
//       // Use MediaRecorder for simpler audio capture
//       const mediaRecorder = new MediaRecorder(streamRef.current, {
//         mimeType: 'audio/webm;codecs=opus'
//       });
//
//       const audioChunks: Blob[] = [];
//
//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunks.push(event.data);
//         }
//       };
//
//       mediaRecorder.onstop = async () => {
//         const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
//         console.log('Audio captured, size:', audioBlob.size, 'bytes');
//         await sendToGeminiForVerification(audioBlob);
//       };
//
//       // Record for 3 seconds
//       mediaRecorder.start();
//       setTimeout(() => {
//         if (mediaRecorder.state === 'recording') {
//           mediaRecorder.stop();
//         }
//       }, 3000);
//
//     } catch (error) {
//       console.error('Audio capture failed:', error);
//       // Fallback: log violation without Gemini analysis
//       setViolations(prev => prev + 1);
//       onViolation?.('UNKNOWN_VOICE_DETECTED', 'Voice similarity too low - audio capture failed');
//     }
//   };
//
//   const startMonitoring = () => {
//     console.log('Starting voice monitoring...');
//     monitoringIntervalRef.current = setInterval(() => {
//       detectUnknownVoice();
//     }, 5000); // Check every 5 seconds to reduce API calls
//   };
//
//   const scheduleLivenessCheck = () => {
//     const performLivenessCheck = () => {
//       if (status !== 'monitoring') return;
//
//       const randomPhrase = livenessPhrases[Math.floor(Math.random() * livenessPhrases.length)];
//       toast(`🎤 Liveness Check: Please say "${randomPhrase}"`, {
//         duration: 8000,
//         icon: '🔍'
//       });
//     };
//
//     // Schedule random liveness checks
//     const scheduleNext = () => {
//       const delay = Math.random() * 300000 + 180000; // 3-8 minutes
//       livenessCheckIntervalRef.current = setTimeout(() => {
//         performLivenessCheck();
//         scheduleNext();
//       }, delay);
//     };
//
//     scheduleNext();
//   };
//
//   const cleanup = () => {
//     if (monitoringIntervalRef.current) {
//       clearInterval(monitoringIntervalRef.current);
//     }
//     if (livenessCheckIntervalRef.current) {
//       clearTimeout(livenessCheckIntervalRef.current);
//     }
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//     }
//   };
//
//   return (
//     <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
//       <div className="flex items-center justify-between mb-2">
//         <span className="text-sm font-semibold text-blue-800">🎤 Voice Monitor</span>
//         <div className={`w-3 h-3 rounded-full ${
//           status === 'monitoring' ? 'bg-green-500' :
//           status === 'capturing' ? 'bg-yellow-500' :
//           status === 'error' ? 'bg-red-500' : 'bg-gray-500'
//         }`} />
//       </div>
//
//       <div className="space-y-2">
//         <div className="text-xs text-gray-700">
//           Status: <span className="font-medium">
//             {status === 'initializing' && 'Starting...'}
//             {status === 'capturing' && `Calibrating... ${Math.round(calibrationProgress)}%`}
//             {status === 'monitoring' && 'Active'}
//             {status === 'error' && 'Error'}
//           </span>
//         </div>
//
//         {status === 'capturing' && (
//           <div className="w-full bg-gray-200 rounded-full h-2">
//             <div
//               className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${calibrationProgress}%` }}
//             />
//           </div>
//         )}
//
//         {violations > 0 && (
//           <div className="text-xs text-red-600 font-medium">
//             ⚠️ {violations} voice violations detected
//           </div>
//         )}
//
//         <div className="text-xs text-gray-500 border-t pt-1">
//           {status === 'monitoring' && '🔊 AI voice detection active'}
//           {status === 'capturing' && 'Please speak the calibration phrase'}
//           {status === 'error' && 'Voice monitoring unavailable'}
//         </div>
//
//         {status === 'monitoring' && (
//           <button
//             onClick={() => {
//               console.log('Manual test triggered');
//               captureAudioForAnalysis();
//               toast('🧪 Testing voice detection...');
//             }}
//             className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
//           >
//             Test Detection
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };
//
// export default VoiceMonitorIndicator;= 0) return [0, 0, 0];
//
//     return [lowEnergy / total, midEnergy / total, highEnergy / total];
//   };
//
//   const extractSpectralFeatures = (dataArray: Uint8Array): number[] => {
//     // Calculate spectral centroid, rolloff, and flux
//     let weightedSum = 0;
//     let magnitudeSum = 0;
//     let cumulativeEnergy = 0;
//     const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
//
//     for (let i = 0; i < dataArray.length; i++) {
//       weightedSum += i * dataArray[i];
//       magnitudeSum += dataArray[i];
//       cumulativeEnergy += dataArray[i];
//     }
//
//     const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
//
//     // Spectral rolloff (frequency below which 85% of energy is contained)
//     let rolloff = 0;
//     let energy = 0;
//     for (let i = 0; i < dataArray.length; i++) {
//       energy += dataArray[i];
//       if (energy >= 0.85 * totalEnergy) {
//         rolloff = i;
//         break;
//       }
//     }
//
//     return [spectralCentroid, rolloff];
//   };
//
//   // Enhanced multiple voice detection with VAD and spectral analysis
//   const detectMultipleVoices = (dataArray: Uint8Array): { count: number; confidence: number; details: string } => {
//     const sampleRate = audioContextRef.current?.sampleRate || 44100;
//     const binSize = sampleRate / dataArray.length;
//
//     // Voice Activity Detection - check if there's any speech
//     const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
//     const avgEnergy = totalEnergy / dataArray.length;
//
//     if (avgEnergy < 15) {
//       return { count: 0, confidence: 0, details: 'No voice activity detected' };
//     }
//
//     // Analyze different frequency bands for voice characteristics
//     const bands = [
//       { name: 'Low Male', min: 80, max: 180, energy: 0, peaks: 0 },
//       { name: 'High Male', min: 180, max: 250, energy: 0, peaks: 0 },
//       { name: 'Low Female', min: 180, max: 300, energy: 0, peaks: 0 },
//       { name: 'High Female', min: 300, max: 450, energy: 0, peaks: 0 },
//       { name: 'Formants', min: 800, max: 3000, energy: 0, peaks: 0 }
//     ];
//
//     // Calculate energy and peaks for each band
//     bands.forEach(band => {
//       const startBin = Math.floor(band.min / binSize);
//       const endBin = Math.floor(band.max / binSize);
//       const bandData = dataArray.slice(startBin, endBin);
//
//       band.energy = bandData.reduce((sum, val) => sum + val, 0) / bandData.length;
//
//       // Count significant peaks in this band
//       const threshold = band.energy * 0.7;
//       for (let i = 1; i < bandData.length - 1; i++) {
//         if (bandData[i] > threshold &&
//             bandData[i] > bandData[i-1] &&
//             bandData[i] > bandData[i+1]) {
//           band.peaks++;
//         }
//       }
//     });
//
//     // Detect multiple voice sources
//     let voiceCount = 0;
//     let activeRegions: string[] = [];
//
//     // Check for simultaneous activity in different frequency ranges
//     const maleActivity = (bands[0].energy > 25 || bands[1].energy > 25) && (bands[0].peaks > 1 || bands[1].peaks > 1);
//     const femaleActivity = (bands[2].energy > 20 || bands[3].energy > 20) && (bands[2].peaks > 1 || bands[3].peaks > 1);
//     const formantActivity = bands[4].energy > 30 && bands[4].peaks > 3;
//
//     if (maleActivity) {
//       voiceCount++;
//       activeRegions.push('Male voice range');
//     }
//
//     if (femaleActivity && !maleActivity) {
//       voiceCount++;
//       activeRegions.push('Female voice range');
//     }
//
//     // Check for overlapping voices (multiple formant structures)
//     if (formantActivity && bands[4].peaks > 6) {
//       const harmonicComplexity = calculateHarmonicComplexity(dataArray);
//       if (harmonicComplexity > 0.6) {
//         voiceCount = Math.max(voiceCount, 2);
//         activeRegions.push('Complex harmonic structure');
//       }
//     }
//
//     // Calculate confidence based on energy distribution and spectral characteristics
//     let confidence = 0;
//     if (voiceCount > 1) {
//       const energyVariance = calculateEnergyVariance(bands);
//       const spectralSpread = calculateSpectralSpread(dataArray);
//       confidence = Math.min(0.9, (energyVariance + spectralSpread) / 2);
//     }
//
//     const details = activeRegions.length > 0 ? activeRegions.join(', ') : 'Single voice detected';
//
//     return { count: voiceCount, confidence, details };
//   };
//
//   // Calculate harmonic complexity to detect overlapping voices
//   const calculateHarmonicComplexity = (dataArray: Uint8Array): number => {
//     const peaks: number[] = [];
//     const threshold = 30;
//
//     // Find all significant peaks
//     for (let i = 2; i < dataArray.length - 2; i++) {
//       if (dataArray[i] > threshold &&
//           dataArray[i] > dataArray[i-1] && dataArray[i] > dataArray[i+1] &&
//           dataArray[i] > dataArray[i-2] && dataArray[i] > dataArray[i+2]) {
//         peaks.push(i);
//       }
//     }
//
//     if (peaks.length < 4) return 0;
//
//     // Check for multiple harmonic series (indicating multiple voices)
//     let harmonicSeries = 0;
//     for (let i = 0; i < peaks.length - 1; i++) {
//       for (let j = i + 1; j < peaks.length; j++) {
//         const ratio = peaks[j] / peaks[i];
//         if (ratio >= 1.8 && ratio <= 2.2) harmonicSeries++; // Octave relationship
//         if (ratio >= 2.8 && ratio <= 3.2) harmonicSeries++; // Fifth relationship
//       }
//     }
//
//     return Math.min(1, harmonicSeries / peaks.length);
//   };
//
//   // Calculate energy variance across frequency bands
//   const calculateEnergyVariance = (bands: any[]): number => {
//     const energies = bands.map(b => b.energy);
//     const mean = energies.reduce((sum, e) => sum + e, 0) / energies.length;
//     const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
//     return Math.min(1, variance / 100);
//   };
//
//   // Calculate spectral spread
//   const calculateSpectralSpread = (dataArray: Uint8Array): number => {
//     let weightedSum = 0;
//     let totalEnergy = 0;
//
//     for (let i = 0; i < dataArray.length; i++) {
//       weightedSum += i * dataArray[i];
//       totalEnergy += dataArray[i];
//     }
//
//     const centroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
//
//     let spread = 0;
//     for (let i = 0; i < dataArray.length; i++) {
//       spread += Math.pow(i - centroid, 2) * dataArray[i];
//     }
//
//     return totalEnergy > 0 ? Math.min(1, Math.sqrt(spread / totalEnergy) / 100) : 0;
//   };
//
//   // Handle multiple voice violations
//   const handleMultipleVoiceViolation = async (message: string, voiceData: any) => {
//     setViolations(prev => prev + 1);
//     onViolation?.('MULTIPLE_VOICES_DETECTED', message);
//
//     try {
//       await fetch('http://localhost:8081/api/monitoring/log-event', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({
//           sessionId,
//           candidateEmail,
//           eventType: 'MULTIPLE_VOICES_DETECTED',
//           description: message,
//           metadata: JSON.stringify({
//             timestamp: Date.now(),
//             voiceCount: voiceData.count,
//             confidence: voiceData.confidence
//           })
//         })
//       });
//     } catch (error) {
//       console.error('Failed to log multiple voice violation:', error);
//     }
//   };
//
//   const createVoiceProfile = (samples: number[][]): VoiceProfile => {
//     if (samples.length === 0) return { mean: [], variance: [], mfccTemplate: [] };
//
//     const featureCount = samples[0].length;
//     const mean = new Array(featureCount).fill(0);
//     const variance = new Array(featureCount).fill(0);
//
//     // Calculate mean for each feature
//     for (let i = 0; i < featureCount; i++) {
//       mean[i] = samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length;
//     }
//
//     // Calculate variance for each feature
//     for (let i = 0; i < featureCount; i++) {
//       const squaredDiffs = samples.map(sample => Math.pow(sample[i] - mean[i], 2));
//       variance[i] = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / samples.length;
//     }
//
//     // Store MFCC templates for more accurate comparison
//     const mfccTemplate = samples.map(sample => sample.slice(0, 13)); // Assuming first 13 are MFCCs
//
//     return { mean, variance, mfccTemplate };
//   };
//
//   const startMonitoring = () => {
//     let baselineSampleCount = 0;
//     const maxBaselineSamples = 10;
//     let multipleVoiceViolations = 0;
//
//     const monitor = () => {
//       if (status !== 'monitoring') return;
//
//       const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
//       analyserRef.current!.getByteFrequencyData(dataArray);
//
//       // Enhanced multiple voice detection
//       const multiVoiceResult = detectMultipleVoices(dataArray);
//
//       // Log detection details for debugging
//       if (multiVoiceResult.count > 0) {
//         console.log('Voice Detection:', {
//           count: multiVoiceResult.count,
//           confidence: multiVoiceResult.confidence.toFixed(3),
//           details: multiVoiceResult.details
//         });
//       }
//
//       if (multiVoiceResult.count > 1 && multiVoiceResult.confidence > 0.3) {
//         multipleVoiceViolations++;
//
//         const message = `Multiple voices detected: ${multiVoiceResult.count} voices (${multiVoiceResult.details})`;
//
//         if (multipleVoiceViolations <= 3) {
//           toast.error(`⚠️ WARNING: ${message}`);
//         }
//
//         handleMultipleVoiceViolation(message, multiVoiceResult);
//       }
//
//       // Original voice identity check
//       const currentVoice = extractVoiceFeatures();
//       if (currentVoice.length > 0) {
//         const similarity = calculateSimilarity(candidateVoiceRef.current!, currentVoice);
//
//         // Collect baseline samples during the first few monitoring cycles
//         if (baselineSampleCount < maxBaselineSamples) {
//           baselineSamplesRef.current.push(similarity);
//           baselineSampleCount++;
//         } else if (baselineSampleCount === maxBaselineSamples) {
//           // Calculate adaptive threshold based on baseline
//           const baselineMean = baselineSamplesRef.current.reduce((a, b) => a + b, 0) / maxBaselineSamples;
//           const baselineStdDev = Math.sqrt(
//             baselineSamplesRef.current.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / maxBaselineSamples
//           );
//
//           // Set adaptive threshold (mean - 2 standard deviations, minimum 0.3)
//           const newThreshold = Math.max(0.3, baselineMean - 2 * baselineStdDev);
//           setAdaptiveThreshold(newThreshold);
//           console.log(`Adaptive threshold set to: ${newThreshold.toFixed(3)}`);
//           baselineSampleCount++;
//         } else {
//           // Use adaptive threshold for comparison
//           if (similarity < adaptiveThreshold) {
//             handleViolation('Different voice detected during interview');
//           }
//         }
//       }
//
//       monitoringIntervalRef.current = setTimeout(monitor, 1000);
//     };
//
//     monitor();
//   };
//
//   const calculateSimilarity = (profile: VoiceProfile, currentVoice: number[]): number => {
//     if (profile.mean.length === 0 || currentVoice.length === 0) return 1;
//
//     // Calculate Mahalanobis distance
//     let distance = 0;
//     const minLength = Math.min(profile.mean.length, currentVoice.length);
//
//     for (let i = 0; i < minLength; i++) {
//       const diff = currentVoice[i] - profile.mean[i];
//       // Avoid division by zero
//       const variance = profile.variance[i] > 0.001 ? profile.variance[i] : 0.001;
//       distance += (diff * diff) / variance;
//     }
//
//     // Convert distance to similarity (higher is more similar)
//     // Using exponential decay: similarity = e^(-distance)
//     return Math.exp(-distance / minLength);
//   };
//
//   const scheduleLivenessCheck = () => {
//     // Schedule first liveness check after 5 minutes
//     livenessCheckIntervalRef.current = setTimeout(() => {
//       performLivenessCheck();
//       // Then schedule every 5 minutes
//       livenessCheckIntervalRef.current = setInterval(performLivenessCheck, 5 * 60 * 1000);
//     }, 5 * 60 * 1000);
//   };
//
//   const performLivenessCheck = useCallback(async () => {
//     if (status !== 'monitoring') return;
//
//     // Generate a random phrase for the user to repeat
//     const randomPhrase = livenessPhrases[Math.floor(Math.random() * livenessPhrases.length)];
//
//     // Show the phrase to the user
//     toast(`🎤 Please say: "${randomPhrase}"`, {
//       duration: 8000,
//       icon: '🔐'
//     });
//
//     // Wait for the user to say it and verify
//     setTimeout(() => {
//       const currentVoice = extractVoiceFeatures();
//       if (currentVoice.length > 0) {
//         const similarity = calculateSimilarity(candidateVoiceRef.current!, currentVoice);
//
//         if (similarity < 0.5) {
//           handleViolation('Voice verification failed during liveness check');
//         } else {
//           toast.success('✅ Voice verification successful');
//         }
//       } else {
//         handleViolation('No voice detected during liveness check');
//       }
//     }, 6000);
//   }, [status]);
//
//   const handleViolation = async (message: string) => {
//     setViolations(prev => prev + 1);
//
//     // Call parent callback if provided
//     if (onViolation) {
//       onViolation('UNKNOWN_VOICE_DETECTED', message);
//     }
//
//     try {
//       await fetch('http://localhost:8081/api/monitoring/log-event', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({
//           sessionId,
//           candidateEmail,
//           eventType: 'UNKNOWN_VOICE_DETECTED',
//           description: message,
//           metadata: JSON.stringify({
//             timestamp: Date.now(),
//             violations: violations + 1,
//             adaptiveThreshold
//           })
//         })
//       });
//     } catch (error) {
//       console.error('Failed to log violation:', error);
//     }
//   };
//
//   const cleanup = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//     }
//     if (monitoringIntervalRef.current) {
//       clearTimeout(monitoringIntervalRef.current);
//     }
//     if (livenessCheckIntervalRef.current) {
//       clearTimeout(livenessCheckIntervalRef.current);
//       clearInterval(livenessCheckIntervalRef.current);
//     }
//   };
//
//   return (
//     <div className="bg-gray-100 p-3 rounded-lg shadow-sm">
//       <div className="flex items-center justify-center gap-2 mb-2">
//         <div className={`w-3 h-3 rounded-full ${
//           status === 'initializing' ? 'bg-blue-500 animate-pulse' :
//           status === 'capturing' ? 'bg-yellow-500 animate-pulse' :
//           status === 'monitoring' ? 'bg-green-500' :
//           'bg-red-500'
//         }`} />
//         <span className="text-sm text-gray-700 font-medium">
//           {status === 'initializing' ? 'Initializing Voice...' :
//            status === 'capturing' ? 'Capturing Voice...' :
//            status === 'monitoring' ? 'Voice Monitoring Active' :
//            'Voice Error'}
//         </span>
//       </div>
//
//       {status === 'capturing' && (
//         <div className="mb-2">
//           <div className="w-full bg-gray-200 rounded-full h-2">
//             <div
//               className="bg-blue-500 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${calibrationProgress}%` }}
//             />
//           </div>
//           <p className="text-xs text-gray-600 mt-1">Calibrating voice profile...</p>
//         </div>
//       )}
//
//       {status === 'monitoring' && (
//         <div className="text-xs text-gray-600">
//           <p>Adaptive Threshold: {adaptiveThreshold.toFixed(3)}</p>
//           <p>Multiple Voice Detection: Active</p>
//         </div>
//       )}
//
//       {violations > 0 && (
//         <div className="text-xs text-red-600 mt-2 font-medium">
//           ⚠️ Violations: {violations}
//         </div>
//       )}
//
//       {status === 'error' && (
//         <button
//           onClick={initializeVoiceCapture}
//           className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
//         >
//           Retry Voice Setup
//         </button>
//       )}
//     </div>
//   );
// };
//
// export default VoiceMonitorIndicator;