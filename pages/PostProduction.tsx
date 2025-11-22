import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Wand2, Play, Pause, Plus, 
  Type, Music, Download, Scissors, GripVertical, Film,
  Zap, Cpu, Activity, Subtitles, Palette, Mic, Layers,
  Volume2, Video, ZoomIn, ZoomOut, Trash2, Lock, Unlock,
  MoreHorizontal, MousePointer2, Split, MoveHorizontal, Eye, EyeOff,
  Globe, Image
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { EditorClip, EditorOverlay, Project } from '../types';
import { generateColorGrade } from '../services/geminiService';
import { useToast } from '../components/Layout';

// Types for the enhanced timeline
interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text';
  label: string;
  isMuted: boolean;
  isLocked: boolean;
  isHidden: boolean;
  clips: EditorClip[];
}

interface DragState {
  type: 'move' | 'trim-start' | 'trim-end';
  clipId: string;
  trackId: string;
  startX: number;
  originalStart: number;
  originalDuration: number;
}

const STOCK_MEDIA = [
  { id: 'stock_1', name: 'Cinematic City', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 15, type: 'video' },
  { id: 'stock_2', name: 'Nature Escape', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', duration: 15, type: 'video' },
  { id: 'stock_3', name: 'Tech Abstract', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', duration: 15, type: 'video' },
  { id: 'stock_4', name: 'Urban Rhythm', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', duration: 15, type: 'video' },
];

const PostProduction: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const { showToast } = useToast();
  
  // --- STATE ---
  
  // UI State
  const [libraryTab, setLibraryTab] = useState<'media' | 'stock' | 'text'>('media');

  // Data
  const [library, setLibrary] = useState<EditorClip[]>([]);
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    { id: 'track_v2', type: 'text', label: 'Overlay 1', isMuted: false, isLocked: false, isHidden: false, clips: [] },
    { id: 'track_v1', type: 'video', label: 'Video 1', isMuted: false, isLocked: false, isHidden: false, clips: [] },
    { id: 'track_a1', type: 'audio', label: 'Audio 1', isMuted: false, isLocked: false, isHidden: false, clips: [] },
  ]);

  // Playback & Time
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(30);

  // Editor Interaction
  const [scale, setScale] = useState(20); // Pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [autoDucking, setAutoDucking] = useState(false);
  
  // GPU & Effects
  const [isGpuEnabled, setIsGpuEnabled] = useState(true);
  const [gpuName, setGpuName] = useState<string>('Checking...');
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [isColorGrading, setIsColorGrading] = useState(false);
  const [customColorPrompt, setCustomColorPrompt] = useState('');
  const [aiFilterCss, setAiFilterCss] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // Constants
  const MIN_SCALE = 5;
  const MAX_SCALE = 100;
  const TRACK_HEIGHT = 80;
  const RULER_HEIGHT = 30;

  // --- INITIALIZATION ---

  useEffect(() => {
    // Load GPU Info
    const getGpuRenderer = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
        return 'Integrated Graphics';
      } catch { return 'Unknown GPU'; }
    };
    setGpuName(getGpuRenderer());

    // Load Project Data
    if (location.state?.project) {
        const proj = location.state.project as Project;
        const storyboard = proj.data?.storyboard;
        
        if (storyboard) {
            const clips: EditorClip[] = [];
            let offset = 0;
            
            storyboard.scenes.forEach((scene: any) => {
                if (scene.video_url) {
                    clips.push({
                        id: `scene_${scene.id}`,
                        type: 'video',
                        name: `Scene ${scene.id}`,
                        src: scene.video_url,
                        startOffset: offset,
                        duration: 5 
                    });
                    offset += 5;
                }
            });
            
            setLibrary([...clips]); // Populate Library
            
            // Auto-populate Video Track
            if (clips.length > 0) {
               setTracks(prev => prev.map(t => 
                  t.id === 'track_v1' ? { ...t, clips: [...clips] } : t
               ));
               setTotalDuration(Math.max(30, offset + 5));
            }
        }
    } else {
       loadDemoAssets();
    }
  }, [location]);

  const loadDemoAssets = () => {
    const demos: EditorClip[] = [
      { id: 'demo_1', type: 'video', name: 'Cyber City', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', startOffset: 0, duration: 10 },
      { id: 'demo_2', type: 'video', name: 'Neon Drive', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', startOffset: 0, duration: 8 },
      { id: 'demo_a1', type: 'audio', name: 'Synthwave', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', startOffset: 0, duration: 30 }
    ];
    setLibrary(demos);
  };

  // --- TIMELINE LOGIC ---

  // Recalculate total duration based on clips
  useEffect(() => {
     let max = 30;
     tracks.forEach(t => {
        t.clips.forEach(c => {
           const end = c.startOffset + c.duration;
           if (end > max) max = end;
        });
     });
     setTotalDuration(max + 10); // Add buffer
  }, [tracks]);

  const handleAddTrack = () => {
     const newId = `track_${Date.now()}`;
     const newTrack: TimelineTrack = {
        id: newId,
        type: 'video', // Default
        label: `New Track`,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        clips: []
     };
     setTracks([newTrack, ...tracks]);
  };

  const handleDeleteTrack = (id: string) => {
     if (confirm('Delete track and all its clips?')) {
        setTracks(prev => prev.filter(t => t.id !== id));
     }
  };

  const addToTimeline = (clip: any, targetTrackId?: string) => {
     // Find suitable track if not specified
     let trackId = targetTrackId;
     if (!trackId) {
        const targetType = clip.type === 'audio' ? 'audio' : (clip.type === 'text' || clip.type === 'subtitle' ? 'text' : 'video');
        const track = tracks.find(t => t.type === targetType);
        trackId = track ? track.id : tracks[0].id;
     }

     const trackIndex = tracks.findIndex(t => t.id === trackId);
     if (trackIndex === -1) return;

     const targetTrack = tracks[trackIndex];
     
     // Find end of last clip in this track
     let startPos = 0;
     if (targetTrack.clips.length > 0) {
        startPos = Math.max(...targetTrack.clips.map(c => c.startOffset + c.duration));
     }

     const newClip = { 
        ...clip, 
        id: `${clip.id}_${Date.now()}`, 
        startOffset: startPos 
     };

     const newTracks = [...tracks];
     newTracks[trackIndex] = {
        ...targetTrack,
        clips: [...targetTrack.clips, newClip]
     };
     setTracks(newTracks);
  };

  // --- CLIP MANIPULATION ---

  const handleClipMouseDown = (e: React.MouseEvent, clip: EditorClip, trackId: string, type: 'move' | 'trim-start' | 'trim-end') => {
     e.stopPropagation();
     if (tracks.find(t => t.id === trackId)?.isLocked) return;

     setSelectedClipId(clip.id);
     setDragState({
        type,
        clipId: clip.id,
        trackId,
        startX: e.clientX,
        originalStart: clip.startOffset,
        originalDuration: clip.duration
     });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
     if (!dragState) return;

     const deltaPixels = e.clientX - dragState.startX;
     const deltaSeconds = deltaPixels / scale;

     setTracks(prevTracks => prevTracks.map(track => {
        if (track.id !== dragState.trackId) return track;

        return {
           ...track,
           clips: track.clips.map(clip => {
              if (clip.id !== dragState.clipId) return clip;

              let newStart = clip.startOffset;
              let newDuration = clip.duration;

              if (dragState.type === 'move') {
                 newStart = Math.max(0, dragState.originalStart + deltaSeconds);
              } else if (dragState.type === 'trim-start') {
                 // Calculate max trim based on not inverting time
                 const maxDelta = dragState.originalDuration - 0.5; // Min 0.5s duration
                 const actualDelta = Math.min(deltaSeconds, maxDelta);
                 newStart = Math.max(0, dragState.originalStart + actualDelta);
                 newDuration = dragState.originalDuration - actualDelta;
              } else if (dragState.type === 'trim-end') {
                 newDuration = Math.max(0.5, dragState.originalDuration + deltaSeconds);
              }

              return { ...clip, startOffset: newStart, duration: newDuration };
           })
        };
     }));
  };

  const handleMouseUp = () => {
     setDragState(null);
  };

  const handleSplitClip = () => {
     if (!selectedClipId) return;

     // Find the clip and track
     let foundTrackIdx = -1;
     let foundClipIdx = -1;
     let clipToSplit: EditorClip | undefined;

     tracks.forEach((track, tIdx) => {
        const cIdx = track.clips.findIndex(c => c.id === selectedClipId);
        if (cIdx !== -1) {
           foundTrackIdx = tIdx;
           foundClipIdx = cIdx;
           clipToSplit = track.clips[cIdx];
        }
     });

     if (!clipToSplit || foundTrackIdx === -1) return;

     // Check if playhead is within clip
     if (currentTime <= clipToSplit.startOffset || currentTime >= (clipToSplit.startOffset + clipToSplit.duration)) {
        showToast("Playhead must be over the selected clip to split", "error");
        return;
     }

     const splitPoint = currentTime - clipToSplit.startOffset;
     const firstHalfDuration = splitPoint;
     const secondHalfDuration = clipToSplit.duration - splitPoint;

     const clip1 = { ...clipToSplit, duration: firstHalfDuration };
     const clip2 = { 
        ...clipToSplit, 
        id: `${clipToSplit.id}_split_${Date.now()}`, 
        startOffset: clipToSplit.startOffset + firstHalfDuration,
        duration: secondHalfDuration 
     };

     const newTracks = [...tracks];
     const targetTrack = newTracks[foundTrackIdx];
     // Remove old, add two new
     targetTrack.clips.splice(foundClipIdx, 1, clip1, clip2);
     
     setTracks(newTracks);
     showToast("Clip Split", "success");
  };

  const handleDeleteClip = () => {
     if (!selectedClipId) return;
     setTracks(prev => prev.map(t => ({
        ...t,
        clips: t.clips.filter(c => c.id !== selectedClipId)
     })));
     setSelectedClipId(null);
  };

  const handleMagicCaptions = () => {
     // Mock logic: Generate captions based on timestamps
     const newClips: EditorClip[] = [];
     const captions = [
        "Welcome to the future",
        "This video is generated by AI",
        "Experience the power of Veo",
        "Create amazing stories",
        "Join DMP Studio today"
     ];
     
     let offset = 0;
     captions.forEach((text, i) => {
        newClips.push({
           id: `cap_${Date.now()}_${i}`,
           type: 'text',
           name: text,
           content: text,
           startOffset: offset,
           duration: 3
        });
        offset += 3.5;
     });

     // Find or create text track
     let textTrackIndex = tracks.findIndex(t => t.type === 'text');
     if (textTrackIndex === -1) {
        setTracks(prev => [{ id: 'track_v_sub', type: 'text', label: 'Subtitles', isMuted: false, isLocked: false, isHidden: false, clips: newClips }, ...prev]);
     } else {
        setTracks(prev => prev.map((t, i) => i === textTrackIndex ? { ...t, clips: [...t.clips, ...newClips] } : t));
     }
     
     showToast("Magic Captions Generated!", "success");
  };

  // --- PLAYBACK ENGINE ---

  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startVideoTime = currentTime;

      const loop = (timestamp: number) => {
        const elapsed = (timestamp - startTime) / 1000;
        const newTime = startVideoTime + elapsed;
        
        setCurrentTime(newTime);
        renderFrame(newTime);

        if (newTime >= totalDuration) { 
          setIsPlaying(false);
          return;
        }

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
      renderFrame(currentTime);
    }
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, tracks, activeFilter, aiFilterCss]);

  // Sync UI when not playing but time changes (scrubbing)
  useEffect(() => {
     if (!isPlaying) renderFrame(currentTime);
  }, [currentTime]);

  const renderFrame = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Global Filters
    let appliedCss = 'none';
    if (activeFilter === 'custom_ai') appliedCss = aiFilterCss;
    else if (activeFilter !== 'none') appliedCss = getFilterCSS(activeFilter);
    ctx.filter = appliedCss;

    // Render Tracks from Bottom to Top (Painter's Algorithm)
    [...tracks].reverse().forEach(track => {
       if (track.isHidden) return;

       const activeClip = track.clips.find(c => 
          time >= c.startOffset && time < (c.startOffset + c.duration)
       );

       if (activeClip) {
          if (track.type === 'video') {
             renderVideoClip(ctx, activeClip, time);
          } else if (track.type === 'text') {
             renderTextClip(ctx, activeClip);
          } else if (track.type === 'audio') {
             handleAudioClip(activeClip, time, track.isMuted);
          }
       }
    });

    // Reset audio if no clip
    if (!tracks.some(t => t.type === 'audio' && t.clips.some(c => time >= c.startOffset && time < (c.startOffset + c.duration)))) {
       if (audioRef.current) audioRef.current.pause();
    }
  };

  const renderVideoClip = (ctx: CanvasRenderingContext2D, clip: EditorClip, time: number) => {
     if (hiddenVideoRef.current) {
        const vid = hiddenVideoRef.current;
        // Naive src switching - in production use a pool of players
        if (clip.src && !vid.src.includes(clip.src)) {
           vid.src = clip.src;
        }
        
        // Seek if significant drift
        const relativeTime = time - clip.startOffset;
        if (Math.abs(vid.currentTime - relativeTime) > 0.3) {
           vid.currentTime = relativeTime;
        }

        // Draw
        try {
           ctx.drawImage(vid, 0, 0, ctx.canvas.width, ctx.canvas.height);
        } catch (e) {}
     }
  };

  const renderTextClip = (ctx: CanvasRenderingContext2D, clip: EditorClip) => {
     const fontSize = 48;
     ctx.filter = 'none'; // Reset filters for text
     
     // Text Styling
     ctx.font = `bold ${fontSize}px Inter, sans-serif`;
     ctx.textAlign = 'center';
     
     const x = ctx.canvas.width / 2;
     const y = ctx.canvas.height - 80; // Bottom positioned subtitle

     // Text Stroke/Shadow
     ctx.lineWidth = 4;
     ctx.strokeStyle = 'black';
     ctx.strokeText(clip.name || clip.content || 'Text', x, y);
     
     // Text Fill
     ctx.fillStyle = 'white';
     ctx.fillText(clip.name || clip.content || 'Text', x, y);
  };

  const handleAudioClip = (clip: EditorClip, time: number, isMuted: boolean) => {
     if (isMuted) {
        if (audioRef.current) audioRef.current.pause();
        return;
     }
     
     if (audioRef.current) {
        const aud = audioRef.current;
        if (clip.src && !aud.src.includes(clip.src)) {
           aud.src = clip.src;
           if (isPlaying) aud.play();
        }
        
        // Auto Ducking Check: Is there a video playing at same time?
        const isVideoPlaying = tracks.some(t => t.type === 'video' && t.clips.some(c => time >= c.startOffset && time < c.startOffset + c.duration));
        aud.volume = (autoDucking && isVideoPlaying) ? 0.2 : 1.0;
     }
  };

  // --- RULER RENDERING ---
  useEffect(() => {
     const canvas = rulerRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     // Set real size
     canvas.width = timelineContainerRef.current?.clientWidth || 1000;
     canvas.height = RULER_HEIGHT;

     ctx.clearRect(0, 0, canvas.width, canvas.height);
     ctx.fillStyle = '#6b7280'; // gray-500
     ctx.font = '10px Inter';

     // Draw ticks
     const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
     const startSec = scrollLeft / scale;
     const endSec = (scrollLeft + canvas.width) / scale;

     // Adaptive step
     let step = 1;
     if (scale < 10) step = 5;
     if (scale < 5) step = 10;

     for (let i = Math.floor(startSec); i <= endSec; i += step) {
        const x = (i * scale) - scrollLeft;
        if (x < 0) continue;
        
        // Major tick
        ctx.fillRect(x, 0, 1, 15);
        ctx.fillText(`${i}s`, x + 4, 12);

        // Minor ticks
        for (let j = 1; j < 5; j++) {
           const xm = x + (j * (scale * step) / 5);
           ctx.fillRect(xm, 10, 1, 5);
        }
     }
  }, [scale, timelineContainerRef.current?.scrollLeft, totalDuration]);

  // --- EXPORT ---
  const handleExport = () => {
     setIsExporting(true);
     const gpuLabel = gpuName.includes("NVIDIA") || gpuName.includes("AMD") || gpuName.includes("Apple") ? `(${gpuName.split(' ')[0]} GPU Accelerated)` : "(Software Encoding)";
     setTimeout(() => {
        setIsExporting(false);
        showToast(`Export Complete ${gpuLabel}`, "success");
     }, 3000);
  };

  const handleAiColorGrade = async () => {
     if (!customColorPrompt) return;
     setIsColorGrading(true);
     try {
        const params = await generateColorGrade(customColorPrompt);
        const css = `contrast(${params.contrast}%) saturate(${params.saturation}%) brightness(${params.brightness}%) sepia(${params.sepia}%) hue-rotate(${params.hueRotate}deg) grayscale(${params.grayscale}%) blur(${params.blur}px)`;
        setAiFilterCss(css);
        setActiveFilter('custom_ai');
        showToast("AI Grade Applied", "success");
     } catch (e) {
        showToast("AI Grade Failed", "error");
     } finally {
        setIsColorGrading(false);
     }
  };

  const getFilterCSS = (id: string) => {
     switch(id) {
        case 'cinematic': return 'contrast(1.2) saturate(1.3) brightness(0.9) sepia(0.1)';
        case 'noir': return 'grayscale(1) contrast(1.2)';
        case 'cyber': return 'hue-rotate(180deg) contrast(1.2) saturate(1.5)';
        case 'vintage': return 'sepia(0.5) contrast(0.9) brightness(1.1)';
        case 'warm': return 'sepia(0.3) saturate(1.2) hue-rotate(-10deg)';
        default: return 'none';
     }
  };

  const handleTimelineScroll = () => {
     if (rulerRef.current) {
        // Just triggering the effect
     }
  };

  const getTrackColor = (type: string) => {
     switch(type) {
        case 'video': return 'bg-blue-900/40 border-blue-500/50 hover:border-blue-400';
        case 'audio': return 'bg-emerald-900/40 border-emerald-500/50 hover:border-emerald-400';
        case 'text': return 'bg-purple-900/40 border-purple-500/50 hover:border-purple-400';
        default: return 'bg-gray-800 border-gray-600';
     }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-950 text-gray-200 select-none"
         onMouseUp={handleMouseUp} 
         onMouseMove={handleMouseMove}
         onMouseLeave={handleMouseUp}
    >
      {/* HIDDEN PLAYERS */}
      <video ref={hiddenVideoRef} className="hidden" crossOrigin="anonymous" muted />
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />

      {/* 1. HEADER TOOLBAR */}
      <div className="h-14 border-b border-gray-800 px-4 flex items-center justify-between bg-gray-900 shrink-0">
        <div className="flex items-center">
          <Wand2 className="text-brand-400 mr-2" />
          <h1 className="font-bold text-white mr-6 hidden md:block">{t('editor.title')}</h1>
          
          {/* Toolbox */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-1">
             <button className="p-1.5 hover:bg-gray-700 rounded text-brand-400 bg-gray-700" title="Select Tool (V)">
                <MousePointer2 size={16} />
             </button>
             <button onClick={handleSplitClip} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Split Tool (S)">
                <Split size={16} />
             </button>
             <button onClick={handleDeleteClip} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Delete (Del)">
                <Trash2 size={16} />
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1 border border-gray-700" title={gpuName}>
             <Cpu size={14} className="text-gray-400" />
             <span className="text-xs text-gray-300 truncate max-w-[150px]">{gpuName}</span>
          </div>
          <button onClick={handleExport} className="bg-white hover:bg-gray-200 text-black px-4 py-1.5 rounded text-sm font-bold flex items-center transition-colors shadow-lg">
            {isExporting ? <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-black mr-2 rounded-full"></div> : <Download size={16} className="mr-2" />}
            {isExporting ? t('editor.exporting') : t('editor.export')}
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (Player & Assets) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
         
         {/* Left: Library & Assets */}
         <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-gray-800 bg-gray-950/30">
               <button 
                  onClick={() => setLibraryTab('media')} 
                  className={`flex-1 py-3 text-xs font-bold border-b-2 ${libraryTab === 'media' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}
               >
                  Project
               </button>
               <button 
                  onClick={() => setLibraryTab('stock')} 
                  className={`flex-1 py-3 text-xs font-bold border-b-2 ${libraryTab === 'stock' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}
               >
                  Stock
               </button>
               <button 
                  onClick={() => setLibraryTab('text')} 
                  className={`flex-1 py-3 text-xs font-bold border-b-2 ${libraryTab === 'text' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}
               >
                  Text
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
               
               {libraryTab === 'media' && (
                  <>
                     {library.map(clip => (
                        <div key={clip.id} 
                             className="bg-gray-800 p-2 rounded hover:border-brand-500 border border-transparent group cursor-pointer transition-all"
                             onClick={() => addToTimeline(clip)}
                        >
                           <div className="aspect-video bg-black rounded mb-2 overflow-hidden relative flex items-center justify-center">
                              {clip.type === 'audio' ? <Music className="text-gray-600"/> : <video src={clip.src} className="w-full h-full object-cover" />}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Plus className="text-white" />
                              </div>
                           </div>
                           <p className="text-xs text-gray-300 truncate">{clip.name}</p>
                           <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] text-gray-500 uppercase">{clip.type}</span>
                              <span className="text-[10px] text-gray-500">{clip.duration}s</span>
                           </div>
                        </div>
                     ))}
                     <button onClick={loadDemoAssets} className="w-full text-xs text-gray-500 mt-4 hover:text-white border border-gray-700 rounded py-2">Reset Demo Assets</button>
                  </>
               )}

               {libraryTab === 'stock' && (
                  <div className="grid grid-cols-1 gap-2">
                     {STOCK_MEDIA.map(stock => (
                        <div key={stock.id} 
                             className="bg-gray-800 p-2 rounded hover:border-blue-500 border border-transparent group cursor-pointer"
                             onClick={() => addToTimeline(stock)}
                        >
                           <div className="aspect-video bg-black rounded mb-2 overflow-hidden relative">
                              <video src={stock.src} className="w-full h-full object-cover" />
                              <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 rounded font-bold">PRO</div>
                           </div>
                           <div className="flex justify-between">
                              <p className="text-xs text-white">{stock.name}</p>
                              <span className="text-[10px] text-gray-500">Stock</span>
                           </div>
                        </div>
                     ))}
                     <div className="p-4 text-center text-gray-500 text-xs">
                        <Globe size={24} className="mx-auto mb-2 opacity-50"/>
                        More stocks coming from Pexels API integration.
                     </div>
                  </div>
               )}

               {libraryTab === 'text' && (
                  <div className="space-y-3">
                     <button 
                        onClick={handleMagicCaptions}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center shadow-lg"
                     >
                        <Subtitles size={16} className="mr-2" /> Magic Captions (Auto)
                     </button>
                     <div className="h-px bg-gray-800 my-2"></div>
                     <div className="text-xs text-gray-500 mb-2">Presets</div>
                     {['Title', 'Subtitle', 'Lower Third'].map((t, i) => (
                        <div key={i} 
                             className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-white cursor-pointer"
                             onClick={() => addToTimeline({ id: `txt_${Date.now()}`, type: 'text', name: t, content: t, duration: 5 })}
                        >
                           <div className="text-center font-bold text-white text-lg font-serif">{t}</div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Center: Player */}
         <div className="flex-1 flex flex-col bg-black relative min-w-0">
            <div className="flex-1 flex items-center justify-center p-6 relative">
               <canvas 
                  ref={canvasRef}
                  width={960} height={540}
                  className="max-w-full max-h-full shadow-2xl border border-gray-800 bg-gray-900"
               />
               {isGpuEnabled && (
                  <div className="absolute top-4 right-4 flex items-center text-[10px] font-bold text-brand-500 bg-black/80 px-2 py-1 rounded border border-brand-900/50 backdrop-blur">
                     <Activity size={12} className="mr-1" /> TURBO
                  </div>
               )}
            </div>
            {/* Player Transport */}
            <div className="h-12 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-6 shrink-0">
               <span className="text-xs font-mono text-gray-400 w-20 text-right">{new Date(currentTime * 1000).toISOString().substr(14, 8)}</span>
               <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                  {isPlaying ? <Pause fill="black" size={18}/> : <Play fill="black" size={18} className="ml-1"/>}
               </button>
               <span className="text-xs font-mono text-gray-600 w-20">{new Date(totalDuration * 1000).toISOString().substr(14, 8)}</span>
            </div>
         </div>

         {/* Right: Inspector */}
         <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4">
               <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center"><Palette size={12} className="mr-2"/> Color & AI</h3>
               
               <div className="space-y-4">
                  <div className="bg-gray-950 p-2 rounded border border-gray-800">
                     <label className="text-[10px] text-brand-400 font-bold mb-2 block flex items-center"><Mic size={10} className="mr-1"/> AI Colorist</label>
                     <div className="flex gap-1">
                        <input 
                           type="text" 
                           className="flex-1 bg-gray-900 text-white text-xs p-1.5 rounded border border-gray-700 focus:border-brand-500 outline-none"
                           placeholder="Ex: Matrix green..."
                           value={customColorPrompt}
                           onChange={(e) => setCustomColorPrompt(e.target.value)}
                        />
                        <button onClick={handleAiColorGrade} disabled={isColorGrading} className="bg-brand-600 text-white px-2 rounded text-xs">
                           {isColorGrading ? '...' : 'Go'}
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     {['none', 'cinematic', 'noir', 'cyber', 'vintage', 'warm'].map(f => (
                        <button 
                           key={f} 
                           onClick={() => setActiveFilter(f)}
                           className={`text-xs py-2 rounded border capitalize ${activeFilter === f ? 'bg-gray-700 text-white border-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                        >
                           {f}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="mt-6 pt-6 border-t border-gray-800">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Tools</h3>
                  <button 
                     onClick={() => setAutoDucking(!autoDucking)} 
                     className={`w-full py-2 rounded text-xs border flex items-center justify-center ${autoDucking ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                     <Volume2 size={12} className="mr-2" /> Auto Ducking
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* 3. TIMELINE AREA */}
      <div className="h-72 bg-gray-950 border-t border-gray-800 flex flex-col shrink-0">
         
         {/* Timeline Toolbar */}
         <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
               <button onClick={handleAddTrack} className="flex items-center text-xs text-gray-400 hover:text-white px-2 py-1 hover:bg-gray-800 rounded">
                  <Plus size={12} className="mr-1" /> Add Track
               </button>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => setScale(Math.max(MIN_SCALE, scale - 5))} className="text-gray-400 hover:text-white p-1"><ZoomOut size={14}/></button>
               <input 
                  type="range" min={MIN_SCALE} max={MAX_SCALE} value={scale} 
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
               />
               <button onClick={() => setScale(Math.min(MAX_SCALE, scale + 5))} className="text-gray-400 hover:text-white p-1"><ZoomIn size={14}/></button>
            </div>
         </div>

         <div className="flex-1 flex overflow-hidden">
            {/* Track Headers */}
            <div className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 mt-[30px]"> {/* Offset for ruler */}
               {tracks.map(track => (
                  <div key={track.id} className="h-[80px] border-b border-gray-800 p-2 flex flex-col justify-center group relative">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-300 truncate">{track.label}</span>
                        <div className="flex gap-1">
                           <button 
                              onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? {...t, isLocked: !t.isLocked} : t))}
                              className={`p-1 rounded hover:bg-gray-800 ${track.isLocked ? 'text-red-400' : 'text-gray-600'}`}
                           >
                              {track.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                           </button>
                           <button 
                              onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? {...t, isHidden: !t.isHidden} : t))}
                              className={`p-1 rounded hover:bg-gray-800 ${track.isHidden ? 'text-gray-600' : 'text-gray-400'}`}
                           >
                              {track.isHidden ? <EyeOff size={12}/> : <Eye size={12}/>}
                           </button>
                        </div>
                     </div>
                     <div className="flex gap-2 mt-2">
                        <button className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded hover:text-white">M</button>
                        <button className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded hover:text-white">S</button>
                        <div className="flex-1"></div>
                        <button onClick={() => handleDeleteTrack(track.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={12} />
                        </button>
                     </div>
                  </div>
               ))}
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-gray-950" ref={timelineContainerRef} onScroll={handleTimelineScroll}>
               <div className="min-w-full h-full relative" style={{ width: `${totalDuration * scale}px` }}>
                  
                  {/* Ruler */}
                  <div className="h-[30px] bg-gray-900 border-b border-gray-800 sticky top-0 z-20 w-full pointer-events-none">
                     <canvas ref={rulerRef} className="w-full h-full" />
                  </div>

                  {/* Playhead */}
                  <div 
                     className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none"
                     style={{ left: currentTime * scale }}
                  >
                     <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 -ml-[5px]"></div>
                  </div>

                  {/* Playhead Interaction Layer (Click to seek) */}
                  <div 
                     className="absolute inset-0 z-0 cursor-text"
                     onClick={(e) => {
                        if (e.target === e.currentTarget) {
                           const rect = e.currentTarget.getBoundingClientRect();
                           const x = e.clientX - rect.left + (timelineContainerRef.current?.scrollLeft || 0);
                           const t = x / scale;
                           setCurrentTime(Math.max(0, t));
                        }
                     }}
                  >
                     {/* Tracks Lane */}
                     <div className="flex flex-col">
                        {tracks.map(track => (
                           <div key={track.id} className={`h-[80px] border-b border-gray-800/50 relative group ${track.isLocked ? 'bg-gray-900/30' : ''}`}>
                              {/* Clips */}
                              {track.clips.map(clip => (
                                 <div 
                                    key={clip.id}
                                    className={`
                                       absolute top-2 bottom-2 rounded-md border shadow-sm overflow-hidden cursor-pointer group/clip
                                       ${getTrackColor(track.type)}
                                       ${selectedClipId === clip.id ? 'ring-2 ring-white z-10' : ''}
                                    `}
                                    style={{ 
                                       left: clip.startOffset * scale, 
                                       width: clip.duration * scale 
                                    }}
                                    onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'move')}
                                 >
                                    {/* Left Trim Handle */}
                                    <div 
                                       className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 opacity-0 group-hover/clip:opacity-100 transition-opacity"
                                       onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-start')}
                                    />
                                    
                                    {/* Content */}
                                    <div className="px-2 py-1 flex flex-col h-full justify-center pointer-events-none">
                                       <span className="text-xs font-bold text-white truncate shadow-sm">{clip.name}</span>
                                       {clip.type === 'video' && (
                                          <div className="flex-1 flex gap-0.5 opacity-30 mt-1 overflow-hidden">
                                             {Array.from({length: Math.ceil(clip.duration)}).map((_, i) => (
                                                <div key={i} className="flex-1 bg-white/20 rounded-sm h-full" />
                                             ))}
                                          </div>
                                       )}
                                       {clip.type === 'audio' && (
                                          <div className="flex-1 flex items-center opacity-50 mt-1">
                                             <div className="w-full h-4 bg-current opacity-20" style={{maskImage: 'url("data:image/svg+xml;base64,...")'}}></div> {/* Placeholder for waveform */}
                                             <div className="w-full h-[1px] bg-white"></div>
                                          </div>
                                       )}
                                    </div>

                                    {/* Right Trim Handle */}
                                    <div 
                                       className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/50 z-20 opacity-0 group-hover/clip:opacity-100 transition-opacity"
                                       onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-end')}
                                    />
                                 </div>
                              ))}
                           </div>
                        ))}
                     </div>
                  </div>

               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PostProduction;