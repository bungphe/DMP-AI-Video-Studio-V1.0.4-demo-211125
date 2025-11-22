
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Film, Play, Download, AlertTriangle, ExternalLink, KeyRound, Upload, User, Wand2, ImagePlus, ArrowRight, CheckCircle2, Sparkles, Mic, Music, StopCircle, UserCheck, Settings, Users, Save, X, Trash2, Plus, Image as ImageIcon, Camera, Zap, Palette, Move, Sun, Layers, Settings2, Video, History, Eye, EyeOff, Smartphone, Heart, MessageCircle, Share2, Timer, Loader2, Bookmark } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { generateVideo, createCharacterFromImage, enhanceVideoPrompt, generateSpeech, bufferToWave } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { CharacterStyles, AIVoices, VideoConfig, SavedCharacter, Project, VideoPreset } from '../types';

const VideoGenerator: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  
  // Mode: 'video' | 'character' | 'lipsync' | 'digital_human'
  const [activeTab, setActiveTab] = useState<'video' | 'character' | 'lipsync' | 'digital_human'>('video');

  // General State
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  // Video Gen State
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [statusCode, setStatusCode] = useState(''); 
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  // Loading Visual State
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentTip, setCurrentTip] = useState(0);
  
  // Reference Images (Array for context/assets)
  const [referenceImages, setReferenceImages] = useState<{ data: string, mimeType: string, id: string, label?: 'character' | 'context' }[]>([]);
  const uploadTypeRef = useRef<'character' | 'context'>('character'); // Track which button was clicked
  
  // Advanced Settings State
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    resolution: '720p',
    aspectRatio: '16:9',
    fps: '24',
    duration: '5s',
    sceneCount: 1
  });
  
  const [renderSettings, setRenderSettings] = useState({
    lighting: 'cinematic',
    camera: 'static',
    style: 'realistic'
  });
  
  const [showVideoSettings, setShowVideoSettings] = useState(true);
  const [presets, setPresets] = useState<VideoPreset[]>([]);

  // Character Gen State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [charStyle, setCharStyle] = useState('3d_render');
  const [generatedCharUrl, setGeneratedCharUrl] = useState<string | null>(null);
  const [charStatus, setCharStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lip Sync State
  const [lsScript, setLsScript] = useState('');
  const [lsVoice, setLsVoice] = useState(AIVoices[1].id);
  const [lsImage, setLsImage] = useState<string | null>(null);
  const [lsVideoUrl, setLsVideoUrl] = useState<string | null>(null);
  const [lsAudioUrl, setLsAudioUrl] = useState<string | null>(null);
  const [lsStatus, setLsStatus] = useState('');
  
  const lsVideoRef = useRef<HTMLVideoElement>(null);
  const lsAudioRef = useRef<HTMLAudioElement>(null);
  const lsInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Digital Human / Recorder State ---
  const [dhStep, setDhStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [dhStatus, setDhStatus] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Library State ---
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryCharacters, setLibraryCharacters] = useState<SavedCharacter[]>([]);
  const [libraryTarget, setLibraryTarget] = useState<'ref' | 'ls' | 'dh' | 'none'>('none'); // Where to inject selection

  // --- Prompt History & UI Overlay ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [showSafeZone, setShowSafeZone] = useState(false);

  const LOADING_TIPS = [
    "AI is analyzing your scene composition...",
    "Setting up cinematic lighting...",
    "Calculating camera movement...",
    "Rendering high-fidelity textures...",
    "Applying color grading...",
    "Polishing pixels...",
    "Almost there, finalizing output...",
    "Checking for visual consistency..."
  ];

  // Group presets by category
  const groupedPresets = useMemo(() => {
    return presets.reduce((acc, preset) => {
      const cat = preset.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(preset);
      return acc;
    }, {} as Record<string, VideoPreset[]>);
  }, [presets]);

  // Effect to load history
  useEffect(() => {
     if(showHistory) {
        storageService.getPromptHistory().then(items => setHistoryItems(items.reverse().slice(0, 10)));
     }
  }, [showHistory]);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const data = await storageService.getVideoPresets();
    setPresets(data);
  };

  // Effect for Loading Timer & Tips
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let tipInterval: ReturnType<typeof setInterval>;

    if (loading) {
      setTimeLeft(60); // Start countdown from 60s (approx Veo generation time)
      setCurrentTip(0);
      
      interval = setInterval(() => {
        setTimeLeft((prev) => {
           if (prev <= 1) return 1; // Stay at 1s if it takes longer
           return prev - 1;
        });
      }, 1000);

      tipInterval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 4000); // Change tip every 4s
    }

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, [loading]);

  // Effect for Auto-play Main Video
  useEffect(() => {
    if (videoUrl && videoPreviewRef.current) {
      videoPreviewRef.current.load(); // Ensure source is loaded
      const playPromise = videoPreviewRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Main Video Auto-play prevented:", error);
        });
      }
    }
  }, [videoUrl]);

  // Effect for Auto-play LipSync Video
  useEffect(() => {
    if (lsVideoUrl && lsVideoRef.current) {
      lsVideoRef.current.load();
      const playPromise = lsVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("LipSync Video Auto-play prevented:", error);
        });
      }
      
      if (lsAudioUrl && lsAudioRef.current) {
        lsAudioRef.current.load();
        const audioPlayPromise = lsAudioRef.current.play();
        if (audioPlayPromise !== undefined) {
          audioPlayPromise.catch(error => {
            console.warn("LipSync Audio Auto-play prevented:", error);
          });
        }
      }
    }
  }, [lsVideoUrl, lsAudioUrl]);

  // Check for prompt from navigation state or Project load
  useEffect(() => {
    // Check for project passed via navigation state
    if (location.state?.project) {
        const proj = location.state.project as Project;
        setCurrentProjectId(proj.id);
        
        if (proj.type === 'video' && proj.data) {
            // Populate fields
            setPrompt(proj.data.prompt || '');
            if (proj.data.videoUrl) setVideoUrl(proj.data.videoUrl);
            if (proj.data.videoConfig) setVideoConfig(proj.data.videoConfig);
            if (proj.data.renderSettings) setRenderSettings(proj.data.renderSettings);
            if (proj.data.referenceImages) setReferenceImages(proj.data.referenceImages);
            setActiveTab('video');
        } else if (proj.type === 'script') {
            // If loading a script project, maybe we want to start generating based on it
            // Keep ID to link assets later
        }
    } 
    
    // Check for simple props
    if (location.state?.prompt) {
      setPrompt(location.state.prompt);
      setActiveTab('video');
    }
    if (location.state?.projectId) {
        setCurrentProjectId(location.state.projectId);
    }
  }, [location]);

  const checkKeySelection = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true); 
      }
    } catch (e) {
      console.warn("Error checking key selection:", e);
      setHasKey(true); // Fail open for dev/test
    }
  };

  useEffect(() => {
    checkKeySelection();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to open key selection", e);
      }
    } else {
      console.warn("AI Studio environment not detected.");
      setHasKey(true);
    }
  };

  // --- FILE UPLOAD HANDLER ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'char' | 'ls') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'ref') {
      const fileArray = Array.from(files) as File[];
      const remainingSlots = 3 - referenceImages.length;
      const filesToProcess = fileArray.slice(0, remainingSlots);
      
      if (filesToProcess.length === 0 && referenceImages.length >= 3) {
          alert("Maximum 3 reference images allowed.");
          return;
      }

      const currentLabel = uploadTypeRef.current;

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          setReferenceImages(prev => [
            ...prev, 
            { 
              data: base64Data, 
              mimeType: file.type, 
              id: Date.now() + Math.random().toString(),
              label: currentLabel 
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'char') {
          setUploadedImage(base64);
        } else if (type === 'ls') {
          setLsImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeReferenceImage = (id: string) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  };
  
  const triggerRefUpload = (type: 'character' | 'context') => {
     uploadTypeRef.current = type;
     const input = document.getElementById('ref-upload') as HTMLInputElement;
     if(input) input.click();
  };

  // --- LIBRARY FUNCTIONS ---
  const saveToLibrary = async () => {
    if (!generatedCharUrl) return;

    const name = prompt(t('video.char_name_prompt'));
    if (!name) return;
    
    const newChar: SavedCharacter = {
      id: Date.now().toString(),
      name,
      imageBase64: generatedCharUrl,
      style: charStyle,
      defaultVoiceId: activeTab === 'lipsync' ? lsVoice : undefined,
      createdAt: Date.now()
    };

    await storageService.saveCharacter(newChar);
    alert(t('video.save_success'));
  };

  const handleSaveProject = async () => {
      if (!videoUrl && !prompt) return;
      
      try {
          const project: Project = {
              id: currentProjectId || Date.now().toString(),
              title: prompt.substring(0, 30) || 'Untitled Video',
              status: videoUrl ? 'completed' : 'processing',
              type: 'video',
              createdAt: currentProjectId ? undefined : Date.now(),
              previewUrl: videoUrl || undefined,
              data: {
                  prompt,
                  videoUrl,
                  videoConfig,
                  renderSettings,
                  referenceImages,
                  stage: videoUrl ? 'post_production' : 'production' // Auto-advance stage based on result
              }
          };
          await storageService.saveProject(project);
          setCurrentProjectId(project.id);
          alert(`Project saved to ${videoUrl ? 'Post-Production' : 'Production'} stage!`);
      } catch(e) {
          console.error("Save failed", e);
          alert("Failed to save project.");
      }
  };

  const openLibrary = async (target: 'ref' | 'ls' | 'dh') => {
    const chars = await storageService.getCharacters();
    setLibraryCharacters(chars);
    setLibraryTarget(target);
    setShowLibraryModal(true);
  };

  const selectFromLibrary = (char: SavedCharacter) => {
    if (libraryTarget === 'ref') {
      if (referenceImages.length < 3) {
         const base64Data = char.imageBase64.split(',')[1];
         setReferenceImages(prev => [...prev, {
           data: base64Data, 
           mimeType: 'image/jpeg',
           id: Date.now().toString(),
           label: 'character' 
         }]);
      } else {
         alert("Max 3 images allowed.");
      }
    } else if (libraryTarget === 'ls') {
      setLsImage(char.imageBase64);
      if (char.defaultVoiceId) {
        setLsVoice(char.defaultVoiceId);
      }
    } else if (libraryTarget === 'dh') {
      setUploadedImage(char.imageBase64);
    }
    setShowLibraryModal(false);
  };

  const deleteFromLibrary = async (id: string) => {
    if(confirm('Delete this character?')) {
       await storageService.deleteCharacter(id);
       const chars = await storageService.getCharacters();
       setLibraryCharacters(chars);
    }
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
      renderSettings,
      createdAt: Date.now()
    };
    await storageService.saveVideoPreset(newPreset);
    loadPresets();
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setVideoConfig(preset.config);
      if (preset.renderSettings) setRenderSettings(preset.renderSettings);
    }
  };

  const handleDeletePreset = async (id: string) => {
      if (confirm("Delete this preset?")) {
          await storageService.deleteVideoPreset(id);
          loadPresets();
      }
  };

  // --- PROMPT ENHANCER ---
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceVideoPrompt(prompt, language);
      setPrompt(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  // --- VIDEO GEN ---
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatusCode('start');
    setError('');
    setVideoUrl(null);
    
    // Save to History
    storageService.savePromptHistory(prompt);

    try {
      await validateKey();
      
      // Construct Prompt with Advanced Settings
      let finalPrompt = prompt;
      if (renderSettings.lighting !== 'cinematic') finalPrompt += `, ${renderSettings.lighting} lighting`;
      if (renderSettings.camera !== 'static') finalPrompt += `, ${renderSettings.camera} camera movement`;
      if (renderSettings.style !== 'realistic') finalPrompt += `, ${renderSettings.style} style`;

      const url = await generateVideo(
        finalPrompt, 
        (code) => setStatusCode(code), 
        referenceImages, 
        videoConfig
      );
      setVideoUrl(url);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setStatusCode('');
    }
  };

  // --- CHARACTER GEN ---
  const handleGenerateCharacter = async () => {
    if (!uploadedImage) return;
    setLoading(true);
    setCharStatus('analyzing');
    setError('');
    setGeneratedCharUrl(null);

    try {
      await validateKey();
      const base64Data = uploadedImage.split(',')[1];
      
      const styleId = activeTab === 'digital_human' ? 'digital_twin' : charStyle;
      const styleName = CharacterStyles.find(s => s.id === styleId)?.name || 'Cinematic';

      const resultUrl = await createCharacterFromImage(
        base64Data, 
        styleName,
        (status) => setCharStatus(status)
      );
      setGeneratedCharUrl(resultUrl);
      
      if (activeTab === 'digital_human') {
          setLsImage(resultUrl);
          setDhStep(2);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setCharStatus('');
    }
  };

  // --- VOICE RECORDER ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setLsAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic Error", e);
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setDhStep(3);
    }
  };

  // --- LIP SYNC / DIGITAL HUMAN GEN ---
  const handleGenerateLipSync = async () => {
    if (!lsImage) return;
    setLoading(true);
    setLsStatus(activeTab === 'digital_human' ? 'Synthesizing Video...' : t('video.lipsync_status_audio'));
    setError('');
    setLsVideoUrl(null);

    try {
      await validateKey();

      if (activeTab === 'lipsync') {
         if (!lsScript) return;
         if (!audioContextRef.current) {
           audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
         }
         const audioBuffer = await generateSpeech(lsScript, lsVoice, audioContextRef.current);
         const audioBlob = bufferToWave(audioBuffer, audioBuffer.length);
         const audioUrl = URL.createObjectURL(audioBlob);
         setLsAudioUrl(audioUrl);
      }

      setLsStatus(t('video.lipsync_status_video'));
      const base64Data = lsImage.split(',')[1];
      const mimeType = lsImage.split(';')[0].split(':')[1];
      
      const speakingPrompt = "Cinematic close-up of this character talking, moving mouth naturally, detailed facial expressions, looking at camera, high quality.";
      
      const videoUrl = await generateVideo(
        speakingPrompt, 
        (code) => {
          if (code === 'rendering') setLsStatus(t('video.still_rendering'));
        }, 
        [{ data: base64Data, mimeType: mimeType }] 
      );
      
      setLsVideoUrl(videoUrl);

    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setLsStatus('');
    }
  };

  const handlePlayLipSync = () => {
    if (lsVideoRef.current && lsAudioRef.current) {
      lsVideoRef.current.currentTime = 0;
      lsAudioRef.current.currentTime = 0;
      lsVideoRef.current.play();
      lsAudioRef.current.play();
    }
  };

  const useCharacterAsActor = () => {
    if (generatedCharUrl) {
      const base64Data = generatedCharUrl.split(',')[1];
      setReferenceImages([{ data: base64Data, mimeType: 'image/jpeg', id: 'actor_' + Date.now(), label: 'character' }]);
      setActiveTab('video');
    }
  };

  const validateKey = async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        if (!selected) {
          await handleSelectKey();
           const recheck = await window.aistudio.hasSelectedApiKey();
           if(!recheck) throw new Error("KEY_NOT_FOUND");
        }
      }
  };

  const handleError = (err: any) => {
    let msg = err.message;
    if (msg === "QUOTA_EXCEEDED") msg = t('errors.quota_exceeded');
    else if (msg === "KEY_NOT_FOUND") {
       msg = t('video.key_required');
       setHasKey(false);
    } else if (msg === "API_KEY_INVALID") msg = t('errors.api_key_invalid');
    else if (msg === "NETWORK_ERROR") msg = t('errors.network_error');
    else if (msg === "CONTENT_POLICY") msg = t('errors.content_policy');
    
    setError(msg || t('video.failed'));
  };

  const getStatusText = (code: string) => {
    if (!code) return '';
    if (t(`video.status.${code}`) !== `video.status.${code}`) return t(`video.status.${code}`);
    return code;
  };

  const selectHistory = (text: string) => {
     setPrompt(text);
     setShowHistory(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      
      {/* --- LIBRARY MODAL --- */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
           <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center">
                    <Users className="mr-2 text-brand-400" /> {t('video.select_from_lib')}
                 </h3>
                 <button onClick={() => setShowLibraryModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {libraryCharacters.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-10">
                       {t('video.no_saved_chars')}
                    </div>
                 ) : (
                    libraryCharacters.map(char => (
                       <div key={char.id} className="relative group bg-gray-950 border border-gray-800 rounded-lg overflow-hidden hover:border-brand-500 transition-colors">
                          <img src={char.imageBase64} className="w-full h-32 object-cover" alt={char.name} />
                          <div className="p-2">
                             <p className="text-xs font-bold text-white truncate">{char.name}</p>
                             <p className="text-[10px] text-gray-500 truncate">{char.style} {char.defaultVoiceId ? `• ${char.defaultVoiceId}` : ''}</p>
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                             <button 
                                onClick={() => selectFromLibrary(char)}
                                className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-500"
                             >
                                Select
                             </button>
                             <button 
                                onClick={() => deleteFromLibrary(char.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Film className="mr-3 text-brand-400" /> {t('video.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('video.desc')}</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-4 mb-8 border-b border-gray-800 overflow-x-auto">
        {[
          { id: 'video', icon: Film, label: t('video.tab_video') },
          { id: 'character', icon: User, label: t('video.tab_character') },
          { id: 'lipsync', icon: Music, label: t('video.tab_lipsync') },
          { id: 'digital_human', icon: UserCheck, label: t('video.tab_digital_human') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-brand-500 text-brand-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300'}
            `}
          >
            <div className="flex items-center"><tab.icon size={16} className="mr-2"/> {tab.label}</div>
          </button>
        ))}
      </div>

      {!hasKey ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10 shadow-2xl shadow-black/50">
          <div className="bg-brand-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-400">
            <KeyRound size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t('video.key_required')}</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {t('video.key_desc')}
          </p>
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={handleSelectKey}
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-brand-900/50 active:scale-95"
            >
              {t('video.btn_select_key')}
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-400 text-sm hover:underline flex items-center"
            >
              {t('video.learn_billing')} <ExternalLink size={14} className="ml-1" />
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-5 space-y-6">
             {/* MAIN VIDEO TAB */}
             {activeTab === 'video' && (
               <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                  <div className="mb-4 relative">
                     <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">{t('video.prompt_label')}</label>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setShowHistory(!showHistory)}
                             className="text-xs text-gray-400 hover:text-white flex items-center"
                             title="Prompt History"
                           >
                              <History size={14} className="mr-1" /> History
                           </button>
                           <button 
                             onClick={handleEnhancePrompt}
                             disabled={isEnhancing || !prompt}
                             className="text-xs text-brand-400 hover:text-white flex items-center"
                           >
                              <Sparkles size={12} className="mr-1" /> {isEnhancing ? 'Enhancing...' : t('video.enhance_prompt')}
                           </button>
                        </div>
                     </div>
                     
                     {/* History Dropdown */}
                     {showHistory && (
                        <div className="absolute top-8 right-0 z-20 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                           {historyItems.length === 0 ? (
                              <p className="text-xs text-gray-500 p-2 text-center">No history yet.</p>
                           ) : (
                              historyItems.map(item => (
                                 <button 
                                    key={item.id}
                                    onClick={() => selectHistory(item.text)}
                                    className="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-700/50 truncate"
                                 >
                                    {item.text}
                                 </button>
                              ))
                           )}
                        </div>
                     )}

                     <textarea 
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none h-32"
                        placeholder={t('video.prompt_placeholder')}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                     />
                  </div>
                  
                  {/* Reference Images Upload */}
                  <div className="mb-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 flex items-center">
                           <ImagePlus size={12} className="mr-1" /> Reference Images (Max 3)
                        </span>
                        <button 
                           onClick={() => openLibrary('ref')}
                           className="text-[10px] text-brand-400 hover:text-white"
                        >
                           Select from Library
                        </button>
                     </div>
                     <div className="flex gap-2 overflow-x-auto">
                        {referenceImages.map((img) => (
                           <div key={img.id} className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-700 group">
                              <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                              <button 
                                 onClick={() => removeReferenceImage(img.id)}
                                 className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"
                              >
                                 <Trash2 size={12} />
                              </button>
                           </div>
                        ))}
                        {referenceImages.length < 3 && (
                           <button 
                              onClick={() => triggerRefUpload('character')}
                              className="w-16 h-16 bg-gray-800 border border-gray-700 border-dashed rounded flex items-center justify-center hover:bg-gray-700"
                           >
                              <Plus size={16} className="text-gray-400" />
                           </button>
                        )}
                        <input id="ref-upload" type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
                     </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="mb-6">
                     <button 
                        onClick={() => setShowVideoSettings(!showVideoSettings)}
                        className="flex items-center text-xs text-gray-400 hover:text-brand-400"
                     >
                        <Settings size={12} className="mr-1" /> {t('video.settings.title')}
                     </button>
                     {showVideoSettings && (
                        <div className="mt-3 p-3 bg-gray-950 rounded-lg border border-gray-800 grid grid-cols-2 gap-3 animate-fadeIn">
                           
                           {/* Presets Section */}
                           <div className="col-span-2 flex gap-2 items-center mb-2 border-b border-gray-800 pb-2">
                              <select 
                                onChange={(e) => handleLoadPreset(e.target.value)} 
                                className="flex-1 bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
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

                           <div>
                              <label className="text-[10px] text-gray-500 uppercase">{t('video.settings.resolution')}</label>
                              <select 
                                 value={videoConfig.resolution}
                                 onChange={(e) => setVideoConfig({...videoConfig, resolution: e.target.value as any})}
                                 className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white"
                              >
                                 <option value="720p">720p (HD)</option>
                                 <option value="1080p">1080p (FHD)</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] text-gray-500 uppercase">{t('video.settings.aspect_ratio')}</label>
                              <select 
                                 value={videoConfig.aspectRatio}
                                 onChange={(e) => setVideoConfig({...videoConfig, aspectRatio: e.target.value as any})}
                                 className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white"
                              >
                                 <option value="16:9">16:9 (Landscape)</option>
                                 <option value="9:16">9:16 (Portrait)</option>
                                 <option value="1:1">1:1 (Square)</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] text-gray-500 uppercase">Lighting</label>
                              <select 
                                 value={renderSettings.lighting}
                                 onChange={(e) => setRenderSettings({...renderSettings, lighting: e.target.value})}
                                 className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white"
                              >
                                 <option value="cinematic">Cinematic</option>
                                 <option value="natural">Natural</option>
                                 <option value="studio">Studio</option>
                                 <option value="neon">Neon</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] text-gray-500 uppercase">Duration</label>
                              <select 
                                 value={videoConfig.duration || '5s'}
                                 onChange={(e) => setVideoConfig({...videoConfig, duration: e.target.value as any})}
                                 className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white"
                              >
                                 <option value="5s">5s (Standard)</option>
                                 <option value="10s">10s (Extended)</option>
                              </select>
                           </div>
                        </div>
                     )}
                  </div>

                  <button
                    onClick={handleGenerateVideo}
                    disabled={loading || !prompt}
                    className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center ${loading || !prompt ? 'bg-gray-800 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 shadow-lg'}`}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Film size={16} className="mr-2" />}
                    {loading ? "Generating..." : t('video.btn_generate')}
                  </button>
               </div>
             )}

             {/* CHARACTER TAB */}
             {activeTab === 'character' && (
               <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                  <div className="mb-4">
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('video.char_upload_label')}</label>
                     <div 
                        className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-800 relative h-32 flex items-center justify-center overflow-hidden"
                        onClick={() => document.getElementById('char-upload')?.click()}
                     >
                        {uploadedImage ? (
                           <img src={uploadedImage} className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                           <div className="text-gray-500">
                              <Upload className="mx-auto mb-1" size={20} />
                              <span className="text-xs">{t('video.char_upload_desc')}</span>
                           </div>
                        )}
                        <input id="char-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'char')} accept="image/*" />
                     </div>
                  </div>
                  
                  <div className="mb-6">
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('video.char_style_label')}</label>
                     <div className="grid grid-cols-2 gap-2">
                        {CharacterStyles.map(s => (
                           <button 
                              key={s.id} 
                              onClick={() => setCharStyle(s.id)}
                              className={`text-xs py-2 px-2 rounded border text-left truncate ${charStyle === s.id ? 'bg-brand-900/50 border-brand-500 text-brand-300' : 'bg-gray-950 border-gray-800 text-gray-400'}`}
                           >
                              {s.name}
                           </button>
                        ))}
                     </div>
                  </div>

                  <button
                    onClick={handleGenerateCharacter}
                    disabled={loading || !uploadedImage}
                    className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center ${loading || !uploadedImage ? 'bg-gray-800 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 shadow-lg'}`}
                  >
                    {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> : <User size={16} className="mr-2" />}
                    {loading ? t(`video.${charStatus}` as any) : t('video.char_btn_generate')}
                  </button>
               </div>
             )}
             
             {/* LIP SYNC TAB */}
             {activeTab === 'lipsync' && (
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                   <div className="mb-4 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-300">{t('video.lipsync_upload_label')}</label>
                      <button onClick={() => openLibrary('ls')} className="text-xs text-brand-400">Library</button>
                   </div>
                   <div 
                        className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-800 relative h-32 flex items-center justify-center overflow-hidden mb-4"
                        onClick={() => document.getElementById('ls-upload')?.click()}
                     >
                        {lsImage ? (
                           <img src={lsImage} className="w-full h-full object-contain absolute inset-0" />
                        ) : (
                           <div className="text-gray-500">
                              <Upload className="mx-auto mb-1" size={20} />
                              <span className="text-xs">Upload Face</span>
                           </div>
                        )}
                        <input id="ls-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'ls')} accept="image/*" />
                   </div>

                   <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t('video.lipsync_script_label')}</label>
                      <textarea 
                         className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white text-sm h-24"
                         value={lsScript}
                         onChange={(e) => setLsScript(e.target.value)}
                         placeholder="Enter text to speak..."
                      />
                   </div>

                   <div className="mb-6">
                       <label className="block text-sm font-medium text-gray-300 mb-2">{t('video.lipsync_voice_label')}</label>
                       <select 
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white text-sm"
                          value={lsVoice}
                          onChange={(e) => setLsVoice(e.target.value)}
                       >
                          {AIVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                       </select>
                   </div>

                   <button
                    onClick={handleGenerateLipSync}
                    disabled={loading || !lsImage || !lsScript}
                    className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center ${loading || !lsImage ? 'bg-gray-800 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 shadow-lg'}`}
                  >
                    {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> : <Music size={16} className="mr-2" />}
                    {loading ? lsStatus : t('video.lipsync_btn')}
                  </button>
                </div>
             )}

             {/* DIGITAL HUMAN TAB */}
             {activeTab === 'digital_human' && (
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                   {/* STEP 1 */}
                   <div className={`mb-6 ${dhStep !== 1 ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                         <h3 className="font-bold text-white">{t('video.dh_step1')}</h3>
                         {dhStep > 1 && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                      {dhStep === 1 && (
                         <div className="space-y-4">
                            <button 
                               onClick={() => openLibrary('dh')} 
                               className="w-full bg-gray-800 text-xs py-2 rounded text-gray-300"
                            >
                               Select from Library
                            </button>
                            <div 
                               className="border-2 border-dashed border-gray-700 rounded-lg h-24 flex items-center justify-center cursor-pointer"
                               onClick={() => document.getElementById('char-upload')?.click()}
                            >
                               {uploadedImage ? <img src={uploadedImage} className="h-full" /> : <span className="text-xs text-gray-500">Upload Photo</span>}
                            </div>
                            <button 
                               onClick={handleGenerateCharacter}
                               disabled={loading || !uploadedImage}
                               className="w-full bg-blue-600 text-white py-2 rounded font-bold text-xs"
                            >
                               {loading ? 'Processing...' : 'Next: Analyze & Prepare'}
                            </button>
                         </div>
                      )}
                   </div>

                   {/* STEP 2 */}
                   <div className={`mb-6 ${dhStep !== 2 ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                         <h3 className="font-bold text-white">{t('video.dh_step2')}</h3>
                         {dhStep > 2 && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                      {dhStep === 2 && (
                         <div className="space-y-4 bg-gray-950 p-4 rounded border border-gray-800">
                            {recordedAudioUrl ? (
                               <div>
                                  <audio src={recordedAudioUrl} controls className="w-full mb-2 h-8" />
                                  <button onClick={() => setDhStep(3)} className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs">
                                     {t('video.dh_use_audio')}
                                  </button>
                                  <button onClick={() => setRecordedAudioUrl(null)} className="w-full mt-2 text-xs text-red-400">Retake</button>
                               </div>
                            ) : (
                               <button 
                                 onMouseDown={startRecording}
                                 onMouseUp={stopRecording}
                                 className={`w-full py-8 rounded-lg border-2 font-bold transition-all ${isRecording ? 'bg-red-900/20 border-red-500 text-red-500 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
                               >
                                  {isRecording ? t('video.dh_recording') : 'Hold to Record Voice'}
                               </button>
                            )}
                         </div>
                      )}
                   </div>

                   {/* STEP 3 */}
                   <div className={`${dhStep !== 3 ? 'opacity-50' : ''}`}>
                      <h3 className="font-bold text-white mb-2">{t('video.dh_step3')}</h3>
                      {dhStep === 3 && (
                         <button 
                            onClick={handleGenerateLipSync}
                            className="w-full bg-brand-600 text-white py-3 rounded font-bold shadow-lg hover:bg-brand-500"
                         >
                            {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mx-auto"/> : t('video.dh_btn_create')}
                         </button>
                      )}
                   </div>
                </div>
             )}
          </div>

          {/* Right Panel: Preview/Result */}
          <div className="lg:col-span-8">
             {/* VIDEO PREVIEW */}
             {activeTab === 'video' && (
               <div className="relative">
                  <div className="bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-2xl aspect-video">
                     {videoUrl ? (
                        <video 
                            ref={videoPreviewRef}
                            src={videoUrl} 
                            controls 
                            autoPlay 
                            loop 
                            className="w-full h-full object-contain" 
                        />
                     ) : (
                        <div className="text-center w-full h-full flex flex-col items-center justify-center relative">
                           {loading ? (
                              /* REDESIGNED LOADING SCREEN */
                              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-xl p-8">
                                 
                                 {/* Central HUD */}
                                 <div className="relative w-48 h-48 mb-8">
                                    {/* Rotating Outer Ring */}
                                    <div className="absolute inset-0 border-2 border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full animate-[spin_8s_linear_infinite]"></div>
                                    
                                    {/* Active Segment */}
                                    <div className="absolute inset-2 border-4 border-t-brand-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-[spin_2s_linear_infinite]"></div>
                                    
                                    {/* Inner Pulse */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                       <span className="text-4xl font-bold text-white font-mono tracking-tighter">{timeLeft}s</span>
                                       <span className="text-[10px] text-brand-400 uppercase tracking-widest mt-1">Estimated</span>
                                    </div>
                                 </div>

                                 {/* Status Text */}
                                 <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                                    {getStatusText(statusCode) || "Processing..."}
                                    <span className="flex space-x-1 ml-2">
                                       <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-75"></span>
                                       <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-150"></span>
                                       <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-300"></span>
                                    </span>
                                 </h3>

                                 {/* Dynamic Tip */}
                                 <div className="h-8 flex items-center justify-center">
                                    <p className="text-gray-400 text-sm text-center max-w-md animate-fadeIn key={currentTip}">
                                       {LOADING_TIPS[currentTip]}
                                    </p>
                                 </div>

                                 {/* Progress Bar */}
                                 <div className="w-72 h-1 bg-gray-800 rounded-full mt-8 overflow-hidden relative">
                                    <div 
                                       className="h-full bg-gradient-to-r from-brand-500 to-purple-600 transition-all duration-1000 ease-linear relative"
                                       style={{ width: `${((60 - timeLeft) / 60) * 100}%` }}
                                    >
                                       <div className="absolute right-0 top-0 bottom-0 w-10 bg-white/30 blur-md"></div>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <>
                                 <Film size={64} className="text-gray-800 mx-auto mb-4" />
                                 <p className="text-gray-600">{t('video.preview_placeholder')}</p>
                              </>
                           )}
                        </div>
                     )}
                     
                     {/* SAFE ZONE OVERLAY */}
                     {showSafeZone && (
                        <div className="absolute inset-0 pointer-events-none z-20">
                           {/* Simulated TikTok Overlay */}
                           <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center opacity-80">
                              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white"><User size={20}/></div>
                              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white"><Heart size={20}/></div>
                              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white"><MessageCircle size={20}/></div>
                              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white"><Share2 size={20}/></div>
                           </div>
                           <div className="absolute bottom-8 left-4 max-w-[250px] space-y-2 opacity-80">
                              <div className="h-4 w-32 bg-gray-500 rounded"></div>
                              <div className="h-3 w-full bg-gray-500 rounded"></div>
                              <div className="h-3 w-48 bg-gray-500 rounded"></div>
                           </div>
                           <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 text-red-200 text-[10px] font-bold px-2 py-1 rounded border border-red-500/50">
                              Safe Zone Preview
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Safe Zone Toggle */}
                  <button 
                     onClick={() => setShowSafeZone(!showSafeZone)}
                     className={`absolute top-4 right-4 z-30 p-2 rounded-full shadow-lg transition-colors ${showSafeZone ? 'bg-brand-600 text-white' : 'bg-black/50 text-gray-400 hover:bg-black/70'}`}
                     title="Toggle Social Safe Zone"
                  >
                     {showSafeZone ? <Smartphone size={20} /> : <Smartphone size={20} />}
                  </button>
               </div>
             )}

             {/* CHARACTER PREVIEW */}
             {activeTab === 'character' && (
                <div className="bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-2xl aspect-square max-h-[600px]">
                   {generatedCharUrl ? (
                      <div className="relative w-full h-full group">
                         <img src={generatedCharUrl} className="w-full h-full object-contain" />
                         <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={saveToLibrary} className="bg-black/70 text-white px-3 py-2 rounded text-xs font-bold flex items-center hover:bg-brand-600"><Save size={14} className="mr-1"/> Save</button>
                            <button onClick={useCharacterAsActor} className="bg-black/70 text-white px-3 py-2 rounded text-xs font-bold flex items-center hover:bg-blue-600"><Video size={14} className="mr-1"/> Use in Video</button>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center text-gray-600">
                         <User size={64} className="mx-auto mb-4 opacity-20" />
                         <p>{t('video.char_result')}</p>
                      </div>
                   )}
                </div>
             )}

             {/* LIP SYNC / DH PREVIEW */}
             {(activeTab === 'lipsync' || activeTab === 'digital_human') && (
                <div className="bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center relative shadow-2xl aspect-video">
                   {lsVideoUrl ? (
                      <div className="relative w-full h-full">
                         <video ref={lsVideoRef} src={lsVideoUrl} className="w-full h-full object-contain" playsInline />
                         {lsAudioUrl && <audio ref={lsAudioRef} src={lsAudioUrl} className="hidden" />}
                         <button 
                            onClick={handlePlayLipSync}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-transparent group"
                         >
                            <Play size={64} className="text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                         </button>
                      </div>
                   ) : (
                      <div className="text-center text-gray-600">
                         {loading ? <div className="animate-spin w-10 h-10 border-2 border-brand-500 rounded-full mx-auto"/> : <Music size={64} className="mx-auto mb-4 opacity-20" />}
                         <p>{loading ? lsStatus : t('video.lipsync_result')}</p>
                      </div>
                   )}
                </div>
             )}
             
             {/* Action Bar (Save/Download) */}
             {(videoUrl || generatedCharUrl || lsVideoUrl) && !loading && (
                <div className="mt-6 flex justify-end gap-4">
                   <button onClick={handleSaveProject} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg">
                      <Save size={16} className="mr-2" /> {t('video.save_project')}
                   </button>
                   <a 
                      href={videoUrl || generatedCharUrl || lsVideoUrl || '#'} 
                      download={`dmp_studio_${Date.now()}`}
                      className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg font-bold flex items-center shadow-lg"
                   >
                      <Download size={16} className="mr-2" /> {t('video.download')}
                   </a>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
