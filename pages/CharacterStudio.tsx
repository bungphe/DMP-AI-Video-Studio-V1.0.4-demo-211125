
import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Upload, Wand2, Palette, Camera, Shirt, Save, X, Image as ImageIcon, Mic, StopCircle, Volume2, CreditCard, Sparkles, Users, Trash2, SplitSquareHorizontal, MonitorPlay } from 'lucide-react';
import { createCharacterFromImage, editCharacterStyle, suggestMakeupStyle } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { SavedCharacter, StudioMode, StylePreset } from '../types';
import { useToast } from '../components/Layout';

const CharacterStudio: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [mode, setMode] = useState<StudioMode>('makeup');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  
  // --- ADVANCED RENDER SETTINGS STATE ---
  const [renderConfig, setRenderConfig] = useState({
    aspectRatio: '1:1',
    quality: 'ultra', // standard, hd, ultra
    lighting: 'studio', // studio, natural, dramatic, cinematic, neon
    negativePrompt: 'blurry, low quality, distorted face, extra fingers, ugly, grain, cartoon, watermark',
    seed: -1, // -1 is random
    styleStrength: 0.85 // Influence of the prompt
  });

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Library Selection
  const [library, setLibrary] = useState<SavedCharacter[]>([]);
  const [showLibModal, setShowLibModal] = useState(false);

  // Auto Makeup State
  const [isAutoMakeupAnalysis, setIsAutoMakeupAnalysis] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = async () => {
     const chars = await storageService.getCharacters();
     setLibrary(chars);
  };

  useEffect(() => {
     loadLibrary();
  }, []);

  const presets: StylePreset[] = [
    // Makeup
    { id: 'red_lips', label: t('studio.presets.red_lips'), category: 'makeup', prompt: 'add bright red lipstick, glamorous makeup style' },
    { id: 'smokey', label: t('studio.presets.smokey_eyes'), category: 'makeup', prompt: 'apply dark smokey eye makeup, evening look' },
    { id: 'natural', label: t('studio.presets.natural_look'), category: 'makeup', prompt: 'natural "no makeup" makeup look, glowing skin' },
    
    // Hair
    { id: 'blonde', label: t('studio.presets.blonde'), category: 'hair', prompt: 'change hair color to platinum blonde, shiny texture' },
    { id: 'bob', label: t('studio.presets.bob_cut'), category: 'hair', prompt: 'change hairstyle to a chic bob cut' },
    { id: 'long_wavy', label: t('studio.presets.long_wavy'), category: 'hair', prompt: 'change hairstyle to long wavy flowing hair' },

    // Fashion
    { id: 'suit', label: t('studio.presets.business_suit'), category: 'fashion', prompt: 'wearing a sharp navy blue business suit, professional attire' },
    { id: 'gown', label: t('studio.presets.evening_gown'), category: 'fashion', prompt: 'wearing an elegant red evening gown, luxury fashion' },
    { id: 'cyber', label: t('studio.presets.cyberpunk_armor'), category: 'fashion', prompt: 'wearing futuristic cyberpunk techwear armor, glowing neon accents' },

    // Photoshoot
    { id: 'studio_light', label: t('studio.presets.studio_lighting'), category: 'photoshoot', prompt: 'professional studio photography lighting, dark grey background, rim light' },
    { id: 'neon_city', label: t('studio.presets.neon_city'), category: 'photoshoot', prompt: 'background is a blurred neon city street at night, bokeh effect, cinematic lighting' },
  ];

  const filteredPresets = presets.filter(p => p.category === mode);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLibrarySelect = (char: SavedCharacter) => {
    setUploadedImage(char.imageBase64);
    setResultImage(null); // Reset result on new load
    
    if (char.voiceSampleBase64) {
        setAudioUrl(`data:audio/wav;base64,${char.voiceSampleBase64}`);
        try {
            const byteCharacters = atob(char.voiceSampleBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            setRecordedBlob(new Blob([byteArray], {type: 'audio/wav'}));
        } catch(e) {
            console.error("Failed to load voice blob", e);
        }
    } else {
        setAudioUrl(null);
        setRecordedBlob(null);
    }
    
    setShowLibModal(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     if(confirm('Delete character from library?')) {
        await storageService.deleteCharacter(id);
        await loadLibrary();
     }
  };

  const handleApply = async (instruction: string) => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    setStatus(t('studio.analyzing'));
    
    try {
      const base64 = uploadedImage.split(',')[1];
      let techSpecs = "";
      if (renderConfig.quality === 'ultra') techSpecs += "8k resolution, unreal engine 5 render, hyper-realistic, sharp focus, highly detailed texture. ";
      else if (renderConfig.quality === 'hd') techSpecs += "4k resolution, high quality, professional photography. ";
      
      if (renderConfig.lighting === 'studio') techSpecs += "Soft studio lighting, rim light, volumetric lighting. ";
      else if (renderConfig.lighting === 'dramatic') techSpecs += "High contrast, rembrandt lighting, dramatic shadows. ";
      else if (renderConfig.lighting === 'neon') techSpecs += "Cyberpunk neon lighting, blue and magenta gels. ";
      else if (renderConfig.lighting === 'cinematic') techSpecs += "Cinematic color grading, teal and orange, anamorphic lens flares. ";

      techSpecs += `Maintain ${renderConfig.aspectRatio} composition balance. `;
      const fullPrompt = `${instruction}. ${techSpecs} EXCLUDE/NEGATIVE PROMPT: ${renderConfig.negativePrompt}`;

      const newImage = await editCharacterStyle(base64, fullPrompt, (s) => setStatus(t(`studio.${s}` as any)));
      setResultImage(newImage);
    } catch (e) {
      console.error(e);
      alert("Error editing image. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const handleAutoMakeup = async () => {
     if (!uploadedImage) return;
     setIsAutoMakeupAnalysis(true);
     try {
        const base64 = uploadedImage.split(',')[1];
        const suggestedPrompt = await suggestMakeupStyle(base64);
        setCustomPrompt(suggestedPrompt);
        await handleApply(suggestedPrompt);
     } catch(e) {
        console.error(e);
        alert("Auto-makeup analysis failed.");
     } finally {
        setIsAutoMakeupAnalysis(false);
     }
  };

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
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          stream.getTracks().forEach(t => t.stop());
       };

       recorder.start();
       setIsRecording(true);
    } catch (e) {
       console.error(e);
       alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
     if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
     }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
     return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const base64 = (reader.result as string).split(',')[1];
           resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
     });
  };

  const handleSave = async () => {
    const imageToSave = resultImage || uploadedImage;
    if (!imageToSave) {
        showToast("Vui lòng upload hoặc tạo nhân vật trước khi lưu.", "error");
        return;
    }
    
    const defaultName = `Character ${new Date().toISOString().slice(0,10)}`;
    const name = prompt("Đặt tên cho nhân vật (Lưu vào Thư viện):", defaultName);
    
    if (name) {
      let voiceBase64 = undefined;
      if (recordedBlob) {
         try {
            voiceBase64 = await blobToBase64(recordedBlob);
         } catch (e) {
            console.error("Voice save failed", e);
         }
      }

      await storageService.saveCharacter({
        id: Date.now().toString(),
        name,
        imageBase64: imageToSave,
        style: mode === 'voice' ? 'Cloned Voice' : (mode === 'card' ? 'Trading Card' : 'Edited'),
        voiceSampleBase64: voiceBase64,
        createdAt: Date.now(),
        stats: mode === 'card' ? {
            realism: 88,
            style: 92,
            charisma: 99,
            rarity: 'Legendary'
        } : undefined
      });
      
      await loadLibrary(); 
      showToast("Đã lưu nhân vật vào Thư viện!", "success");
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      
      {/* Left Panel: Tools */}
      <div className="w-full md:w-80 flex flex-col gap-4 h-full overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center mb-2">
            <Scissors className="mr-2 text-brand-400" /> {t('studio.title')}
          </h1>
          <p className="text-gray-400 text-xs">{t('studio.desc')}</p>
        </div>

        {/* Input Source */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase">Source</h3>
            <button onClick={() => setShowLibModal(true)} className="text-xs text-brand-400 hover:text-white flex items-center font-medium">
               <Users size={12} className="mr-1" /> {t('video.select_from_lib')}
            </button>
          </div>
          
          <div 
             onClick={() => fileInputRef.current?.click()}
             className="border-2 border-dashed border-gray-700 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:bg-gray-800/50 transition-colors relative overflow-hidden group"
          >
             {uploadedImage ? (
               <>
                <img src={uploadedImage} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white" />
                </div>
               </>
             ) : (
               <div className="text-center text-gray-500">
                 <Upload size={20} className="mx-auto mb-1"/>
                 <span className="text-xs">{t('studio.upload_placeholder')}</span>
               </div>
             )}
             <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*"/>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
          {[
            { id: 'makeup', icon: Palette, label: 'Makeup' },
            { id: 'hair', icon: Scissors, label: 'Hair' },
            { id: 'fashion', icon: Shirt, label: 'Fashion' },
            { id: 'photoshoot', icon: Camera, label: 'Photo' },
            { id: 'voice', icon: Mic, label: 'Voice' },
            { id: 'card', icon: CreditCard, label: 'Card' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as StudioMode)}
              className={`flex flex-col items-center justify-center py-2 rounded text-[10px] transition-colors ${mode === m.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <m.icon size={16} className="mb-1" />
              {m.label}
            </button>
          ))}
        </div>
        
        {/* Controls */}
        <div className="flex-1 bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-col">
          {mode === 'voice' ? (
              // VOICE UI
              <div className="flex flex-col h-full">
                 <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-gray-800'}`}>
                       <Mic size={32} className={isRecording ? 'text-red-500' : 'text-gray-500'} />
                    </div>
                    {audioUrl && !isRecording && (
                       <div className="w-full bg-gray-950 p-3 rounded border border-gray-800 mb-4 flex items-center relative group">
                          <Volume2 size={16} className="text-brand-400 mr-2" />
                          <audio src={audioUrl} controls className="w-full h-8" />
                       </div>
                    )}
                    {!isRecording && !audioUrl ? (
                       <button onClick={startRecording} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold text-sm flex items-center justify-center shadow-lg shadow-red-900/20">
                          <Mic size={16} className="mr-2" /> {t('studio.voice_record')}
                       </button>
                    ) : isRecording ? (
                       <button onClick={stopRecording} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold text-sm flex items-center justify-center">
                          <StopCircle size={16} className="mr-2" /> {t('studio.voice_stop')}
                       </button>
                    ) : null}
                 </div>
              </div>
          ) : mode === 'card' ? (
              // TRADING CARD UI
              <div className="text-center">
                 <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Generate AI Trading Card</h3>
                 <p className="text-xs text-gray-500 mb-4">Convert your character into a collectible card with AI-generated stats.</p>
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-300"><span>Strength</span><span>88</span></div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-[88%]"></div></div>
                    
                    <div className="flex justify-between text-xs text-gray-300"><span>Intelligence</span><span>92</span></div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[92%]"></div></div>
                    
                    <div className="flex justify-between text-xs text-gray-300"><span>Charisma</span><span>99</span></div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 w-[99%]"></div></div>
                 </div>
              </div>
          ) : (
              // IMAGE EDITING UI
              <>
                {/* Auto-Makeup Button (Specific to Makeup Mode) */}
                {mode === 'makeup' && (
                   <button 
                      onClick={handleAutoMakeup}
                      disabled={isAutoMakeupAnalysis || isProcessing || !uploadedImage}
                      className={`w-full mb-4 py-2.5 rounded font-bold text-sm flex items-center justify-center transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg ${isAutoMakeupAnalysis || isProcessing || !uploadedImage ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'}`}
                   >
                      {isAutoMakeupAnalysis ? (
                         <><Sparkles className="animate-spin mr-2" size={16}/> Analyzing Face...</>
                      ) : (
                         <><Sparkles className="mr-2" size={16}/> AI Auto-Makeup</>
                      )}
                   </button>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {filteredPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleApply(preset.prompt)}
                      disabled={isProcessing || !uploadedImage}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-white py-3 px-2 rounded border border-gray-700 hover:border-brand-500 transition-all text-left truncate disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="mt-auto">
                  <label className="text-xs text-gray-500 block mb-2">{t('studio.instruction_label')}</label>
                  <textarea 
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-sm text-white h-20 resize-none focus:ring-1 focus:ring-brand-500 outline-none"
                    placeholder="E.g. Change hair to pink, add sunglasses..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                  <button 
                    onClick={() => handleApply(customPrompt)}
                    disabled={!customPrompt || isProcessing || !uploadedImage}
                    className={`w-full mt-3 py-2.5 rounded font-bold text-sm flex items-center justify-center transition-all ${!customPrompt || isProcessing || !uploadedImage ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg'}`}
                  >
                    {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"/> : <Wand2 size={16} className="mr-2" />}
                    {isProcessing ? t('studio.rendering') : t('studio.btn_apply')}
                  </button>
                </div>
              </>
          )}
        </div>
      </div>

      {/* Right Panel: Canvas */}
      <div className="flex-1 bg-black rounded-2xl border border-gray-800 relative overflow-hidden flex items-center justify-center bg-grid-pattern">
        {uploadedImage ? (
           <div className="relative w-full h-full max-w-2xl max-h-[80vh] group">
              
              {/* GLOBAL SAVE BUTTON FOR CANVAS */}
              <button 
                  onClick={handleSave} 
                  className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur text-black px-4 py-2 rounded-full text-sm font-bold shadow-xl hover:bg-white flex items-center transition-all hover:scale-105 border border-white/50 group"
                  title="Save to Character Library for Video Generation"
              >
                  <Save size={16} className="mr-2 text-brand-600 group-hover:scale-110 transition-transform" /> 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600">
                    Lưu vào Thư viện
                  </span>
              </button>

              {mode === 'card' ? (
                 // CARD OVERLAY
                 <div className="relative w-[400px] h-[600px] bg-gradient-to-br from-gray-900 to-black border-4 border-yellow-600 rounded-xl overflow-hidden shadow-2xl mx-auto my-auto transform hover:scale-105 transition-transform">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-yellow-600/20 z-10 flex items-center px-4">
                       <span className="text-yellow-500 font-bold tracking-widest text-xs">LEGENDARY</span>
                    </div>
                    <img src={uploadedImage} className="w-full h-3/4 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gray-900 p-4 border-t-2 border-yellow-600">
                       <h3 className="text-xl font-bold text-white mb-2">AI Character</h3>
                       <div className="flex justify-between text-xs text-gray-400">
                          <div>STR: 88</div>
                          <div>INT: 92</div>
                          <div>CHA: 99</div>
                       </div>
                    </div>
                 </div>
              ) : (
                 // NORMAL VIEW
                 <>
                    {resultImage && mode !== 'voice' && (
                      <button 
                        onMouseDown={() => setShowCompare(true)}
                        onMouseUp={() => setShowCompare(false)}
                        className="absolute top-4 left-4 z-20 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/10"
                      >
                         <SplitSquareHorizontal size={14} className="mr-2 inline" /> {t('studio.compare')}
                      </button>
                    )}
                    <img src={showCompare || !resultImage ? uploadedImage : resultImage} className="w-full h-full object-contain" />
                 </>
              )}
              {isProcessing && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                    <MonitorPlay className="text-brand-500 animate-pulse mb-4" size={32} />
                    <p className="text-brand-400 font-mono font-bold">{status}</p>
                 </div>
              )}
           </div>
        ) : (
           <div className="text-center text-gray-600">
              <ImageIcon size={64} className="mx-auto mb-4 opacity-20"/>
              <p>{t('studio.upload_placeholder')}</p>
           </div>
        )}
      </div>

      {/* Library Modal */}
      {showLibModal && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-fadeIn">
               <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                  <h3 className="font-bold text-white flex items-center"><Users size={18} className="mr-2 text-brand-400"/> Character Library</h3>
                  <button onClick={() => setShowLibModal(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-gray-900">
                  {library.map(char => (
                     <div key={char.id} className="relative group bg-black border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-brand-500 transition-all shadow-sm hover:shadow-brand-500/20" onClick={() => handleLibrarySelect(char)}>
                        <div className="aspect-square w-full relative">
                            <img src={char.imageBase64} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                           <p className="text-xs font-bold text-white truncate">{char.name}</p>
                           <div className="flex justify-between items-center mt-1">
                               <span className="text-[9px] text-gray-400 uppercase tracking-wider bg-gray-800 px-1.5 py-0.5 rounded">{char.style}</span>
                               {char.voiceSampleBase64 && <Mic size={10} className="text-brand-400" />}
                           </div>
                        </div>
                        <button 
                           onClick={(e) => handleDelete(e, char.id)}
                           className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                           title="Delete"
                        >
                           <Trash2 size={12} />
                        </button>
                     </div>
                  ))}
                  {library.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20">
                          <Users size={48} className="mb-4 opacity-20" />
                          <p>Library is empty. Save your creations to see them here.</p>
                      </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default CharacterStudio;
