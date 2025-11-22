
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, CheckCircle2, AlertCircle, Clock, Edit3, TrendingUp, Hash, Star, BookOpen, X, Save, Dices, Trash2, FolderPlus, Wand2, Video, Mic, Volume2, Share2, FileText, Play, RefreshCw, Bot } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateScript, analyzeViralPotential, generateRandomIdea, refineScriptText, generateSpeech, bufferToWave } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { ViralAnalysis, PromptTemplate, Project, AIVoices } from '../types';
import { PROMPT_TEMPLATES } from '../utils/promptTemplates';

const ScriptGenerator: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form State
  const [formData, setFormData] = useState({
    topic: '',
    style: 'professional',
    duration: 's30',
    platform: 'tiktok',
    audience: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Viral State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viralReport, setViralReport] = useState<ViralAnalysis | null>(null);

  // Library & Template State
  const [showLibrary, setShowLibrary] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [activeLibTab, setActiveLibTab] = useState<'system' | 'custom'>('system');
  
  // Random Idea State
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Scene Action States
  const [rewritingScene, setRewritingScene] = useState<{idx: number, type: 'visual' | 'audio'} | null>(null);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (showLibrary) {
       loadTemplates();
    }
    return () => {
       if (audioSourceRef.current) audioSourceRef.current.stop();
       if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [showLibrary]);
  
  useEffect(() => {
    // Pre-select YouTube Shorts mode if navigated via /shorts route
    if (location.pathname === '/shorts') {
       setFormData(prev => ({ ...prev, platform: 'tiktok' }));
    } 
    
    // Handle resuming from Project
    if (location.state?.project) {
        const proj = location.state.project as Project;
        setCurrentProjectId(proj.id);
        if (proj.data) {
            // If saved using new structure { result, formData }
            if (proj.data.result && proj.data.formData) {
                setResult(proj.data.result);
                setFormData(proj.data.formData);
            } else {
                // Legacy or direct result save
                setResult(proj.data);
                // Try to infer topic from title if formData missing
                if (proj.data.title) setFormData(prev => ({ ...prev, topic: proj.title }));
            }
        }
    } else if (location.state?.topic) {
       setFormData(prev => ({ ...prev, topic: location.state.topic }));
    }
  }, [location]);

  const loadTemplates = async () => {
     try {
       const saved = await storageService.getTemplates();
       setTemplates([...PROMPT_TEMPLATES, ...saved]);
     } catch (e) {
       console.error("Failed to load templates", e);
       setTemplates([...PROMPT_TEMPLATES]);
     }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setIsEditing(false);
    setViralReport(null);
    // Note: We keep currentProjectId to update existing project if we are refining it

    try {
      if (!formData.topic.trim()) return;

      const styleText = t(`script.styles.${formData.style}`);
      const durationText = t(`script.durations.${formData.duration}`);
      const platformText = t(`script.platforms.${formData.platform}`);
      
      const jsonString = await generateScript(
        formData.topic, 
        styleText, 
        durationText,
        platformText,
        formData.audience,
        language
      );

      try {
        if (!jsonString || jsonString === "{}") {
           throw new Error("Received empty response");
        }
        const parsed = JSON.parse(jsonString);
        // Ensure scenes array exists
        if (!parsed.scenes) parsed.scenes = [];
        setResult(parsed);
      } catch (parseError) {
        console.error("JSON Parse Error", parseError, "Raw:", jsonString);
        setError(t('script.error'));
      }

    } catch (err: any) {
      console.error("Generation failed:", err);
      let msg = err.message;
      if (msg === "QUOTA_EXCEEDED") msg = t('errors.quota_exceeded');
      else if (msg === "API_KEY_INVALID") msg = t('errors.api_key_invalid');
      else if (msg === "NETWORK_ERROR") msg = t('errors.network_error');
      else if (msg === "CONTENT_POLICY") msg = t('errors.content_policy');
      
      setError(msg || t('script.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRandomIdea = async () => {
     setIsRandomizing(true);
     try {
        const category = ['Viral', 'Business', 'Lifestyle', 'Creative'][Math.floor(Math.random() * 4)];
        const idea = await generateRandomIdea(category, language);
        if (idea) {
           setFormData({ ...formData, topic: idea });
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsRandomizing(false);
     }
  };

  const handleRewrite = async (idx: number, type: 'visual' | 'audio', mode: string) => {
     if (!result) return;
     const originalText = type === 'visual' ? result.scenes[idx].visual : result.scenes[idx].audio;
     const instruction = t(`script.rewrite_options.${mode}`);
     
     setRewritingScene({ idx, type });
     
     try {
        const newText = await refineScriptText(originalText, instruction, language);
        updateScene(idx, type, newText);
     } catch (e) {
        console.error(e);
     } finally {
        setRewritingScene(null);
     }
  };

  const handlePlayAudio = async (text: string, idx: number) => {
      if (playingAudioIdx === idx) {
         if (audioSourceRef.current) audioSourceRef.current.stop();
         setPlayingAudioIdx(null);
         return;
      }

      try {
         setPlayingAudioIdx(idx);
         if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
         }
         if(audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
         
         if (audioSourceRef.current) audioSourceRef.current.stop();

         const buffer = await generateSpeech(text, AIVoices[1].id, audioContextRef.current);
         const source = audioContextRef.current.createBufferSource();
         source.buffer = buffer;
         source.connect(audioContextRef.current.destination);
         source.onended = () => setPlayingAudioIdx(null);
         source.start();
         audioSourceRef.current = source;
      } catch (e) {
         console.error("Preview failed", e);
         setPlayingAudioIdx(null);
      }
  };

  const handleVisualize = (prompt: string) => {
     // Pass project ID to keep flow
     navigate('/video', { state: { prompt, projectId: currentProjectId } });
  };

  const handleSaveTemplate = async () => {
     if (!result || !formData.topic) return;
     const name = prompt(t('script.template_name_prompt'), result.title || 'My Script Template');
     if (name) {
        const newTemplate: PromptTemplate = {
           id: Date.now().toString(),
           label: name,
           category: 'Custom',
           content: formData.topic,
           style: formData.style,
           isCustom: true
        };
        await storageService.saveTemplate(newTemplate);
        alert(t('script.template_saved'));
     }
  };

  const handleSaveProject = async () => {
    if (!result) return null;
    
    // Default title from result or topic
    const defaultTitle = result.title || formData.topic.substring(0, 50);
    // Prompt user for name
    const title = prompt("Name your script project:", defaultTitle);
    
    if (!title) return null;

    try {
      const project: Project = {
        id: currentProjectId || Date.now().toString(),
        title: title,
        status: 'draft', // Use draft/processing status
        type: 'script',
        createdAt: Date.now(), // Update timestamp
        data: {
            result,
            formData,
            stage: 'pre_production' 
        }
      };
      await storageService.saveProject(project);
      setCurrentProjectId(project.id);
      alert("Script saved successfully to Projects!");
      return project;
    } catch (e) {
      console.error("Failed to save project", e);
      alert("Failed to save project.");
      return null;
    }
  };

  const handleSendToAgent = async () => {
     // First save the project (implicitly or explicitly)
     // We use a simplified save here without prompt if not already saved, or reuse the ID
     let projectId = currentProjectId;
     
     if (!projectId) {
        // Auto-save temporary project
        const tempProject: Project = {
           id: Date.now().toString(),
           title: result.title || formData.topic.substring(0, 30),
           status: 'processing',
           type: 'script',
           createdAt: Date.now(),
           data: { result, formData, stage: 'pre_production' }
        };
        await storageService.saveProject(tempProject);
        projectId = tempProject.id;
     } else {
        // Update existing
        const existing = await storageService.getProjects().then(ps => ps.find(p => p.id === projectId));
        if (existing) {
           await storageService.saveProject({ ...existing, data: { ...existing.data, result, formData }});
        }
     }

     // Convert script result to storyboard format for Agent
     const scenes = result.scenes || [];
     const storyboard = {
        title: result.title,
        style: formData.style,
        scenes: scenes.map((s: any, i: number) => ({
           id: i + 1,
           visual_description: s.visual,
           audio_script: s.audio,
           prompt_optimized: s.visual, // Initial prompt
           status: 'pending',
           camera_angle: 'Cinematic',
           voice_gender: 'Female'
        }))
     };
     
     // Retrieve the project we just saved/updated
     const projectToPass = await storageService.getProjects().then(ps => ps.find(p => p.id === projectId));
     
     if (projectToPass) {
        const projectWithStoryboard = {
           ...projectToPass,
           data: {
              ...projectToPass.data,
              storyboard
           }
        };
        await storageService.saveProject(projectWithStoryboard);
        navigate('/agents', { state: { project: projectWithStoryboard } });
     }
  };

  const handleDeleteTemplate = async (id: string) => {
     if (confirm(t('script.delete_confirm'))) {
        await storageService.deleteTemplate(id);
        loadTemplates();
     }
  };

  const handleViralAnalysis = async () => {
    if (!result) return;
    setIsAnalyzing(true);
    try {
      const report = await analyzeViralPotential(result, language);
      setViralReport(report);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateScene = (index: number, field: string, value: string) => {
    if (!result) return;
    const newScenes = [...result.scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    setResult({ ...result, scenes: newScenes });
  };

  const selectTemplate = (template: PromptTemplate) => {
    setFormData({ 
       ...formData, 
       topic: template.content,
       style: template.style || formData.style 
    });
    setShowLibrary(false);
  };

  const copyToClipboard = () => {
     if (!result) return;
     let text = `Title: ${result.title}\n\n`;
     if (result.scenes) {
        result.scenes.forEach((s: any) => {
            text += `Scene ${s.sceneNumber} (${s.durationSeconds}s)\nVisual: ${s.visual}\nAudio: ${s.audio}\n\n`;
        });
     }
     navigator.clipboard.writeText(text);
     alert("Script copied to clipboard!");
  };

  return (
    <div className="max-w-7xl mx-auto relative pb-20">
      
      {/* LIBRARY MODAL */}
      {showLibrary && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fadeIn">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center">
                       <BookOpen className="mr-2 text-brand-400" /> {t('script.library_title')}
                    </h3>
                    <p className="text-sm text-gray-400">{t('script.library_desc')}</p>
                 </div>
                 <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-white p-2">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="flex border-b border-gray-800 px-6">
                 <button 
                   onClick={() => setActiveLibTab('system')}
                   className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeLibTab === 'system' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                 >
                    {t('script.tab_system')}
                 </button>
                 <button 
                   onClick={() => setActiveLibTab('custom')}
                   className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeLibTab === 'custom' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                 >
                    {t('script.tab_custom')}
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates
                       .filter(t => activeLibTab === 'system' ? !t.isCustom : t.isCustom)
                       .map((template) => (
                       <div 
                          key={template.id} 
                          className="bg-gray-950 border border-gray-800 p-4 rounded-xl hover:border-brand-500 hover:bg-brand-900/10 transition-all group relative cursor-pointer"
                          onClick={() => selectTemplate(template)}
                       >
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-400">
                                {template.category}
                             </span>
                          </div>
                          <h4 className="font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">{template.label}</h4>
                          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                             {template.content}
                          </p>
                          
                          {template.isCustom && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                className="absolute bottom-2 right-2 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                             >
                                <Trash2 size={14} />
                             </button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Sparkles className="mr-3 text-brand-400" /> {location.pathname === '/shorts' ? 'YouTube Shorts Creator' : t('script.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('script.desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 sticky top-8 shadow-lg">
            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Topic Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-bold text-gray-300">{t('script.topic_label')}</label>
                   <div className="flex gap-2">
                       <button 
                          type="button"
                          onClick={() => setShowLibrary(true)}
                          className="text-xs text-brand-400 hover:text-brand-300 flex items-center font-medium"
                       >
                          <BookOpen size={12} className="mr-1" /> {t('script.library_btn')}
                       </button>
                   </div>
                </div>
                <div className="relative">
                   <textarea
                     className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 pr-10 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all min-h-[120px]"
                     placeholder={t('script.topic_placeholder')}
                     value={formData.topic}
                     onChange={(e) => setFormData({...formData, topic: e.target.value})}
                     required
                   />
                   <button
                      type="button"
                      onClick={handleRandomIdea}
                      disabled={isRandomizing}
                      className="absolute bottom-3 right-3 p-1.5 bg-gray-800 hover:bg-brand-600 text-gray-400 hover:text-white rounded-md transition-colors"
                      title={t('script.random_idea_btn')}
                   >
                      <Dices size={16} className={isRandomizing ? 'animate-spin' : ''} />
                   </button>
                </div>
              </div>

              {/* Platform & Duration */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">{t('script.platform_label')}</label>
                    <select 
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white outline-none"
                      value={formData.platform}
                      onChange={(e) => setFormData({...formData, platform: e.target.value})}
                    >
                      <option value="tiktok">TikTok / Shorts</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">{t('script.duration_label')}</label>
                    <select 
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white outline-none"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    >
                      <option value="s15">15s (Shorts)</option>
                      <option value="s30">30s (Reels)</option>
                      <option value="s60">60s (TikTok)</option>
                      <option value="m2">2 mins (YouTube)</option>
                    </select>
                 </div>
              </div>

              {/* Audience & Style */}
              <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">{t('script.audience_label')}</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white outline-none"
                      placeholder={t('script.audience_placeholder')}
                      value={formData.audience}
                      onChange={(e) => setFormData({...formData, audience: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">{t('script.style_label')}</label>
                    <select 
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white outline-none"
                      value={formData.style}
                      onChange={(e) => setFormData({...formData, style: e.target.value})}
                    >
                      <option value="professional">Professional</option>
                      <option value="humorous">Humorous</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="educational">Educational</option>
                      <option value="social">Fast Paced (Social)</option>
                      <option value="emotional">Emotional</option>
                      <option value="sales">Sales / Promo</option>
                    </select>
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-3.5 px-4 rounded-lg font-bold text-white flex items-center justify-center
                  transition-all duration-200 text-sm uppercase tracking-wider
                  ${loading ? 'bg-gray-800 cursor-not-allowed opacity-70' : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]'}
                `}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></div>
                    {t('script.btn_generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={16} /> {t('script.btn_generate')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Output Section */}
        <div className={`lg:col-span-8`}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start mb-6">
              <AlertCircle className="mr-3 mt-0.5 flex-shrink-0" /> 
              <div>
                 <p className="font-bold">Error Generating Script</p>
                 <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500 bg-gray-900/30">
              <Sparkles size={48} className="mb-4 opacity-20" />
              <p>{t('script.empty_state')}</p>
            </div>
          )}

          {loading && (
             <div className="space-y-4 animate-pulse">
               <div className="h-8 bg-gray-800 rounded w-1/2 mb-4"></div>
               {[1,2,3].map(i => (
                  <div key={i} className="h-32 bg-gray-800 rounded-xl mb-4"></div>
               ))}
             </div>
          )}

          {result && (
            <div className="animate-fadeIn">
               {/* Header Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{result.title || 'Untitled Script'}</h2>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-1">{result.synopsis}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                   {/* EDIT TOGGLE BUTTON */}
                   <button 
                      onClick={() => setIsEditing(!isEditing)} 
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center transition-colors ${isEditing ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}
                   >
                      {isEditing ? <CheckCircle2 size={14} className="mr-2"/> : <Edit3 size={14} className="mr-2"/>}
                      {isEditing ? 'Done Editing' : 'Edit Text'}
                   </button>

                   <button 
                      onClick={handleSaveProject} 
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center shadow-lg transition-all hover:scale-105"
                   >
                      <Save size={14} className="mr-2"/> Save Script
                   </button>
                   <button onClick={copyToClipboard} className="btn-secondary text-xs"><Copy size={14} className="mr-1"/> {t('script.export_text')}</button>
                   <button 
                     onClick={handleViralAnalysis} 
                     disabled={isAnalyzing}
                     className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center transition-colors"
                   >
                      {isAnalyzing ? <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white mr-1"/> : <TrendingUp size={14} className="mr-1" />}
                      {t('script.analyze_viral')}
                   </button>
                   
                   {/* MAIN WORKFLOW ACTION */}
                   <button 
                     onClick={handleSendToAgent} 
                     className="bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center transition-all shadow-lg shadow-brand-500/30 ml-2"
                   >
                      <Bot size={16} className="mr-2" /> Send to AI Director
                   </button>
                </div>
              </div>

              {/* Scenes List */}
              <div className="space-y-6">
                {result.scenes?.map((scene: any, idx: number) => (
                  <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors shadow-md">
                    {/* Scene Header */}
                    <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scene {scene.sceneNumber} • {scene.durationSeconds}s</span>
                       <div className="flex gap-1">
                          {/* Rewrite Visual Button */}
                          <div className="relative group">
                              <button 
                                className="p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-brand-400 transition-colors"
                                title="Rewrite Visuals"
                              >
                                <RefreshCw size={14} />
                              </button>
                              {/* Dropdown for rewrite options */}
                              <div className="absolute right-0 top-full mt-1 w-32 bg-gray-800 border border-gray-700 rounded shadow-xl py-1 hidden group-hover:block z-10">
                                 {['shorter', 'detailed', 'cinematic'].map(opt => (
                                    <button 
                                       key={opt} 
                                       onClick={() => handleRewrite(idx, 'visual', opt)}
                                       className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                                    >
                                       {opt}
                                    </button>
                                 ))}
                              </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                        {/* Visual Column */}
                        <div className="p-4 relative">
                           <div className="flex items-center mb-2 text-blue-400">
                              <Video size={14} className="mr-2" />
                              <span className="text-xs font-bold uppercase">{t('script.visual')}</span>
                           </div>
                           
                           {rewritingScene?.idx === idx && rewritingScene?.type === 'visual' ? (
                              <div className="text-xs text-gray-500 animate-pulse">Rewriting with AI...</div>
                           ) : (
                              <>
                                 {isEditing ? (
                                    <textarea 
                                       className="w-full bg-gray-900 p-2 rounded text-sm text-gray-300 border border-gray-700 outline-none focus:border-brand-500"
                                       rows={4}
                                       value={scene.visual}
                                       onChange={(e) => updateScene(idx, 'visual', e.target.value)}
                                    />
                                 ) : (
                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{scene.visual}</p>
                                 )}
                                 <button 
                                    onClick={() => handleVisualize(scene.visual)}
                                    className="mt-3 text-xs bg-blue-900/20 text-blue-400 px-3 py-1.5 rounded border border-blue-500/20 flex items-center hover:bg-blue-900/40 transition-colors w-fit"
                                 >
                                    <Video size={12} className="mr-1.5" /> {t('script.btn_visualize')}
                                 </button>
                              </>
                           )}
                        </div>

                        {/* Audio Column */}
                        <div className="p-4 relative bg-gray-900/20">
                           <div className="flex items-center mb-2 text-purple-400">
                              <Mic size={14} className="mr-2" />
                              <span className="text-xs font-bold uppercase">{t('script.audio')}</span>
                           </div>

                           {rewritingScene?.idx === idx && rewritingScene?.type === 'audio' ? (
                              <div className="text-xs text-gray-500 animate-pulse">Rewriting with AI...</div>
                           ) : (
                              <>
                                 {isEditing ? (
                                    <textarea 
                                       className="w-full bg-gray-900 p-2 rounded text-sm text-gray-300 border border-gray-700 outline-none focus:border-brand-500"
                                       rows={4}
                                       value={scene.audio}
                                       onChange={(e) => updateScene(idx, 'audio', e.target.value)}
                                    />
                                 ) : (
                                    <p className="text-sm text-brand-100 italic leading-relaxed">"{scene.audio}"</p>
                                 )}
                                 <button 
                                    onClick={() => handlePlayAudio(scene.audio, idx)}
                                    className={`mt-3 text-xs px-3 py-1.5 rounded border flex items-center transition-colors w-fit ${playingAudioIdx === idx ? 'bg-purple-600 text-white border-purple-500' : 'bg-purple-900/20 text-purple-400 border-purple-500/20 hover:bg-purple-900/40'}`}
                                 >
                                    {playingAudioIdx === idx ? <div className="animate-pulse flex items-center"><Volume2 size={12} className="mr-1.5" /> Playing...</div> : <div className="flex items-center"><Play size={12} className="mr-1.5" /> {t('script.btn_speak')}</div>}
                                 </button>
                              </>
                           )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viral Report */}
          {viralReport && (
             <div className="mt-8 animate-slideInRight bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6">
                <h3 className="text-lg font-bold text-white flex items-center mb-4">
                   <TrendingUp className="mr-2 text-green-400" /> Viral Analysis Report
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gray-950 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-white mb-1">{viralReport.totalScore}/100</div>
                      <div className="text-xs text-gray-500 uppercase">Total Viral Score</div>
                   </div>
                   <div className="col-span-2 space-y-2">
                      <p className="text-sm text-gray-300"><strong className="text-white">Hook:</strong> {viralReport.hookScore}/10 - Essential for retention.</p>
                      <p className="text-sm text-gray-300"><strong className="text-white">Retention:</strong> {viralReport.retentionScore}/10 - Structure pacing.</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                         {viralReport.hashtags?.map((tag, i) => (
                            <span key={i} className="text-xs text-blue-400">#{tag.replace('#','')}</span>
                         ))}
                      </div>
                   </div>
                </div>
                <div className="mt-4 bg-gray-950 p-4 rounded-lg border border-gray-800">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Suggestions</h4>
                   <ul className="space-y-1">
                      {viralReport.suggestions?.map((s, i) => (
                         <li key={i} className="text-sm text-gray-300 flex items-start"><CheckCircle2 size={14} className="mr-2 mt-0.5 text-green-500 flex-shrink-0"/> {s}</li>
                      ))}
                   </ul>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptGenerator;