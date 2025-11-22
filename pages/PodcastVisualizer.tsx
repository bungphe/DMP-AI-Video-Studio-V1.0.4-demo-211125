
import React, { useState, useRef, useEffect } from 'react';
import { Headphones, Music, Mic, Video, Upload, Play, Pause, Download, Image as ImageIcon, RefreshCw, Loader2, Users, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { storageService } from '../services/storageService';
import { SavedCharacter } from '../types';
import { generateVideo } from '../services/geminiService';

const PodcastVisualizer: React.FC = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'spectrum' | 'avatar'>('spectrum');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('https://images.unsplash.com/photo-1478737270239-2f02b77ac618?q=80&w=1600&auto=format&fit=crop');
  const [caption, setCaption] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Avatar State
  const [selectedAvatar, setSelectedAvatar] = useState<SavedCharacter | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [avatars, setAvatars] = useState<SavedCharacter[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Audio & Canvas Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Recording Refs
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadAvatars();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const loadAvatars = async () => {
    const chars = await storageService.getCharacters();
    setAvatars(chars);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setGeneratedVideoUrl(null);
      setIsPlaying(false);
      if(audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
      }
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBackgroundUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const connectSource = () => {
    if (!audioRef.current || !audioContextRef.current || !analyserRef.current) return;
    if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    initAudioContext();
    connectSource();

    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
      drawVisualizer();
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      // Background Image
      const img = new Image();
      img.src = backgroundUrl;
      // We assume background is loaded or handled. 
      // Since loading image every frame is bad, we rely on the parent div for BG and clearRect here if transparent
      // But to record canvas, we need to draw BG on canvas.
      // Optimized approach: Draw BG once or assume it's cached. 
      
      // For simplicity in this demo, we fill black or draw the image if loaded
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Overlay Dim
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Caption
      if (caption) {
          ctx.font = 'bold 30px Inter';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(caption, canvas.width / 2, canvas.height / 2 - 50);
      }

      // Circle Visualizer
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 50;
      const radius = 80;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Spectrum
      const barWidth = (2 * Math.PI * radius) / bufferLength;
      let angle = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * 100;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barHeight);
        const y2 = cy + Math.sin(angle) * (radius + barHeight);

        ctx.strokeStyle = `hsl(${i * 2}, 100%, 50%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        angle += (2 * Math.PI) / bufferLength;
      }
    };
    
    // Pre-load image for draw loop
    const bgImg = new Image();
    bgImg.src = backgroundUrl;
    bgImg.onload = () => draw();
  };

  const startRecording = () => {
      if (!canvasRef.current || !audioRef.current) return;
      
      // Ensure playing
      if (audioRef.current.paused) togglePlay();

      const stream = canvasRef.current.captureStream(30);
      // Mix audio track
      if (sourceRef.current) {
          // We need a destination to get the stream from audio context? 
          // Simpler: captureStream from canvas only captures video. 
          // To mix, we need WebAudio destination.
          const dest = audioContextRef.current!.createMediaStreamDestination();
          sourceRef.current.connect(dest);
          const audioTrack = dest.stream.getAudioTracks()[0];
          stream.addTrack(audioTrack);
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `podcast_visualizer_${Date.now()}.webm`;
          a.click();
      };

      recorder.start();
      setIsRecording(true);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          // Also stop audio
          if(audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
          }
          cancelAnimationFrame(animationFrameRef.current);
      }
  };

  const handleGenerateAvatarVideo = async () => {
      if (!selectedAvatar || !audioUrl) return;
      setIsGeneratingVideo(true);
      setGeneratedVideoUrl(null);
      
      try {
          // In a real scenario, we would upload the audio file to Gemini/Veo.
          // Currently Veo via API takes prompt + image. 
          // We can simulate "Lip Sync" by asking Veo to animate the character speaking.
          
          const base64Image = selectedAvatar.imageBase64.split(',')[1];
          const mimeType = selectedAvatar.imageBase64.split(':')[1].split(';')[0];
          
          const prompt = `A static shot of this character talking naturally, slight head movement, professional podcast setting. The video should be a loopable clip of them speaking. High quality, 4k.`;
          
          const url = await generateVideo(prompt, () => {}, [{data: base64Image, mimeType}]);
          setGeneratedVideoUrl(url);
          
      } catch(e) {
          console.error(e);
          alert("Failed to generate avatar video.");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Headphones className="mr-3 text-brand-400" /> {t('podcast.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('podcast.desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              {/* Mode Switch */}
              <div className="flex bg-black p-1 rounded-lg mb-6">
                 <button 
                    onClick={() => setMode('spectrum')} 
                    className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${mode === 'spectrum' ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
                 >
                    {t('podcast.mode_spectrum')}
                 </button>
                 <button 
                    onClick={() => setMode('avatar')} 
                    className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${mode === 'avatar' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                 >
                    {t('podcast.mode_avatar')}
                 </button>
              </div>

              {/* Audio Upload */}
              <div className="mb-4">
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('podcast.upload_label')}</label>
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-lg h-20 flex items-center justify-center cursor-pointer hover:bg-gray-800 hover:border-brand-500 transition-colors"
                 >
                    {audioUrl ? (
                        <div className="text-green-400 flex items-center"><Music size={20} className="mr-2"/> Audio Loaded</div>
                    ) : (
                        <div className="text-gray-500 flex items-center"><Upload size={20} className="mr-2"/> Select Audio</div>
                    )}
                 </div>
                 <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                 <audio ref={audioRef} className="hidden" />
              </div>

              {/* Common Controls */}
              <div className="mb-4">
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('podcast.caption')}</label>
                 <input 
                    type="text" 
                    className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm focus:border-brand-500 outline-none"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Episode Title..."
                 />
              </div>

              {/* Mode Specific Controls */}
              {mode === 'spectrum' && (
                 <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('podcast.background')}</label>
                    <div className="flex gap-2">
                       <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-gray-800 border border-gray-700 rounded py-2 text-xs text-gray-300 hover:bg-gray-700 flex items-center justify-center">
                          <ImageIcon size={14} className="mr-1" /> Upload Image
                       </button>
                       <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                    </div>
                 </div>
              )}

              {mode === 'avatar' && (
                 <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Character</label>
                    {selectedAvatar ? (
                       <div className="flex items-center bg-gray-800 p-2 rounded border border-gray-700">
                          <img src={selectedAvatar.imageBase64} className="w-10 h-10 rounded object-cover mr-3" />
                          <span className="text-sm text-white font-bold flex-1">{selectedAvatar.name}</span>
                          <button onClick={() => setSelectedAvatar(null)} className="text-gray-500 hover:text-white"><X size={16}/></button>
                       </div>
                    ) : (
                       <button onClick={() => setShowLibrary(true)} className="w-full py-3 bg-gray-800 border border-dashed border-gray-600 rounded text-xs text-gray-300 hover:text-white hover:border-brand-500">
                          {t('podcast.select_avatar')}
                       </button>
                    )}
                 </div>
              )}

              {/* Action Buttons */}
              {mode === 'spectrum' ? (
                 <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!audioUrl}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50'}`}
                 >
                    {isRecording ? t('podcast.stop_recording') : t('podcast.btn_export')}
                 </button>
              ) : (
                 <button 
                    onClick={handleGenerateAvatarVideo}
                    disabled={!selectedAvatar || !audioUrl || isGeneratingVideo}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold flex items-center justify-center disabled:opacity-50"
                 >
                    {isGeneratingVideo ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2" />}
                    {t('podcast.btn_generate')}
                 </button>
              )}
           </div>
        </div>

        {/* RIGHT: PREVIEW CANVAS */}
        <div className="lg:col-span-8 bg-black rounded-xl border border-gray-800 flex items-center justify-center relative overflow-hidden aspect-video shadow-2xl">
           
           {mode === 'spectrum' && (
              <>
                 <canvas 
                    ref={canvasRef} 
                    width={1280} 
                    height={720} 
                    className="w-full h-full object-contain"
                 />
                 {!isPlaying && !isRecording && (
                    <button 
                       onClick={togglePlay}
                       disabled={!audioUrl}
                       className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors group"
                    >
                       <Play size={64} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                    </button>
                 )}
              </>
           )}

           {mode === 'avatar' && (
              <div className="relative w-full h-full">
                 {generatedVideoUrl ? (
                    <div className="relative w-full h-full">
                        <video 
                           src={generatedVideoUrl} 
                           className="w-full h-full object-cover" 
                           autoPlay 
                           loop 
                           muted // Muted because audio comes from the audio element if needed, but actually Veo video has no sound usually
                        />
                        {/* Overlay Audio Player */}
                        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur rounded-lg p-2 flex items-center">
                           <button onClick={togglePlay} className="mr-3 text-white hover:text-brand-400">
                              {isPlaying ? <Pause size={20}/> : <Play size={20}/>}
                           </button>
                           <div className="flex-1 h-1 bg-gray-600 rounded overflow-hidden">
                              <div className="h-full bg-brand-500 w-1/2 animate-pulse"></div>
                           </div>
                        </div>
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                       {selectedAvatar ? (
                          <img src={selectedAvatar.imageBase64} className="w-full h-full object-cover opacity-50 blur-sm" />
                       ) : (
                          <Users size={64} className="mb-4 opacity-20" />
                       )}
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-lg font-bold text-white drop-shadow-md">
                             {isGeneratingVideo ? 'Generating AI Video...' : 'Preview Area'}
                          </p>
                          {isGeneratingVideo && <Loader2 className="animate-spin mt-2 text-brand-500" size={32} />}
                       </div>
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>

      {/* Library Modal */}
      {showLibrary && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl h-[70vh] flex flex-col shadow-2xl">
               <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-white">Select Avatar</h3>
                  <button onClick={() => setShowLibrary(false)}><X className="text-gray-400"/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4">
                  {avatars.map(char => (
                     <div key={char.id} onClick={() => { setSelectedAvatar(char); setShowLibrary(false); }} className="cursor-pointer group relative rounded-lg overflow-hidden border border-gray-700 hover:border-brand-500">
                        <img src={char.imageBase64} className="w-full h-40 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white font-bold">{char.name}</div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PodcastVisualizer;
