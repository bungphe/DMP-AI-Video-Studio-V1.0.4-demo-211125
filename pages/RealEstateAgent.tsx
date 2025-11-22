import React, { useState, useRef, useEffect } from 'react';
import { Building, User, Camera, Mic, Play, CheckCircle2, Video, Upload, Plus, Trash2, Save, ChevronRight, Home, Sparkles, Scan, Edit3, Music, MonitorPlay, ArrowLeft, Type } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateVideo, analyzeImageTags, generateRealEstateScript } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Project } from '../types';
import { useNavigate } from 'react-router-dom';

const RealEstateAgent: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Steps: 1=Profile, 2=Photos (Vision), 3=Script (Writer), 4=Voice/Cam (Prompter), 5=Generate
  const [step, setStep] = useState(1);
  
  // State
  const [agentName, setAgentName] = useState('');
  const [agentImage, setAgentImage] = useState<string | null>(null);
  
  // Property & Vision
  const [propertyImages, setPropertyImages] = useState<{src: string, tags: string[]}[]>([]);
  const [detectedFeatures, setDetectedFeatures] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Script
  const [script, setScript] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [musicVibe, setMusicVibe] = useState('Luxury & Relaxing');

  // Recording & Teleprompter
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [prompterSpeed, setPrompterSpeed] = useState(1); // 0.5 to 2
  const [isTeleprompterActive, setIsTeleprompterActive] = useState(false);
  const prompterRef = useRef<HTMLDivElement>(null);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoScrollInterval = useRef<number | null>(null);
  
  useEffect(() => {
     const loadProfile = async () => {
        const chars = await storageService.getCharacters();
        const agent = chars.find(c => c.name.toLowerCase().includes('agent') || c.tags?.includes('real_estate'));
        if (agent) {
           setAgentName(agent.name);
           setAgentImage(agent.imageBase64);
        }
     };
     loadProfile();
  }, []);

  // Teleprompter Logic
  useEffect(() => {
     if (isTeleprompterActive && isRecording) {
        autoScrollInterval.current = window.setInterval(() => {
           if (prompterRef.current) {
              prompterRef.current.scrollTop += prompterSpeed;
           }
        }, 30);
     } else {
        if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
     }
     return () => { if(autoScrollInterval.current) clearInterval(autoScrollInterval.current); };
  }, [isTeleprompterActive, isRecording, prompterSpeed]);

  // --- HANDLERS ---

  const handleAgentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onload = () => setAgentImage(reader.result as string);
        reader.readAsDataURL(file);
     }
  };

  const handlePropertyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = e.target.files;
     if (files) {
        setIsAnalyzing(true);
        const newImages: {src: string, tags: string[]}[] = [];
        const allTags: Set<string> = new Set(detectedFeatures);

        for (let i = 0; i < files.length; i++) {
           const file = files[i];
           await new Promise<void>((resolve) => {
              const reader = new FileReader();
              reader.onload = async () => {
                 const base64 = reader.result as string;
                 // Gemini Vision Analysis
                 try {
                    const tags = await analyzeImageTags(base64.split(',')[1]);
                    newImages.push({ src: base64, tags });
                    tags.forEach(tag => allTags.add(tag));
                 } catch (e) {
                    newImages.push({ src: base64, tags: [] });
                 }
                 resolve();
              };
              reader.readAsDataURL(file);
           });
        }
        setPropertyImages(prev => [...prev, ...newImages]);
        setDetectedFeatures(Array.from(allTags));
        setIsAnalyzing(false);
     }
  };

  const handleAutoWriteScript = async () => {
     if (detectedFeatures.length === 0 && propertyImages.length === 0) return;
     setIsWriting(true);
     try {
        const generatedScript = await generateRealEstateScript(detectedFeatures, agentName || "Môi giới", musicVibe);
        setScript(generatedScript);
     } catch(e) {
        console.error(e);
     } finally {
        setIsWriting(false);
     }
  };

  const startRecording = async () => {
     try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = () => {
           const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
           setAudioUrl(URL.createObjectURL(blob));
           stream.getTracks().forEach(t => t.stop());
        };
        
        recorder.start();
        setIsRecording(true);
        if (script) setIsTeleprompterActive(true);
     } catch (e) {
        alert("Cần quyền truy cập Microphone.");
     }
  };

  const stopRecording = () => {
     if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsTeleprompterActive(false);
     }
  };

  const handleGenerate = async () => {
     if (!agentImage || propertyImages.length === 0) return;
     
     setIsGenerating(true);
     try {
        const agentBase64 = agentImage.split(',')[1];
        const mimeType = agentImage.split(':')[1].split(';')[0];
        
        // Construct detailed prompt based on analysis
        const prompt = `Professional real estate video. 
        Agent ${agentName} speaking: "${script.substring(0, 100)}...".
        Features shown: ${detectedFeatures.slice(0,5).join(', ')}.
        Vibe: ${musicVibe}. Cinematic lighting, 4k resolution.`;

        const url = await generateVideo(
           prompt,
           () => {}, 
           [{ data: agentBase64, mimeType: mimeType }]
        );
        
        setVideoUrl(url);
        
        const project: Project = {
           id: Date.now().toString(),
           title: `BĐS Tour - ${agentName}`,
           type: 'video',
           status: 'completed',
           createdAt: Date.now(),
           previewUrl: url || undefined,
           data: { agentImage, propertyImages, script, stage: 'distribution' }
        };
        await storageService.saveProject(project);

     } catch (e) {
        console.error(e);
        alert("Lỗi tạo video. Vui lòng thử lại.");
     } finally {
        setIsGenerating(false);
     }
  };

  const StepIndicator = () => (
     <div className="flex justify-center items-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
           <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-brand-500 shadow-[0_0_10px_#f97316]' : step > i ? 'w-2 bg-emerald-500' : 'w-2 bg-gray-800'}`}></div>
        ))}
     </div>
  );

  return (
    <div className="max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col relative pb-10">
       
       <div className="flex items-center justify-between mb-6">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-bold text-white uppercase tracking-widest">AI Estate Agent</h1>
          <div className="w-9"></div>
       </div>

       <StepIndicator />

       <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex-1 flex flex-col shadow-2xl relative overflow-hidden">
          
          {/* STEP 1: PROFILE */}
          {step === 1 && (
             <div className="flex-1 flex flex-col items-center animate-fadeIn">
                <h2 className="text-xl font-bold text-white mb-8">Định danh Môi giới</h2>
                
                <div className="relative group cursor-pointer mb-8" onClick={() => document.getElementById('agent-upload')?.click()}>
                   <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-800 bg-black flex items-center justify-center relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      {agentImage ? (
                         <img src={agentImage} className="w-full h-full object-cover" />
                      ) : (
                         <User size={64} className="text-gray-700" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Upload className="text-white" />
                      </div>
                   </div>
                   <div className="absolute bottom-2 right-2 bg-brand-600 p-3 rounded-full text-white border-4 border-gray-900 shadow-lg">
                      <Camera size={20} />
                   </div>
                   <input id="agent-upload" type="file" className="hidden" accept="image/*" onChange={handleAgentUpload} />
                </div>

                <div className="w-full space-y-4">
                   <input 
                      type="text" 
                      placeholder="Tên hiển thị (VD: Mr. Phú)" 
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-center text-white focus:border-brand-500 outline-none transition-all"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                   />
                </div>

                <button 
                   onClick={() => setStep(2)}
                   disabled={!agentImage}
                   className="w-full mt-auto bg-gradient-to-r from-brand-600 to-purple-600 text-white py-4 rounded-xl font-bold flex items-center justify-center shadow-lg hover:shadow-brand-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   Tiếp tục <ChevronRight className="ml-1" />
                </button>
             </div>
          )}

          {/* STEP 2: VISION SCAN */}
          {step === 2 && (
             <div className="flex-1 flex flex-col animate-fadeIn">
                <h2 className="text-xl font-bold text-white mb-2 text-center">Quét Hình ảnh BĐS</h2>
                <p className="text-xs text-gray-500 text-center mb-6">AI Vision sẽ tự động nhận diện đặc điểm căn nhà.</p>
                
                <div className="grid grid-cols-3 gap-2 mb-4 max-h-[300px] overflow-y-auto p-1">
                   {propertyImages.map((item, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden relative border border-gray-700 group">
                         <img src={item.src} className="w-full h-full object-cover" />
                         {item.tags.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                               <div className="flex gap-1 overflow-hidden">
                                  <span className="text-[8px] text-brand-400 whitespace-nowrap">{item.tags[0]}</span>
                               </div>
                            </div>
                         )}
                         <button onClick={() => setPropertyImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                            <Trash2 size={10} />
                         </button>
                      </div>
                   ))}
                   <div 
                      onClick={() => document.getElementById('prop-upload')?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-900/10 transition-colors text-gray-500 hover:text-brand-400"
                   >
                      {isAnalyzing ? <Scan className="animate-pulse" /> : <Plus size={24} />}
                      <span className="text-[10px] mt-1">{isAnalyzing ? 'Đang quét...' : 'Thêm ảnh'}</span>
                   </div>
                   <input id="prop-upload" type="file" className="hidden" multiple accept="image/*" onChange={handlePropertyUpload} />
                </div>

                {/* Features Tags */}
                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 mb-4 flex-1 overflow-y-auto">
                   <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Đặc điểm nhận diện (Features)</p>
                   <div className="flex flex-wrap gap-2">
                      {detectedFeatures.map((tag, i) => (
                         <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg border border-gray-700">{tag}</span>
                      ))}
                      {detectedFeatures.length === 0 && <span className="text-xs text-gray-600 italic">Chưa có dữ liệu. Hãy thêm ảnh.</span>}
                   </div>
                </div>

                <button 
                   onClick={() => setStep(3)}
                   disabled={propertyImages.length === 0 || isAnalyzing}
                   className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold flex items-center justify-center shadow-lg"
                >
                   Tạo Kịch bản AI <Sparkles size={16} className="ml-2" />
                </button>
             </div>
          )}

          {/* STEP 3: AI SCRIPT WRITER */}
          {step === 3 && (
             <div className="flex-1 flex flex-col animate-fadeIn">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                   <Edit3 className="mr-2 text-purple-400" /> Kịch bản Tự động
                </h2>
                
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4">
                   <div className="flex justify-between items-center mb-3">
                      <label className="text-xs text-gray-400 font-bold uppercase">Phong cách (Vibe)</label>
                      <select 
                         value={musicVibe}
                         onChange={(e) => setMusicVibe(e.target.value)}
                         className="bg-gray-900 text-white text-xs p-1 rounded border border-gray-700"
                      >
                         <option>Luxury & Relaxing</option>
                         <option>Modern & Energetic</option>
                         <option>Cozy Family</option>
                         <option>Minimalist</option>
                      </select>
                   </div>
                   <button 
                      onClick={handleAutoWriteScript}
                      disabled={isWriting}
                      className="w-full bg-purple-900/30 text-purple-300 border border-purple-500/30 py-2 rounded-lg text-xs font-bold hover:bg-purple-900/50 transition-colors mb-3"
                   >
                      {isWriting ? 'AI đang viết...' : 'Viết lời bình chuẩn Sales'}
                   </button>
                   <textarea 
                      className="w-full h-48 bg-gray-900 text-white text-sm p-3 rounded-lg border border-gray-700 focus:border-brand-500 outline-none resize-none leading-relaxed"
                      placeholder="Nội dung kịch bản sẽ hiện ở đây..."
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                   />
                </div>

                <button 
                   onClick={() => setStep(4)}
                   disabled={!script}
                   className="w-full mt-auto bg-gradient-to-r from-brand-600 to-purple-600 text-white py-4 rounded-xl font-bold flex items-center justify-center shadow-lg"
                >
                   Đến Phòng Thu <Mic size={16} className="ml-2" />
                </button>
             </div>
          )}

          {/* STEP 4: TELEPROMPTER RECORDING */}
          {step === 4 && (
             <div className="flex-1 flex flex-col animate-fadeIn relative">
                {/* Teleprompter Overlay */}
                <div className="flex-1 bg-black rounded-xl border border-gray-800 mb-4 relative overflow-hidden">
                   <div 
                      ref={prompterRef}
                      className="absolute inset-0 p-6 overflow-y-auto scroll-smooth"
                      style={{ scrollBehavior: 'smooth' }}
                   >
                      <p className={`text-2xl font-bold text-center leading-relaxed transition-colors duration-300 ${isRecording ? 'text-white' : 'text-gray-500'}`}>
                         {script}
                      </p>
                      {/* Spacer for scrolling */}
                      <div className="h-[300px]"></div> 
                   </div>
                   
                   {/* Recording Indicator Overlay */}
                   <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black to-transparent pointer-events-none"></div>
                   <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                   
                   {/* Focus Line */}
                   <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-red-500/30 pointer-events-none"></div>
                </div>

                <div className="flex flex-col gap-4">
                   {/* Controls */}
                   <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                         <Type size={16} className="text-gray-500" />
                         <input 
                            type="range" min="0.5" max="3" step="0.1" 
                            value={prompterSpeed} 
                            onChange={(e) => setPrompterSpeed(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                         />
                         <span className="text-xs text-gray-400">{prompterSpeed}x</span>
                      </div>
                      {audioUrl && <span className="text-xs text-green-400 font-bold flex items-center"><CheckCircle2 size={12} className="mr-1"/> Đã thu âm</span>}
                   </div>

                   <div className="flex gap-3">
                      <button 
                         onClick={isRecording ? stopRecording : startRecording}
                         className={`flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`}
                      >
                         {isRecording ? <div className="w-4 h-4 bg-white rounded-sm mr-2"/> : <div className="w-4 h-4 bg-red-500 rounded-full mr-2"/>}
                         {isRecording ? 'Dừng lại' : 'Ghi âm'}
                      </button>
                      <button 
                         onClick={() => setStep(5)}
                         disabled={!audioUrl}
                         className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-4 rounded-xl font-bold"
                      >
                         Render Video
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* STEP 5: FINAL RENDER */}
          {step === 5 && (
             <div className="flex-1 flex flex-col animate-fadeIn text-center justify-center">
                <h2 className="text-2xl font-bold text-white mb-6">Kết quả</h2>
                
                <div className="aspect-[9/16] bg-black rounded-2xl border border-gray-800 relative overflow-hidden shadow-2xl mx-auto w-full max-w-[280px] group">
                   {videoUrl ? (
                      <video src={videoUrl} className="w-full h-full object-cover" controls autoPlay loop />
                   ) : isGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-900">
                         <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-white font-bold text-lg">AI Director đang quay...</p>
                         <p className="text-xs text-gray-500 mt-2">Đang ghép nhân vật, đồng bộ khẩu hình và dựng cảnh.</p>
                      </div>
                   ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <MonitorPlay size={48} className="text-gray-700 mb-4" />
                         <button onClick={handleGenerate} className="bg-white text-black px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                            Bắt đầu Render
                         </button>
                      </div>
                   )}
                </div>

                {videoUrl && (
                   <div className="mt-8">
                      <a 
                         href={videoUrl} 
                         download={`BDS_${agentName}.mp4`}
                         className="block w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-brand-500 transition-colors"
                      >
                         Tải Video về máy
                      </a>
                      <button onClick={() => {setStep(1); setVideoUrl(null);}} className="mt-4 text-gray-500 hover:text-white text-sm underline">
                         Làm dự án mới
                      </button>
                   </div>
                )}
             </div>
          )}

       </div>
    </div>
  );
};

export default RealEstateAgent;