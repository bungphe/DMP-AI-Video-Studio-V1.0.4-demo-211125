
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Square, Download, AlertCircle, Volume2, AudioWaveform, Zap, Music } from 'lucide-react';
import { generateSpeech, generateSoundEffect, bufferToWave } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { AIVoices } from '../types';

const AudioGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'tts' | 'sfx' | 'music'>('tts');
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(AIVoices[1].id); // Default Kore
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (sourceNodeRef.current) sourceNodeRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512; // Higher resolution for visualizer
      analyserRef.current.smoothingTimeConstant = 0.8;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      setIsPlaying(false);
    }

    try {
      const ctx = initAudioContext();
      let buffer: AudioBuffer;
      
      if (mode === 'tts') {
         buffer = await generateSpeech(text, selectedVoice, ctx);
      } else if (mode === 'sfx') {
         buffer = await generateSoundEffect(text, ctx);
      } else {
         // Music Mode: Simulate by generating a "Music prompt" description then using sfx engine as placeholder
         // In a real app, this would call MusicLM
         buffer = await generateSoundEffect(`Music track: ${text}. Lo-fi, instrumental background music.`, ctx);
      }
      
      setAudioBuffer(buffer);
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (msg === "QUOTA_EXCEEDED") msg = t('errors.quota_exceeded');
      else if (msg === "API_KEY_INVALID") msg = t('errors.api_key_invalid');
      else if (msg === "NETWORK_ERROR") msg = t('errors.network_error');
      
      setError(msg || t('common.error_boundary_desc'));
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current || !analyserRef.current) return;

    // Stop if currently playing
    if (isPlaying && sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    };

    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
    visualize();
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Background (Optional subtle grid or line)
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.strokeStyle = '#1f2937'; // gray-800
      ctx.lineWidth = 1;
      ctx.stroke();

      const barWidth = (rect.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Scale height to fit better
        barHeight = (dataArray[i] / 255) * (rect.height * 0.8); 
        
        // Dynamic Gradient Color based on Mode
        let r, g, b;
        if (mode === 'tts') { 
            // Brand Blue/Orange
            r = 50 + (dataArray[i]);
            g = 100;
            b = 255;
        } else if (mode === 'sfx') { 
            // Orange/Red
            r = 255;
            g = 100 + (dataArray[i] / 2);
            b = 50;
        } else { 
            // Purple/Pink for Music
            r = 200 + (dataArray[i] / 2);
            g = 50;
            b = 255;
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Draw mirrored bars (Spectrum Analyzer Style)
        const centerY = rect.height / 2;
        
        // Round caps
        // ctx.roundRect(x, centerY - barHeight / 2, barWidth - 1, barHeight, 5); 
        // ctx.fill();
        
        // Standard Rect
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);

        x += barWidth;
      }
    };
    draw();
  };

  // Download Logic using bufferToWave
  const downloadAudio = () => {
     if(!audioBuffer) return;
     
     try {
       const blob = bufferToWave(audioBuffer, audioBuffer.length);
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `generated_${mode}_${Date.now()}.wav`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
     } catch(e) {
       console.error("Download failed", e);
       setError("Failed to prepare download.");
     }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Volume2 className="mr-3 text-brand-400" /> {t('audio.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('audio.desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
            
            {/* Mode Toggle */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 mb-6">
               <button onClick={() => setMode('tts')} className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${mode === 'tts' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t('audio.tab_tts')}</button>
               <button onClick={() => setMode('sfx')} className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${mode === 'sfx' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t('audio.tab_sfx')}</button>
               <button onClick={() => setMode('music')} className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${mode === 'music' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>AI Music</button>
            </div>

            {mode === 'tts' && (
              <div className="mb-6 animate-fadeIn">
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('audio.voice_label')}</label>
                <div className="grid grid-cols-1 gap-3">
                  {AIVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border transition-all
                        ${selectedVoice === voice.id 
                          ? 'bg-brand-600/20 border-brand-500 text-white' 
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'}
                      `}
                    >
                      <span className="text-sm font-medium">{t(`audio.voices.${voice.id}`) || voice.name}</span>
                      {selectedVoice === voice.id && <div className="w-2 h-2 bg-brand-400 rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {mode === 'tts' ? t('audio.text_label') : mode === 'music' ? 'Music Description' : t('audio.sfx_label')}
              </label>
              <textarea
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
                rows={5}
                placeholder={mode === 'tts' ? t('audio.text_placeholder') : mode === 'music' ? 'E.g. Upbeat cyberpunk synthwave, 120bpm...' : t('audio.sfx_placeholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !text}
              className={`
                mt-6 w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center
                transition-all duration-200
                ${loading || !text 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-70' 
                  : mode === 'tts' 
                     ? 'bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-900/20' 
                     : mode === 'music' ? 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/20' : 'bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-900/20'}
              `}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></div>
                  {t('audio.btn_generating')}
                </>
              ) : (
                <>
                  {mode === 'tts' ? <AudioWaveform size={18} className="mr-2" /> : mode === 'music' ? <Music size={18} className="mr-2"/> : <Zap size={18} className="mr-2" />} 
                  {t('audio.btn_generate')}
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 p-3 rounded text-red-400 text-sm flex items-center">
                <AlertCircle size={16} className="mr-2" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Player & Visualizer */}
        <div className="lg:col-span-7">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden h-full min-h-[400px] flex flex-col relative shadow-lg">
            
            {/* 1. Control Bar (Moved to Top) */}
            <div className="bg-gray-800/50 p-6 border-b border-gray-800 backdrop-blur-sm z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={playAudio}
                    disabled={!audioBuffer}
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center transition-all transform active:scale-95
                      ${!audioBuffer 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : isPlaying ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40' : 'bg-white text-gray-900 hover:scale-105 shadow-lg shadow-white/20'}
                    `}
                  >
                    {isPlaying ? <Square size={22} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t('audio.playback')}</h3>
                    <p className="text-sm text-gray-400 flex items-center">
                      {audioBuffer ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                          {audioBuffer.duration.toFixed(1)}s • 24kHz Mono
                        </>
                      ) : '--:--'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={downloadAudio}
                  disabled={!audioBuffer}
                  className={`
                    p-3 rounded-xl transition-colors border
                    ${!audioBuffer ? 'text-gray-600 border-transparent' : 'text-gray-300 border-gray-700 hover:text-white hover:bg-gray-700 hover:border-gray-600'}
                  `}
                  title={t('audio.download')}
                >
                  <Download size={20} />
                </button>
              </div>
            </div>

            {/* 2. Canvas Visualizer (Moved Below) */}
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden group">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full absolute inset-0 object-cover opacity-90"
              />
              {!audioBuffer && !loading && (
                <div className="relative z-10 text-center text-gray-600 select-none">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <AudioWaveform size={40} className="opacity-50" />
                  </div>
                  <p className="font-medium">{t('audio.empty_state')}</p>
                </div>
              )}
              
              {/* Mode Badge */}
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-full text-xs font-mono text-gray-400 uppercase tracking-wider pointer-events-none">
                 {mode} visualizer
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioGenerator;