import React, { useEffect, useRef, useState } from 'react';

interface MicrophoneMonitorProps {
  sessionId: string;
  onMicReady?: (ready: boolean) => void;
  onAudioViolation?: (type: string, message: string) => void;
  threshold?: number; // Configurable threshold (0-100)
}

const MicrophoneMonitor: React.FC<MicrophoneMonitorProps> = ({
  sessionId,
  onMicReady,
  onAudioViolation,
  threshold = 50 // Default threshold
}) => {
  const [micPermission, setMicPermission] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isBreaching, setIsBreaching] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastViolationRef = useRef<number>(0);

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

  const startAudioMonitoring = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    microphone.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    monitorAudioLevel();
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkAudio = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      setAudioLevel(average);
      
      // Check if breaching threshold
      const isBreach = average > threshold;
      setIsBreaching(isBreach);
      
      // Only log violation if breaching and enough time has passed (prevent spam)
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
  };

  return (
    <div className="bg-gray-100 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">🎤 Microphone</span>
        <div className={`w-3 h-3 rounded-full ${micPermission ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      {micPermission && (
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
          
          {/* Audio Level Bar with Threshold Indicator */}
          <div className="relative w-full bg-gray-300 rounded-full h-3">
            {/* Current Audio Level */}
            <div 
              className={`h-3 rounded-full transition-all duration-100 ${
                isBreaching ? 'bg-red-500' : audioLevel > threshold * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            />
            
            {/* Threshold Line */}
            <div 
              className="absolute top-0 w-0.5 h-3 bg-red-600 opacity-70"
              style={{ left: `${Math.min(threshold * 2, 100)}%` }}
              title={`Threshold: ${threshold}`}
            />
          </div>
          
          {/* Status Indicators */}
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
      
      {/* Threshold Info */}
      {micPermission && (
        <div className="text-xs text-gray-500 mt-1 border-t pt-1">
          Threshold: {threshold} | Violations logged every 2s
        </div>
      )}
    </div>
  );
};

export default MicrophoneMonitor;