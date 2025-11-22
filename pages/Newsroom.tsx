import React, { useState } from 'react';
import { Tv, Edit3, Video, MonitorPlay, RefreshCw, Mic } from 'lucide-react';
import { generateNewsScript, generateVideo } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsScript, AIVoices } from '../types';

const Newsroom: React.FC = () => {
  const { t, language } = useLanguage();
  
  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState('Tech');
  const [scriptData, setScriptData] = useState<NewsScript | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isProducing, setIsProducing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [anchorId, setAnchorId] = useState(AIVoices[0].id);

  const handleGenerateScript = async () => {
    if (!headline) return;
    setIsGeneratingScript(true);
    try {
      const script = await generateNewsScript(headline, category, language);
      setScriptData(script);
    } catch (e) {
      console.error(e);
      alert("Failed to generate script.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleProduce = async () => {
    if (!scriptData) return;
    setIsProducing(true);
    try {
      // Use Veo to generate a video of the anchor or B-roll
      // Since Veo is text-to-video, we describe the scene
      const prompt = `Professional TV news anchor speaking in a modern studio. 
      Headline graphics visible: "${headline}". 
      Category: ${category}. 
      High quality, cinematic lighting, 4k resolution.
      ${scriptData.b_roll_prompt ? "Visuals include: " + scriptData.b_roll_prompt : ""}`;

      const url = await generateVideo(prompt, () => {}, [], { resolution: '720p', aspectRatio: '16:9' });
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      alert("Production failed.");
    } finally {
      setIsProducing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 h-[calc(100vh-100px)] flex flex-col animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Tv className="mr-3 text-brand-400" /> {t('newsroom.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('newsroom.desc')}</p>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Panel: Controls & Script */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col shadow-lg">
           
           {/* Step 1: Headline Input */}
           <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('newsroom.headline_label')}</label>
              <div className="flex gap-2">
                 <input 
                    type="text" 
                    className="flex-1 bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none"
                    placeholder={t('newsroom.headline_placeholder')}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                 />
                 <select 
                    className="bg-gray-800 text-white text-sm rounded-lg border border-gray-700 px-3 outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                 >
                    {['Tech', 'Finance', 'World', 'Sport', 'Entertainment'].map(c => (
                       <option key={c} value={c}>{c}</option>
                    ))}
                 </select>
              </div>
              {!scriptData && (
                 <button 
                    onClick={handleGenerateScript} 
                    disabled={isGeneratingScript || !headline}
                    className="mt-4 w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
                 >
                    {isGeneratingScript ? <RefreshCw className="animate-spin mr-2" /> : <Edit3 className="mr-2" />}
                    {t('newsroom.btn_write')}
                 </button>
              )}
           </div>

           {/* Step 2: Script Segments (Editable) */}
           {scriptData && (
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                 <div className="bg-gray-950 p-4 rounded border border-gray-800">
                    <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block">Intro (10s)</label>
                    <textarea 
                       className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none h-20 focus:text-white transition-colors"
                       value={scriptData.intro}
                       onChange={(e) => setScriptData({...scriptData, intro: e.target.value})}
                    />
                 </div>
                 <div className="bg-gray-950 p-4 rounded border border-gray-800 border-l-4 border-l-red-500">
                    <label className="text-[10px] text-red-400 font-bold uppercase mb-2 block">Main Body (20s)</label>
                    <textarea 
                       className="w-full bg-transparent text-white text-sm outline-none resize-none h-40 leading-relaxed"
                       value={scriptData.body}
                       onChange={(e) => setScriptData({...scriptData, body: e.target.value})}
                    />
                 </div>
                 <div className="bg-gray-950 p-4 rounded border border-gray-800">
                    <label className="text-[10px] text-green-400 font-bold uppercase mb-2 block">Outro (5s)</label>
                    <textarea 
                       className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none h-16 focus:text-white transition-colors"
                       value={scriptData.outro}
                       onChange={(e) => setScriptData({...scriptData, outro: e.target.value})}
                    />
                 </div>
                 <div className="bg-gray-950 p-4 rounded border border-gray-800 border-l-4 border-l-purple-500">
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block">B-Roll Visual Prompt</label>
                    <textarea 
                       className="w-full bg-transparent text-gray-300 text-xs outline-none resize-none h-24 font-mono"
                       value={scriptData.b_roll_prompt}
                       onChange={(e) => setScriptData({...scriptData, b_roll_prompt: e.target.value})}
                       placeholder="Describe the background image to generate..."
                    />
                 </div>
                 
                 <div className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-gray-400 uppercase">{t('newsroom.anchor_label')}</label>
                        <select 
                           value={anchorId}
                           onChange={(e) => setAnchorId(e.target.value)}
                           className="bg-gray-800 text-white text-xs p-2 rounded border border-gray-700"
                        >
                           {AIVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    
                    <button 
                       onClick={handleProduce} 
                       disabled={isProducing}
                       className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-bold flex items-center justify-center shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                    >
                       {isProducing ? <RefreshCw className="animate-spin mr-2" /> : <Video className="mr-2" />}
                       {t('newsroom.btn_produce')}
                    </button>
                 </div>
              </div>
           )}
        </div>

        {/* Right Panel: Preview/Teleprompter */}
        <div className="w-[400px] bg-black rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl relative">
           <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse z-10">
              {t('newsroom.on_air')}
           </div>
           
           <div className="flex-1 relative flex items-center justify-center">
              {videoUrl ? (
                 <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
              ) : (
                 <div className="text-center p-8">
                    <MonitorPlay size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Production Preview</p>
                 </div>
              )}
           </div>

           {/* Teleprompter Overlay (Simulated) */}
           {scriptData && !videoUrl && (
              <div className="h-1/3 bg-gray-900 border-t border-gray-800 p-4 overflow-y-auto relative">
                 <div className="text-xs text-gray-500 mb-1 uppercase font-bold tracking-wider">{t('newsroom.teleprompter')}</div>
                 <p className="text-white text-lg font-bold leading-relaxed">
                    {scriptData.intro} {scriptData.body} {scriptData.outro}
                 </p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Newsroom;