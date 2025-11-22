
import React, { useState, useEffect, useRef } from 'react';
import { Book, Search, Copy, Video, FileText, Zap, Home, Heart, Camera, Star, Briefcase, Map, Smile, TrendingUp, Lightbulb, Users, Upload, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PROMPT_TEMPLATES } from '../utils/promptTemplates';
import { storageService } from '../services/storageService';
import { PromptTemplate } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeImageTags } from '../services/geminiService';

const PromptLibrary: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'library' | 'community' | 'assets'>('library');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  
  // Asset State
  const [assets, setAssets] = useState<{id: string, src: string, tags: string[]}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
     try {
        const saved = await storageService.getTemplates();
        setTemplates([...PROMPT_TEMPLATES, ...saved]);
     } catch (e) {
        console.warn("Failed to load custom templates", e);
        setTemplates([...PROMPT_TEMPLATES]);
     }
  };

  const categories = ['All', 'Viral', 'Architecture', 'Fashion', 'Real Estate', 'Travel', 'Business', 'Emotional', 'Trend', 'Inspirational', 'Custom'];

  const filteredTemplates = templates.filter(item => {
    const matchesSearch = (item.label?.toLowerCase().includes(search.toLowerCase()) || false) || 
                          (item.content?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const handleUseInVideo = (prompt: string) => {
    navigate('/video', { state: { prompt } });
  };

  const handleUseInScript = (topic: string) => {
    navigate('/script', { state: { topic } });
  };

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onloadend = async () => {
        const base64 = reader.result as string;
        const tags = await analyzeImageTags(base64.split(',')[1]);
        setAssets(prev => [...prev, { id: Date.now().toString(), src: base64, tags }]);
     };
     reader.readAsDataURL(file);
  };

  const getCategoryIcon = (cat: string) => {
     switch(cat) {
        case 'Viral': return <Zap size={14} />;
        case 'Architecture': return <Home size={14} />;
        case 'Real Estate': return <Home size={14} />;
        case 'Emotional': return <Heart size={14} />;
        case 'Fashion': return <Camera size={14} />;
        case 'Business': return <Briefcase size={14} />;
        case 'Travel': return <Map size={14} />;
        case 'Inspirational': return <Lightbulb size={14} />;
        case 'Trend': return <TrendingUp size={14} />;
        case 'Custom': return <Star size={14} />;
        default: return <Star size={14} />;
     }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Book className="mr-3 text-brand-400" /> {t('library.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('library.desc')}</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800">
         <button onClick={() => setActiveTab('library')} className={`pb-2 border-b-2 font-bold text-sm ${activeTab === 'library' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}>Library</button>
         <button onClick={() => setActiveTab('community')} className={`pb-2 border-b-2 font-bold text-sm ${activeTab === 'community' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}>Community Hub</button>
         <button onClick={() => setActiveTab('assets')} className={`pb-2 border-b-2 font-bold text-sm ${activeTab === 'assets' ? 'border-brand-500 text-white' : 'border-transparent text-gray-500'}`}>Smart Assets</button>
      </div>

      {/* Search & Filter Bar */}
      {activeTab === 'library' && (
         <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-lg mb-8 sticky top-4 z-30">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                     type="text"
                     className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                     placeholder={t('library.search_placeholder')}
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               
               <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar scroll-smooth">
                  {categories.map(cat => (
                     <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`
                           px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                           ${activeCategory === cat 
                              ? 'bg-brand-600 text-white border-brand-500' 
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}
                        `}
                     >
                        {cat}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* CONTENT */}
      {activeTab === 'library' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
               <div 
                  key={template.id} 
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col hover:border-brand-500/50 transition-all hover:shadow-lg group h-full"
               >
                  <div className="flex justify-between items-start mb-3">
                     <span className={`
                        flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border
                        ${template.category === 'Viral' ? 'bg-red-900/20 text-red-400 border-red-500/30' : 
                        template.category === 'Architecture' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' :
                        template.category === 'Business' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' :
                        'bg-gray-800 text-gray-400 border-gray-700'}
                     `}>
                        {getCategoryIcon(template.category)} {template.category}
                     </span>
                     {template.isCustom && <span className="text-[10px] text-brand-400 font-medium">My Template</span>}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-200 transition-colors line-clamp-1">
                     {template.label}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 flex-1 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                     {template.content}
                  </p>

                  <div className="flex gap-2 pt-4 border-t border-gray-800 mt-auto">
                     <button onClick={() => handleUseInVideo(template.content)} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center shadow-lg"><Video size={14} className="mr-1"/> Use Video</button>
                     <button onClick={() => handleUseInScript(template.content)} className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center border border-gray-700"><FileText size={14}/></button>
                     <button onClick={() => handleCopy(template.content)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg"><Copy size={16}/></button>
                  </div>
               </div>
            ))}
         </div>
      )}

      {activeTab === 'community' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mock Community Posts */}
            {[1,2,3,4,5].map(i => (
               <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative">
                  <div className="flex items-center mb-3">
                     <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-xs font-bold text-purple-300 mr-2">U{i}</div>
                     <div>
                        <p className="text-xs text-white font-bold">Creator_{i}</p>
                        <p className="text-[10px] text-gray-500">2h ago</p>
                     </div>
                  </div>
                  <p className="text-sm text-gray-300 italic mb-4">"Cinematic drone shot of a foggy forest..."</p>
                  <button className="w-full bg-gray-800 text-xs font-bold py-2 rounded text-gray-300 hover:text-white flex items-center justify-center">
                     <Users size={14} className="mr-2"/> Remix This
                  </button>
               </div>
            ))}
         </div>
      )}

      {activeTab === 'assets' && (
         <div>
            <div className="bg-gray-900 p-6 rounded-xl border border-dashed border-gray-700 text-center mb-8 cursor-pointer hover:bg-gray-800" onClick={() => fileInputRef.current?.click()}>
               <Upload className="mx-auto mb-2 text-gray-500"/>
               <p className="text-sm text-gray-400">Upload Image for Auto-Tagging</p>
               <input type="file" ref={fileInputRef} className="hidden" onChange={handleAssetUpload} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {assets.map(asset => (
                  <div key={asset.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group">
                     <img src={asset.src} className="w-full h-32 object-cover" />
                     <div className="p-2">
                        <div className="flex flex-wrap gap-1">
                           {asset.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 rounded flex items-center">
                                 <Tag size={8} className="mr-1"/> {tag}
                              </span>
                           ))}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
};

export default PromptLibrary;
