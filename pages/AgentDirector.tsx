
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, Sparkles, Film, Play, CheckCircle2, AlertTriangle, Loader2, Video, Clapperboard, X, SkipForward, Mic, Volume2, Upload, Image as ImageIcon, Trash2, Settings2, ChevronDown, ChevronUp, Users, Zap, Download, Edit2, Save, RefreshCw, BrainCircuit, Eye, MicOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateStoryboard, generateVideo, generateSpeech, bufferToWave, generateSceneImage } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { Storyboard, StoryboardScene, VideoConfig, SavedCharacter, Project, VideoPreset } from '../types';

const AgentDirector: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [pausedDueToQuota, setPausedDueToQuota] = useState(false);
  
  // Editing State
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);

  // Advanced Settings - Default to TRUE for better visibility
  const [showSettings, setShowSettings] = useState(true);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    resolution: '720p',
    aspectRatio: '16:9',
    fps: '24',
    duration: '5s',
    sceneCount: 5,
    mode: 'cinematic'
  });
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [targetDuration, setTargetDuration] = useState<string>('custom');
  
  // Asset State for Consistency
  const [referenceImage, setReferenceImage] = useState<{ data: string, mimeType: string } | undefined>(undefined);
  const assetInputRef = useRef<HTMLInputElement>(null);

  // Library State
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryCharacters, setLibraryCharacters] = useState<SavedCharacter[]>([]);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);

  // Assembly Mode State
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const cinemaVideoRef = useRef<HTMLVideoElement>(null);
  const cinemaAudioRef = useRef<HTMLAudioElement>(null);

  // Group presets by category
  const groupedPresets = useMemo(() => {
    return presets.reduce((acc, preset) => {
      const cat = preset.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(preset);
      return acc;
    }, {} as Record<string, VideoPreset[]>);
  }, [presets]);

  useEffect(() => {
    loadPresets();
    // Load Project Data if coming from Script Generator
    if (location.state?.project) {
        const proj = location.state.project as Project;
        setCurrentProject(proj);
        setTopic(proj.title);
        
        if (proj.data && proj.data.storyboard) {
           // If storyboard exists, load it
           setStoryboard(proj.data.storyboard);
           // Set asset if available in project data
           if (proj.data.referenceImage) {
              setReferenceImage(proj.data.referenceImage);
           }
        } else if (proj.data && proj.data.result) {
           // Backward compatibility
        }
    }

    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true); 
      }
    };
    checkKey();
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [location]);

  const loadPresets = async () => {
    const data = await storageService.getVideoPresets();
    setPresets(data);
  };

  // --- CINEMA MODE PLAYBACK ENGINE ---
  useEffect(() => {
    if (isCinemaMode && cinemaVideoRef.current && storyboard && storyboard.scenes) {
      const currentScene = storyboard.scenes[currentSceneIndex];
      
      // Ensure elements are ready
      const vid = cinemaVideoRef.current;
      const aud = cinemaAudioRef.current;

      if (currentScene && currentScene.video_url) {
        vid.src = currentScene.video_url;
        vid.play().catch(e => console.warn("Autoplay blocked", e));
        
        // Sync Audio
        if (aud && currentScene.audio_url) {
          aud.src = currentScene.audio_url;
          aud.currentTime = 0;
          aud.play().catch(e => console.warn("Audio play blocked", e));
        } else if (aud) {
           aud.pause();
           aud.src = "";
        }
      }
    }
  }, [isCinemaMode, currentSceneIndex, storyboard]);

  const handleVideoEnded = () => {
    if (!storyboard || !storyboard.scenes) return;
    if (currentSceneIndex < storyboard.scenes.length - 1) {
      // Smooth transition
      setCurrentSceneIndex(prev => prev + 1);
    }
  };

  const openCinemaMode = () => {
    setCurrentSceneIndex(0);
    setIsCinemaMode(true);
  };

  const handleDownloadAll = () => {
    if (!storyboard || !storyboard.scenes) return;
    storyboard.scenes.forEach((scene) => {
      if (scene.video_url) {
        const a = document.createElement('a');
        a.href = scene.video_url;
        a.download = `scene_${scene.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  };

  const handleSendToPost = async () => {
     if (!storyboard || !currentProject) return;
     
     // Save state
     const updatedProject: Project = {
        ...currentProject,
        status: 'completed',
        data: {
           ...currentProject.data,
           storyboard,
           stage: 'post_production'
        }
     };
     
     await storageService.saveProject(updatedProject);
     navigate('/post', { state: { project: updatedProject } });
  };

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      setReferenceImage({ data: base64Data, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const openLibrary = async () => {
    const chars = await storageService.getCharacters();
    setLibraryCharacters(chars);
    setShowLibraryModal(true);
  };

  const selectFromLibrary = (char: SavedCharacter) => {
    const base64Data = char.imageBase64.split(',')[1];
    setReferenceImage({ data: base64Data, mimeType: 'image/jpeg' });
    setShowLibraryModal(false);
  };

  const updateScene = (id: number, updates: Partial<StoryboardScene>) => {
    setStoryboard(prev => {
      if (!prev || !prev.scenes) return prev;
      const updated = {
        ...prev,
        scenes: prev.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
      };
      
      // Auto-save progress to project if it exists
      if (currentProject) {
         const newProj = { ...currentProject, data: { ...currentProject.data, storyboard: updated } };
         storageService.saveProject(newProj); // Fire and forget save
      }
      return updated;
    });
  };

  const toggleViralMode = () => {
     const isViral = videoConfig.mode === 'viral_shorts';
     setVideoConfig({
        ...videoConfig,
        mode: isViral ? 'cinematic' : 'viral_shorts',
        aspectRatio: isViral ? '16:9' : '9:16'
     });
  };

  // --- SETTINGS HANDLERS ---
  const handleTotalDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTargetDuration(val);
    if (val !== 'custom') {
        const totalSec = parseInt(val);
        const clipSec = parseInt(videoConfig.duration || '5s');
        const count = Math.max(1, Math.ceil(totalSec / clipSec));
        setVideoConfig(prev => ({ ...prev, sceneCount: count }));
    }
  };

  const handleClipDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDuration = e.target.value as '5s' | '10s';
    
    let newCount = videoConfig.sceneCount;
    if (targetDuration !== 'custom') {
        const totalSec = parseInt(targetDuration);
        const clipSec = parseInt(newDuration);
        newCount = Math.max(1, Math.ceil(totalSec / clipSec));
    }
    
    setVideoConfig(prev => ({ ...prev, duration: newDuration, sceneCount: newCount }));
  };

  const handleSceneCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetDuration('custom'); 
    setVideoConfig({...videoConfig, sceneCount: parseInt(e.target.value)});
  };

  // --- PRESETS ---
  const handleSavePreset = async () => {
    const name = prompt("Enter preset name:");
    if (!name) return;
    const category = prompt("Enter category (e.g. Social, Cinematic, Draft):", "General") || "General";

    const newPreset: VideoPreset = {
      id: Date.now().toString(),
      name,
      category,
      config: videoConfig,
      createdAt: Date.now()
    };
    await storageService.saveVideoPreset(newPreset);
    loadPresets();
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setVideoConfig(preset.config);
    }
  };

  const handleGenerateAudio = async (scene: StoryboardScene) => {
    if (isWorking || !audioContextRef.current || !scene.audio_script) return;
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    setIsWorking(true);
    try {
      const gender = scene.voice_gender || 'Female';
      const voiceName = gender === 'Male' ? 'Puck' : 'Kore'; // Use Kore for Female/Default

      const buffer = await generateSpeech(scene.audio_script, voiceName, audioContextRef.current);
      const blob = bufferToWave(buffer, buffer.length);
      const audioUrl = URL.createObjectURL(blob);
      
      updateScene(scene.id, { audio_url: audioUrl });
    } catch (e) {
      console.error("Audio gen error", e);
      alert("Failed to generate audio");
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerateThumbnail = async (scene: StoryboardScene) => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const imageUrl = await generateSceneImage(scene.prompt_optimized, videoConfig.aspectRatio);
      updateScene(scene.id, { thumbnail_url: imageUrl });
    } catch (e) {
      console.error(e);
      alert("Thumbnail generation failed");
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerateAllThumbnails = async () => {
    if (!storyboard || isWorking) return;
    setIsWorking(true);
    setPausedDueToQuota(false);
    setCurrentPhase("Generating Thumbnails...");

    // Sequential generation to avoid rate limits
    for (const scene of storyboard.scenes) {
       if (scene.thumbnail_url || scene.video_url) continue;
       try {
          const imageUrl = await generateSceneImage(scene.prompt_optimized, videoConfig.aspectRatio);
          updateScene(scene.id, { thumbnail_url: imageUrl });
       } catch (e) {
          console.error("Failed thumb for scene " + scene.id, e);
          // Continue to next even if one fails
       }
       await new Promise(resolve => setTimeout(resolve, 1000)); // Slight delay
    }
    setIsWorking(false);
  };

  const processBatchQueue = async (scenes: StoryboardScene[]) => {
    // IMPORTANT: STRICTLY SEQUENTIAL PROCESSING (Concurrency = 1)
    // This prevents 429 RESOURCE_EXHAUSTED errors from Google Veo API
    
    for (const scene of scenes) {
      // Check if we should stop due to previous errors
      if (pausedDueToQuota) break;

      try {
        updateScene(scene.id, { status: 'generating' });

        // 1. Generate Video (Veo)
        const videoPromise = generateVideo(
          scene.prompt_optimized, 
          () => {},
          referenceImage ? [referenceImage] : [], // Consistency Asset
          videoConfig
        );
        
        // 2. Generate Audio (TTS)
        let audioPromise = Promise.resolve<string | null>(null);
        if (scene.audio_script && audioContextRef.current) {
           const gender = scene.voice_gender || 'Female';
           const voiceName = gender === 'Male' ? 'Puck' : 'Kore';
           
           audioPromise = generateSpeech(scene.audio_script, voiceName, audioContextRef.current)
              .then(buffer => {
                 const blob = bufferToWave(buffer, buffer.length);
                 return URL.createObjectURL(blob);
              })
              .catch(e => {
                 console.error("Audio gen failed", e);
                 return null;
              });
        }

        const [videoUrl, audioUrl] = await Promise.all([videoPromise, audioPromise]);
        
        updateScene(scene.id, { 
           status: videoUrl ? 'completed' : 'error',
           video_url: videoUrl || undefined,
           audio_url: audioUrl || undefined
        });

      } catch (error: any) {
        console.error(`Failed to render scene ${scene.id}`, error);
        
        // SMART PAUSE ON QUOTA ERROR
        const msg = error.message || "";
        if (msg === "QUOTA_EXCEEDED" || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
           setPausedDueToQuota(true);
           updateScene(scene.id, { status: 'pending' }); // Reset to pending to try later
           alert(t('errors.quota_exceeded'));
           break; // Stop the queue immediately
        } else {
           updateScene(scene.id, { status: 'error' });
        }
      }

      // COOL DOWN DELAY: 5 Seconds between requests
      if (!pausedDueToQuota) {
         await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!topic.trim()) return;
    
    if (window.aistudio && !hasKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }

    setIsWorking(true);
    setStoryboard(null);
    setCurrentPhase(t('agent.phase_script'));

    try {
      const generatedStoryboard = await generateStoryboard(
         topic, 
         language, 
         videoConfig.sceneCount, 
         videoConfig.mode
      );
      setStoryboard(generatedStoryboard);
      setIsWorking(false);
      
      // Create a project if not already existing
      if (!currentProject) {
         const newProj: Project = {
            id: Date.now().toString(),
            title: generatedStoryboard.title || topic,
            type: 'video',
            status: 'draft',
            createdAt: Date.now(),
            data: {
               storyboard: generatedStoryboard,
               stage: 'production'
            }
         };
         await storageService.saveProject(newProj);
         setCurrentProject(newProj);
      }

    } catch (error: any) {
      console.error("Agent error:", error);
      let msg = error.message;
      if (msg === "QUOTA_EXCEEDED") alert(t('errors.quota_exceeded'));
      else if (msg === "API_KEY_INVALID") alert(t('errors.api_key_invalid'));
      else alert(t('errors.generic_error'));
      setIsWorking(false);
    }
  };

  const handleStartProduction = async () => {
    if (!storyboard || !storyboard.scenes) return;
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    setIsWorking(true);
    setPausedDueToQuota(false);
    setCurrentPhase(t('agent.phase_production'));

    try {
      const pendingScenes = storyboard.scenes.filter(s => s.status !== 'completed');
      await processBatchQueue(pendingScenes);
      
      if (!pausedDueToQuota) {
         setCurrentPhase(t('agent.phase_assembly'));
         setTimeout(() => setIsWorking(false), 1000);
      } else {
         setIsWorking(false);
      }
    } catch (error) {
      console.error("Production error:", error);
      setIsWorking(false);
    }
  };

  const handleRegenerateScene = async (scene: StoryboardScene) => {
    if (isWorking || !audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }
    
    setIsWorking(true);
    setPausedDueToQuota(false);
    try {
        // Force status to pending so queue picks it up as fresh
        updateScene(scene.id, { status: 'pending' });
        await processBatchQueue([scene]);
    } finally {
        setIsWorking(false);
    }
  };

  // Safe map checking
  const scenes = storyboard?.scenes || [];
  const allCompleted = scenes.length > 0 && scenes.every(s => s.status === 'completed');
  const hasAnyVideo = scenes.some(s => s.video_url);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* LIBRARY MODAL */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
           <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center">
                    <Users className="mr-2 text-brand-400" /> {t('video.select_from_lib')}
                 </h3>
                 <button onClick={() => setShowLibraryModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {libraryCharacters.map(char => (
                    <div key={char.id} className="relative group bg-gray-950 border border-gray-800 rounded-lg overflow-hidden hover:border-brand-500 transition-colors cursor-pointer" onClick={() => selectFromLibrary(char)}>
                       <img src={char.imageBase64} className="w-full h-32 object-cover" alt={char.name} />
                       <div className="p-2">
                          <p className="text-xs font-bold text-white truncate">{char.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{char.style}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl font-bold text-white flex items-center">
               <Bot className="mr-3 text-brand-400" /> {t('agent.title')}
             </h1>
             {/* Gemini 3.0 Badge */}
             <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center border border-white/10">
                <BrainCircuit size={12} className="mr-1" /> Gemini 3.0 Core
             </div>
          </div>
          <p className="text-gray-400 mt-1 max-w-2xl">{t('agent.desc')}</p>
        </div>
        {/* Viral Mode Toggle */}
        <button 
          onClick={toggleViralMode}
          className={`
             flex items-center px-4 py-2 rounded-full border text-xs font-bold transition-all shadow-lg
             ${videoConfig.mode === 'viral_shorts' 
               ? 'bg-red-600 text-white border-red-400 shadow-red-900/50' 
               : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}
          `}
        >
           <Zap size={14} className={`mr-2 ${videoConfig.mode === 'viral_shorts' ? 'fill-current' : ''}`} />
           {t('agent.viral_mode')}
        </button>
      </div>

      {/* Input Control */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Bot size={120} />
        </div>
        
        <div className="relative z-10 space-y-4">
          
          {/* Main Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{t('agent.input_label')}</label>
            <input
              type="text"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder={t('agent.input_placeholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isWorking || !!storyboard} // Disable if storyboard generated to prevent overwrite
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center text-xs text-gray-400 hover:text-brand-400 transition-colors mb-2"
            >
              <Settings2 size={14} className="mr-1" />
              {t('agent.settings_title')}
              {showSettings ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
            </button>
            
            {showSettings && (
              <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                 
                 {/* Presets Section */}
                 <div className="col-span-full flex gap-2 items-center mb-2 border-b border-gray-800 pb-2">
                    <select 
                      onChange={(e) => handleLoadPreset(e.target.value)} 
                      className="flex-1 bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-white"
                    >
                      <option value="">Load Preset...</option>
                      {Object.entries(groupedPresets).map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {(items as VideoPreset[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <button 
                      onClick={handleSavePreset} 
                      className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-white"
                      title="Save Current as Preset"
                    >
                      <Save size={14} />
                    </button>
                 </div>

                 {/* Target Duration */}
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">{t('agent.target_duration')}</label>
                    <select
                       value={targetDuration}
                       onChange={handleTotalDurationChange}
                       className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                    >
                       <option value="custom">Custom</option>
                       <option value="15">15s (Shorts)</option>
                       <option value="30">30s (Spot)</option>
                       <option value="60">60s (1 Min)</option>
                       <option value="90">90s (Story)</option>
                    </select>
                 </div>

                 {/* Clip Duration */}
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">{t('agent.clip_duration')}</label>
                    <select 
                       value={videoConfig.duration || '5s'}
                       onChange={handleClipDurationChange}
                       className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                    >
                       <option value="5s">5s (Standard)</option>
                       <option value="10s">10s (Extended)</option>
                    </select>
                 </div>
                 
                 {/* Resolution */}
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Resolution</label>
                    <select 
                       value={videoConfig.resolution}
                       onChange={(e) => setVideoConfig({...videoConfig, resolution: e.target.value as any})}
                       className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                    >
                       <option value="720p">720p (HD)</option>
                       <option value="1080p">1080p (FHD)</option>
                    </select>
                 </div>

                 {/* Aspect Ratio */}
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Aspect Ratio</label>
                    <select 
                       value={videoConfig.aspectRatio}
                       onChange={(e) => setVideoConfig({...videoConfig, aspectRatio: e.target.value as any})}
                       className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                    >
                       <option value="16:9">16:9 (Landscape)</option>
                       <option value="9:16">9:16 (Portrait/Shorts)</option>
                       <option value="1:1">1:1 (Square)</option>
                    </select>
                 </div>

                 {/* Scene Count Slider */}
                 <div className="md:col-span-full pt-2 border-t border-gray-800">
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex justify-between">
                       {t('agent.scene_count')}
                       <span className="text-brand-400">{videoConfig.sceneCount}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      step="1"
                      value={videoConfig.sceneCount}
                      onChange={handleSceneCountChange}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between mt-1">
                        <p className="text-[10px] text-gray-500">{t('agent.batch_info')}</p>
                        <p className="text-[10px] text-gray-400">Total Est: {videoConfig.sceneCount * parseInt(videoConfig.duration || '5s')}s</p>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Asset & Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
             {/* Asset Uploader with Library Option */}
             <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between">
                   <span className="text-xs text-gray-400 font-medium">{t('agent.add_asset')}</span>
                   <button 
                      onClick={openLibrary}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center"
                   >
                      <Users size={12} className="mr-1"/> Library
                   </button>
                </div>
                
                <div 
                  className={`
                    flex-1 border-2 border-dashed rounded-lg flex items-center justify-center p-2 transition-colors relative min-h-[60px]
                    ${referenceImage ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 cursor-pointer'}
                  `}
                  onClick={() => !referenceImage && assetInputRef.current?.click()}
                >
                  {referenceImage ? (
                    <div className="flex items-center w-full px-2">
                      <img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} className="h-10 w-10 object-cover rounded border border-gray-600 mr-3" alt="Asset" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-400">Asset Loaded</p>
                        <p className="text-[10px] text-gray-400 truncate">Applied to all scenes</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setReferenceImage(undefined); }}
                        className="p-2 text-gray-400 hover:text-red-400"
                        title={t('agent.remove_asset')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 py-1">
                      <div className="flex items-center">
                         <Upload size={14} className="mr-2" />
                         <span className="text-xs">Upload Actor/Product (Consistency)</span>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={assetInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAssetUpload}
                  />
                </div>
             </div>

             {/* Start Buttons */}
             <div className="flex flex-col gap-2 min-w-[200px]">
                 {!storyboard ? (
                     <button
                      onClick={handleGenerateStoryboard}
                      disabled={isWorking || !topic}
                      className={`
                        flex-1 px-8 rounded-lg font-bold text-white flex items-center justify-center whitespace-nowrap transition-all h-[60px]
                        ${isWorking 
                          ? 'bg-gray-800 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95'}
                      `}
                    >
                      {isWorking ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" /> {t('agent.btn_working')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2" /> {t('agent.btn_generate_storyboard')}
                        </>
                      )}
                    </button>
                 ) : (
                    <button
                      onClick={handleStartProduction}
                      disabled={isWorking || allCompleted || pausedDueToQuota}
                      className={`
                         flex-1 px-8 rounded-lg font-bold text-white flex items-center justify-center whitespace-nowrap transition-all h-[60px]
                         ${isWorking || allCompleted
                           ? 'bg-gray-800 cursor-not-allowed opacity-50' 
                           : pausedDueToQuota 
                              ? 'bg-orange-600 hover:bg-orange-500' 
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95'}
                      `}
                    >
                       {isWorking ? <Loader2 className="animate-spin mr-2"/> : <Film className="mr-2"/>}
                       {pausedDueToQuota ? "Resume Production" : t('agent.btn_start_production')}
                    </button>
                 )}
             </div>
          </div>
          
          {isWorking && (
            <div className="flex items-center text-brand-400 animate-pulse pt-2">
              <div className="w-2 h-2 bg-brand-400 rounded-full mr-2"></div>
              <span className="text-sm font-medium font-mono">{currentPhase}</span>
            </div>
          )}
          
          {pausedDueToQuota && (
             <div className="bg-orange-900/20 border border-orange-500/50 text-orange-400 p-3 rounded-lg text-sm flex items-center">
                <AlertTriangle size={16} className="mr-2"/>
                {t('errors.quota_exceeded')}
             </div>
          )}
        </div>
      </div>

      {/* Timeline / Results */}
      {storyboard && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{storyboard.title || 'Untitled Project'}</h2>
              <div className="flex items-center mt-1">
                 <span className="text-xs text-gray-500 uppercase tracking-wider border border-gray-800 px-2 py-1 rounded mr-2">
                  {storyboard.style}
                </span>
                {videoConfig.mode === 'viral_shorts' && (
                   <span className="text-xs text-red-400 uppercase tracking-wider border border-red-900/50 px-2 py-1 rounded mr-2 flex items-center">
                      <Zap size={10} className="mr-1" /> Viral Mode
                   </span>
                )}
              </div>
            </div>

            {/* Assembly Action */}
            <div className="flex gap-2">
              {!isWorking && !allCompleted && (
                 <button
                    onClick={handleGenerateAllThumbnails}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center transition-colors"
                 >
                    <ImageIcon size={14} className="mr-1" /> Generate All Previews
                 </button>
              )}
              {hasAnyVideo && !isWorking && (
                <>
                  <button
                    onClick={handleSendToPost}
                    className="bg-gray-800 text-white hover:bg-gray-700 px-4 py-2 rounded-lg font-bold flex items-center shadow-lg transition-colors border border-gray-700"
                  >
                    <Edit2 className="mr-2" size={18} />
                    To Editor
                  </button>
                  <button
                    onClick={openCinemaMode}
                    className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg font-bold flex items-center shadow-lg transition-colors"
                  >
                    <Clapperboard className="mr-2" size={18} />
                    {t('agent.btn_assemble')}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <div 
                key={scene.id} 
                className={`
                  bg-gray-900 border rounded-xl overflow-hidden transition-all duration-300 flex flex-col
                  ${scene.status === 'completed' ? 'border-emerald-500/30 shadow-emerald-900/10' : 'border-gray-800'}
                  ${scene.status === 'generating' ? 'ring-2 ring-brand-500/50' : ''}
                `}
              >
                {/* Video/Image Player Area */}
                <div className={`bg-black relative flex items-center justify-center group ${videoConfig.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                  {scene.status === 'completed' && scene.video_url ? (
                    <video 
                      src={scene.video_url} 
                      controls 
                      className="w-full h-full object-cover" 
                    />
                  ) : scene.thumbnail_url ? (
                     // Thumbnail Image
                     <div className="relative w-full h-full group">
                       <img src={scene.thumbnail_url} className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                       <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">Preview</div>
                     </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      {scene.status === 'generating' ? (
                        <>
                          <Loader2 className="animate-spin text-brand-500 mb-3" size={32} />
                          <span className="text-xs text-brand-400 font-mono animate-pulse">{t('agent.status_generating')}</span>
                        </>
                      ) : scene.status === 'error' ? (
                        <div className="text-red-400">
                          <AlertTriangle className="mb-2 mx-auto" />
                          <span className="text-xs">{t('agent.status_error')}</span>
                        </div>
                      ) : (
                        <Film className="text-gray-800" size={48} />
                      )}
                    </div>
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10 z-10">
                    {t('agent.scene_card')} {scene.id}
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold text-white">Scene {scene.id}</h3>
                      <div className="flex gap-1">
                         {!scene.video_url && (
                            <button 
                               onClick={() => handleGenerateThumbnail(scene)}
                               className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-blue-400 disabled:opacity-50"
                               title="Generate Preview Image"
                               disabled={isWorking}
                            >
                               <ImageIcon size={14}/>
                            </button>
                         )}
                         <button 
                            onClick={() => setEditingSceneId(editingSceneId === scene.id ? null : scene.id)}
                            className={`p-1.5 rounded hover:bg-gray-800 ${editingSceneId === scene.id ? 'text-brand-400' : 'text-gray-500'}`}
                            title={t('agent.edit_prompt')}
                         >
                             <Edit2 size={14}/>
                         </button>
                         <button 
                             onClick={() => handleRegenerateScene(scene)}
                             className="p-1.5 rounded hover:bg-brand-900/50 text-brand-500 hover:text-brand-400 disabled:opacity-50"
                             title={t('agent.generate_scene')}
                             disabled={isWorking}
                         >
                             <RefreshCw size={14}/>
                         </button>
                      </div>
                  </div>

                  <div className="mb-3">
                    {editingSceneId === scene.id ? (
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Prompt</label>
                            <textarea 
                                value={scene.prompt_optimized} 
                                onChange={(e) => updateScene(scene.id, {prompt_optimized: e.target.value})}
                                className="w-full bg-gray-950 text-xs text-white p-2 rounded border border-gray-700 h-24 focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                            <button 
                                onClick={() => setEditingSceneId(null)}
                                className="w-full bg-gray-800 text-xs text-white py-1 rounded hover:bg-gray-700"
                            >
                                {t('agent.save_prompt') || 'Save'}
                            </button>
                        </div>
                    ) : (
                        <>
                           <p className="text-xs text-gray-400 line-clamp-3 mb-2 cursor-pointer hover:text-white" onClick={() => setEditingSceneId(scene.id)} title={scene.prompt_optimized}>
                              {scene.prompt_optimized} 
                           </p>
                           <div className="flex items-center text-[10px] text-gray-500">
                             <Video size={10} className="mr-1" /> {t('agent.camera')}: {scene.camera_angle}
                           </div>
                        </>
                    )}
                  </div>

                  {/* Audio Script Display */}
                  {scene.audio_script && editingSceneId !== scene.id && (
                     <div className="mb-3 bg-gray-950 p-2 rounded border border-gray-800 flex items-start">
                        <Mic size={12} className="mr-2 mt-0.5 text-brand-400 flex-shrink-0" />
                        <p className="text-xs text-gray-400 italic line-clamp-2">"{scene.audio_script}"</p>
                     </div>
                  )}
                  
                  {/* Status Footer */}
                  <div className="mt-auto pt-3 border-t border-gray-800 flex justify-between items-center">
                    <div className="flex items-center">
                        {scene.audio_url ? (
                            <button 
                                onClick={() => {
                                    const a = new Audio(scene.audio_url);
                                    a.play();
                                }}
                                className="flex items-center text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                            >
                               <Volume2 size={12} className="mr-1.5" /> Play Audio
                            </button>
                        ) : (
                            <span className="text-[10px] text-gray-600 flex items-center">
                               <MicOff size={10} className="mr-1"/> No Audio
                            </span>
                        )}
                    </div>
                    
                    <button
                        onClick={() => handleGenerateAudio(scene)}
                        disabled={isWorking || !scene.audio_script}
                        className="flex items-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                        title={`Generate Voiceover (${scene.voice_gender === 'Male' ? 'Puck' : 'Kore'})`}
                    >
                        <Mic size={10} className="mr-1" /> {scene.audio_url ? 'Regen' : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cinema Mode Modal (Assembly View) */}
      {isCinemaMode && storyboard && storyboard.scenes && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fadeIn">
          
          {/* Hidden Audio Player for Assembly Sync */}
          <audio ref={cinemaAudioRef} className="hidden" />

          {/* Cinema Controls */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center">
                <Sparkles className="text-brand-400 mr-2" size={20} /> 
                {t('agent.assembly_title')}
              </h3>
              <p className="text-gray-400 text-xs">{storyboard.title}</p>
            </div>
            <button 
              onClick={() => setIsCinemaMode(false)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Player */}
          <div className="flex-1 flex items-center justify-center relative">
             {storyboard.scenes[currentSceneIndex]?.video_url ? (
               <video 
                 ref={cinemaVideoRef}
                 className="w-full h-full object-contain"
                 controls={false}
                 onEnded={handleVideoEnded}
                 playsInline
               />
             ) : storyboard.scenes[currentSceneIndex]?.thumbnail_url ? (
                <img 
                   src={storyboard.scenes[currentSceneIndex].thumbnail_url}
                   className="w-full h-full object-contain"
                />
             ) : (
               <div className="text-gray-500 flex flex-col items-center">
                 <AlertTriangle size={48} className="mb-4" />
                 <p>Video source unavailable for Scene {currentSceneIndex + 1}</p>
                 <button 
                   onClick={handleVideoEnded} 
                   className="mt-4 flex items-center text-white hover:underline"
                 >
                   Skip <SkipForward size={16} className="ml-1"/>
                 </button>
               </div>
             )}
             
             {/* Playback Overlay Info */}
             <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full text-white text-xs">
                Scene {currentSceneIndex + 1} of {storyboard.scenes.length}
             </div>
          </div>

          {/* Timeline Strip */}
          <div className="h-28 bg-gray-900 border-t border-gray-800 flex items-center px-6 gap-4 overflow-x-auto">
             {storyboard.scenes.map((scene, idx) => (
               <button 
                 key={scene.id}
                 onClick={() => setCurrentSceneIndex(idx)}
                 className={`
                    flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 relative transition-all
                    ${currentSceneIndex === idx ? 'border-brand-500 scale-105' : 'border-gray-700 opacity-50 hover:opacity-80'}
                 `}
               >
                 {scene.video_url ? (
                   <video src={scene.video_url} className="w-full h-full object-cover" />
                 ) : scene.thumbnail_url ? (
                   <img src={scene.thumbnail_url} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                     <span className="text-xs text-gray-500">{idx + 1}</span>
                   </div>
                 )}
                 {scene.audio_url && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-brand-400 rounded-full shadow-sm" title="Has Audio"></div>
                 )}
                 <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-1 truncate">
                   {t('agent.scene_card')} {scene.id}
                 </div>
               </button>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDirector;
