import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Upload, Play, Video, CheckCircle2, Zap, Smartphone, Layers, Loader2, Pause, Crop, MonitorPlay, Music, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateViralShortsMetadata } from '../services/geminiService';

interface GeneratedClip {
  id: string;
  startTime: number;
  duration: number;
  viralScore: number;
  reason: string;
  caption: string;
  thumbnail?: string; 
}

const AIClips: React.FC = () => {
  const { t, language } = useLanguage();
  
  // Inputs
  const [sourceVideo, setSourceVideo] = useState<string | null>(null);
  const [videoContext, setVideoContext] = useState('');
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  
  // Player State
  const [activeClip, setActiveClip] = useState<GeneratedClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAutoCaptions, setShowAutoCaptions] = useState(true);
  const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Demo Video URL 
  const DEMO_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Handle Source Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceVideo(url);
      setClips([]);
      setActiveClip(null);
    }
  };

  const handleUseDemo = () => {
    setSourceVideo(DEMO_VIDEO);
    setClips([]);
    setActiveClip(null);
    setVideoContext("A funny cartoon bunny meets three bullying squirrels in a forest.");
  };

  // --- CORE: SMART ANALYSIS ---
  const generateClips = async () => {
    if (!videoContext && !sourceVideo) return;
    
    setIsAnalyzing(true);
    setClips([]);
    setActiveClip(null);
    
    // Simulate processing steps for UX
    const stages = [
      { p: 10, text: t('clips.analyzing') },
      { p: 40, text: t('clips.detecting') },
      { p: 70, text: t('clips.cropping') },
    ];

    // Fake progress bar
    let stageIdx = 0;
    const progressInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        setProgress(stages[stageIdx].p);
        setStatusText(stages[stageIdx].text);
        stageIdx++;
      }
    }, 800);

    try {
       // Call Real Gemini API to generate metadata
       // (In a real app, we'd upload frames, here we use context description)
       const generatedClips = await generateViralShortsMetadata(
          videoContext || "General video content", 
          language
       );
       
       clearInterval(progressInterval);
       setProgress(100);
       setClips(generatedClips);
       if (generatedClips.length > 0) {
          setActiveClip(generatedClips[0]);
       }
    } catch (e: any) {
       console.error(e);
       let msg = e.message;
       if (msg === "QUOTA_EXCEEDED") alert(t('errors.quota_exceeded'));
       else alert("Analysis failed. " + t('errors.generic_error'));
    } finally {
       setIsAnalyzing(false);
    }
  };

  // --- CORE: PLAYBACK LOOP LOGIC ---
  useEffect(() => {
    const vid = previewVideoRef.current;
    if (!vid || !activeClip) return;

    const handleTimeUpdate = () => {
       setCurrentTime(vid.currentTime);
       
       // Loop logic: If time exceeds start + duration, seek back to start
       const endTime = activeClip.startTime + activeClip.duration;
       if (vid.currentTime >= endTime) {
          vid.currentTime = activeClip.startTime;
          // Keep playing
          if(isPlaying) vid.play();
       }
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeClip, isPlaying]);

  // Reset player when clip changes
  useEffect(() => {
     if (previewVideoRef.current && activeClip) {
        previewVideoRef.current.currentTime = activeClip.startTime;
        if (isPlaying) previewVideoRef.current.play();
     }
  }, [activeClip]);

  const togglePlay = () => {
     const vid = previewVideoRef.current;
     if (!vid) return;
     if (vid.paused) {
        vid.play();
        setIsPlaying(true);
     } else {
        vid.pause();
        setIsPlaying(false);
     }
  };

  // Helper to format time
  const formatTime = (time: number) => {
     const m = Math.floor(time / 60);
     const s = Math.floor(time % 60);
     return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Scissors className="mr-3 text-brand-400" /> {t('clips.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('clips.desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left: Source & Controls */}
         <div className="lg:col-span-7 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
               
               {/* Upload Area */}
               {!sourceVideo ? (
                  <div className="border-2 border-dashed border-gray-700 rounded-xl h-72 flex flex-col items-center justify-center bg-gray-950/50 relative">
                     <Upload size={48} className="text-gray-600 mb-4" />
                     <p className="text-gray-400 font-medium mb-2">{t('clips.upload_label')}</p>
                     <p className="text-xs text-gray-600 mb-6">{t('clips.upload_desc')}</p>
                     
                     <div className="flex gap-4">
                        <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                        >
                           Select File
                        </button>
                        <button 
                           onClick={handleUseDemo}
                           className="text-gray-400 hover:text-white text-sm underline"
                        >
                           Use Demo Video
                        </button>
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="video/*" />
                  </div>
               ) : (
                  <div className="space-y-4">
                      {/* Source Preview (16:9) */}
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video group border border-gray-800">
                         <video src={sourceVideo} className="w-full h-full object-contain" controls />
                         <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => setSourceVideo(null)} className="bg-black/50 text-white p-2 rounded-full hover:bg-red-500/50 transition-colors" title="Remove Video">
                               <Scissors size={16} />
                            </button>
                         </div>
                      </div>

                      {/* Analysis Input */}
                      {!isAnalyzing && clips.length === 0 && (
                         <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 animate-fadeIn">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('clips.context')}</label>
                            <textarea 
                               className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm mb-3 focus:ring-1 focus:ring-brand-500 outline-none"
                               rows={2}
                               placeholder="E.g. A funny podcast about AI technology..."
                               value={videoContext}
                               onChange={(e) => setVideoContext(e.target.value)}
                            />
                            <button 
                               onClick={generateClips}
                               disabled={!videoContext}
                               className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center disabled:opacity-50"
                            >
                               <Zap className="mr-2 fill-current" /> {t('clips.btn_clip')}
                            </button>
                         </div>
                      )}
                  </div>
               )}

               {/* Analysis Progress */}
               {isAnalyzing && (
                  <div className="mt-6 space-y-2">
                     <div className="flex justify-between text-xs font-medium text-brand-400 uppercase">
                        <span>{statusText}</span>
                        <span>{progress}%</span>
                     </div>
                     <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                     </div>
                     <div className="grid grid-cols-3 gap-4 mt-4">
                        {[1,2,3].map(i => (
                           <div key={i} className="h-24 bg-gray-800 rounded animate-pulse"></div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* Result List */}
            {clips.length > 0 && (
               <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-slideInUp">
                  <div className="p-4 border-b border-gray-800 bg-gray-950/50">
                     <h3 className="font-bold text-white flex items-center">
                        <Layers className="mr-2 text-brand-400" /> {t('clips.result_title')}
                     </h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                     {clips.map((clip, idx) => (
                        <div 
                           key={idx} 
                           onClick={() => setActiveClip(clip)}
                           className={`p-4 flex gap-4 cursor-pointer transition-colors ${activeClip?.id === clip.id ? 'bg-brand-900/20 border-l-4 border-brand-500' : 'hover:bg-gray-800 border-l-4 border-transparent'}`}
                        >
                           <div className={`w-24 h-32 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center text-white font-bold text-xs relative overflow-hidden group`}>
                              {/* Simulated Thumbnail from Source */}
                              {sourceVideo && (
                                 <video 
                                    src={`${sourceVideo}#t=${clip.startTime}`} 
                                    className="w-full h-full object-cover opacity-60"
                                    preload="metadata"
                                 />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <Play fill="white" size={24} className="drop-shadow-md" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[10px]">{clip.duration}s</span>
                           </div>
                           
                           <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-bold text-white text-sm">Viral Segment #{idx + 1}</h4>
                                 <span className="bg-green-900/50 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-500/30">
                                    {clip.viralScore} VIRAL
                                 </span>
                              </div>
                              <p className="text-xs text-gray-400 mb-2 line-clamp-2">{clip.reason}</p>
                              <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                 <p className="text-[10px] text-gray-500 uppercase">Suggested Caption</p>
                                 <p className="text-xs text-white italic">"{clip.caption}"</p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Right: Preview Phone (THE KILLER FEATURE) */}
         <div className="lg:col-span-5 flex flex-col items-center sticky top-8 h-fit">
            
            {/* Platform Toggle */}
            <div className="bg-gray-900 p-1 rounded-lg border border-gray-800 mb-4 flex shadow-lg">
               {['tiktok', 'instagram', 'youtube'].map(p => (
                  <button 
                     key={p}
                     onClick={() => setPlatform(p as any)}
                     className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${platform === p ? 'bg-brand-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                  >
                     {p}
                  </button>
               ))}
            </div>

            {/* Phone Frame */}
            <div className="w-[320px] h-[650px] bg-black rounded-[3rem] border-8 border-gray-900 relative overflow-hidden shadow-2xl ring-1 ring-gray-800/50">
               {/* Notch */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
               
               {/* Video Content */}
               <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  {activeClip && sourceVideo ? (
                     <div className="relative w-full h-full group" onClick={togglePlay}>
                        <video 
                           ref={previewVideoRef}
                           src={sourceVideo} 
                           className="w-full h-full object-cover"
                           loop
                           playsInline
                        />
                        
                        {/* Auto Captions Overlay */}
                        {showAutoCaptions && (
                           <div className="absolute bottom-24 left-4 right-4 text-center pointer-events-none">
                              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm font-bold shadow-lg backdrop-blur-sm leading-relaxed inline-block">
                                 {activeClip.caption}
                              </span>
                           </div>
                        )}

                        {/* TikTok/Reels UI Mockup */}
                        <div className="absolute right-2 bottom-20 flex flex-col gap-6 items-center pointer-events-none">
                           <div className="w-10 h-10 bg-gray-800/50 backdrop-blur rounded-full flex items-center justify-center"><Heart className="w-6 h-6 text-white drop-shadow-md" /></div>
                           <div className="w-10 h-10 bg-gray-800/50 backdrop-blur rounded-full flex items-center justify-center"><MessageCircle className="w-6 h-6 text-white drop-shadow-md" /></div>
                           <div className="w-10 h-10 bg-gray-800/50 backdrop-blur rounded-full flex items-center justify-center"><Share2 className="w-6 h-6 text-white drop-shadow-md" /></div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-16 pointer-events-none">
                           <div className="h-4 w-32 bg-gray-800/50 rounded mb-2"></div>
                           <div className="h-3 w-48 bg-gray-800/50 rounded"></div>
                        </div>

                        {/* Play Button Overlay */}
                        {!isPlaying && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play fill="white" size={48} className="opacity-80" />
                           </div>
                        )}
                     </div>
                  ) : (
                     <div className="text-center text-gray-600 p-6">
                        <Smartphone size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Select a clip to preview in vertical format.</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Controls Below Phone */}
            {activeClip && (
               <div className="mt-6 w-full max-w-[320px] flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                     <span className="text-xs text-gray-400">Auto-Captions</span>
                     <button 
                        onClick={() => setShowAutoCaptions(!showAutoCaptions)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showAutoCaptions ? 'bg-brand-600' : 'bg-gray-700'}`}
                     >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showAutoCaptions ? 'left-6' : 'left-1'}`}></div>
                     </button>
                  </div>
                  
                  <button className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-bold flex items-center justify-center shadow-lg transition-colors">
                     <MonitorPlay size={18} className="mr-2" /> Export {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Reel' : 'Short'}
                  </button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default AIClips;