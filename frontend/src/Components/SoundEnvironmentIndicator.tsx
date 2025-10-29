import React, { useEffect, useRef, useState } from 'react';

interface SoundEnvironmentIndicatorProps {
  sessionId: string;
}

const SoundEnvironmentIndicator: React.FC<SoundEnvironmentIndicatorProps> = ({ sessionId }) => {
  const [environmentStatus, setEnvironmentStatus] = useState<'quiet' | 'normal' | 'noisy' | 'very_noisy'>('quiet');
  const [soundLevel, setSoundLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeEnvironmentMonitoring();
    return () => cleanup();
  }, []);

  const initializeEnvironmentMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsActive(true);
      
      startEnvironmentMonitoring();
    } catch (error) {
      console.error('Environment monitoring failed:', error);
    }
  };

  const startEnvironmentMonitoring = () => {
    const monitor = () => {
      if (!analyserRef.current || !isActive) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const avgLevel = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setSoundLevel(avgLevel);
      
      // Categorize environment
      if (avgLevel < 15) {
        setEnvironmentStatus('quiet');
      } else if (avgLevel < 35) {
        setEnvironmentStatus('normal');
      } else if (avgLevel < 60) {
        setEnvironmentStatus('noisy');
      } else {
        setEnvironmentStatus('very_noisy');
      }
      
      requestAnimationFrame(monitor);
    };
    
    monitor();
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsActive(false);
  };

  const getStatusInfo = () => {
    switch (environmentStatus) {
      case 'quiet':
        return { icon: '🔇', text: 'Quiet Environment', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'normal':
        return { icon: '🔉', text: 'Normal Environment', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'noisy':
        return { icon: '🔊', text: 'Noisy Environment', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
      case 'very_noisy':
        return { icon: '📢', text: 'Very Noisy Environment', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`p-3 rounded-lg border ${statusInfo.bg} ${statusInfo.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">🌍 Environment Monitor</span>
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      {isActive && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 ${statusInfo.color}`}>
            <span className="text-lg">{statusInfo.icon}</span>
            <span className="text-xs font-medium">{statusInfo.text}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                environmentStatus === 'very_noisy' ? 'bg-red-500' :
                environmentStatus === 'noisy' ? 'bg-yellow-500' :
                environmentStatus === 'normal' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(soundLevel * 2, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Level: {Math.round(soundLevel)}</span>
            <span className={statusInfo.color}>
              {environmentStatus === 'very_noisy' && '⚠️ Too Noisy'}
              {environmentStatus === 'noisy' && '⚡ Moderate'}
              {environmentStatus === 'normal' && '✅ Good'}
              {environmentStatus === 'quiet' && '🎯 Excellent'}
            </span>
          </div>
          
          <div className="text-xs text-gray-500 border-t pt-1">
            Monitoring surrounding sound environment
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundEnvironmentIndicator;