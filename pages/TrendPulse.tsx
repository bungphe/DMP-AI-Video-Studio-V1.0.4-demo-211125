
import React, { useState } from 'react';
import { Zap, Search, TrendingUp, ExternalLink, FileText, ArrowRight, Globe } from 'lucide-react';
import { getTrendingTopics } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { TrendItem } from '../types';
import { useNavigate } from 'react-router-dom';

const TrendPulse: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;
    
    setLoading(true);
    setTrends([]);
    try {
       const results = await getTrendingTopics(niche, language);
       setTrends(results);
    } catch (e) {
       console.error(e);
       alert("Could not fetch trends. Please check your API key and try again.");
    } finally {
       setLoading(false);
    }
  };

  const createScriptFromTrend = (trend: TrendItem) => {
      // In a real app, we'd pass state via router location or a global store
      // Here we alert for demo, or navigate to script page
      // We'll copy the hook to clipboard for now as a bridge
      navigator.clipboard.writeText(trend.video_hook);
      alert("Video Hook copied! Paste it into Script Generator.");
      navigate('/script');
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fadeIn">
       <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Zap className="mr-3 text-yellow-400 fill-yellow-400" /> {t('trend.title')}
        </h1>
        <p className="text-gray-400 mt-2">{t('trend.desc')}</p>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-lg mb-10">
         <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-500" size={20} />
               </div>
               <input 
                  type="text" 
                  className="w-full pl-10 bg-gray-950 border border-gray-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-brand-500 outline-none text-lg"
                  placeholder={t('trend.search_label')}
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
               />
            </div>
            <button 
               type="submit" 
               disabled={loading || !niche}
               className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
               {loading ? (
                  <div className="flex items-center">
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                     {t('trend.searching')}
                  </div>
               ) : (
                  <>
                     <Globe className="mr-2" size={20} /> {t('trend.btn_search')}
                  </>
               )}
            </button>
         </form>
      </div>

      {/* Results Grid */}
      {trends.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trends.map((trend, idx) => (
               <div 
                  key={idx} 
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col hover:border-brand-500/50 transition-all hover:shadow-xl hover:-translate-y-1 group"
               >
                  <div className="flex justify-between items-start mb-4">
                     <span className={`
                        text-[10px] font-bold uppercase px-2 py-1 rounded border
                        ${trend.volume === 'Exploding' ? 'bg-red-900/20 text-red-400 border-red-500/30' : 
                          trend.volume === 'Rising' ? 'bg-orange-900/20 text-orange-400 border-orange-500/30' : 
                          'bg-blue-900/20 text-blue-400 border-blue-500/30'}
                     `}>
                        {t(`trend.volume_${trend.volume.toLowerCase()}` as any) || trend.volume}
                     </span>
                     
                     {trend.sourceUrl && (
                        <a 
                           href={trend.sourceUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-gray-500 hover:text-brand-400 transition-colors"
                           title="View Source"
                        >
                           <ExternalLink size={16} />
                        </a>
                     )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-brand-200 transition-colors">
                     {trend.topic}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 flex-1">
                     {trend.summary}
                  </p>

                  <div className="bg-gray-950 p-3 rounded border border-gray-800 mb-4">
                     <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Viral Hook</p>
                     <p className="text-xs text-brand-100 italic">"{trend.video_hook}"</p>
                  </div>

                  {trend.sourceTitle && (
                     <div className="text-[10px] text-gray-600 mb-4 truncate">
                        {t('trend.source')} {trend.sourceTitle}
                     </div>
                  )}

                  <button 
                     onClick={() => createScriptFromTrend(trend)}
                     className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-lg font-bold text-sm flex items-center justify-center transition-colors"
                  >
                     <FileText size={16} className="mr-2" /> {t('trend.create_script')}
                  </button>
               </div>
            ))}
         </div>
      )}
      
      {!loading && trends.length === 0 && niche && (
          <div className="text-center text-gray-500 py-20">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
              <p>No trends found yet. Try a broader keyword like "Technology" or "Fashion".</p>
          </div>
      )}
    </div>
  );
};

export default TrendPulse;
