
import React, { useState } from 'react';
import { Grid3x3, Sparkles, ArrowRight, Copy, Share2, Download, Target, Package, BoxSelect, Video } from 'lucide-react';
import { generateCreativeMatrix } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { CreativeMatrix, MatrixItem } from '../types';
import { useNavigate } from 'react-router-dom';

const CreativeMatrixPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<CreativeMatrix | null>(null);
  const [selectedCell, setSelectedCell] = useState<MatrixItem | null>(null);

  const handleGenerate = async () => {
    if (!productName || !targetAudience) return;
    setLoading(true);
    setMatrix(null);
    setSelectedCell(null);
    try {
      const result = await generateCreativeMatrix(productName, targetAudience, language);
      setMatrix(result);
    } catch (e) {
      console.error(e);
      alert(t('common.error_boundary_desc'));
    } finally {
      setLoading(false);
    }
  };

  const handleExpandToScript = () => {
    if (!selectedCell) return;
    // Navigate to Script Generator with the content outline as the topic
    navigate('/script', { 
      state: { 
        topic: `${selectedCell.hook}: ${selectedCell.content_outline}`,
        audience: targetAudience 
      } 
    });
  };

  const getFormatIcon = (format: string) => {
    if (format.includes('Video')) return <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Video</span>;
    if (format.includes('Carousel')) return <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Carousel</span>;
    return <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Blog</span>;
  };

  const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text);
     alert("Copied!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Grid3x3 className="mr-3 text-brand-400" /> {t('matrix.title')}
          </h1>
          <p className="text-gray-400 mt-2">{t('matrix.desc')}</p>
        </div>
        {matrix && (
          <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors">
            <Download size={16} className="mr-2" /> Export Strategy (PDF/CSV)
          </button>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="relative">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
               <Package size={14} className="mr-1" /> {t('matrix.product_label')}
             </label>
             <input
               type="text"
               className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
               placeholder="e.g. Anti-Aging Night Cream"
               value={productName}
               onChange={(e) => setProductName(e.target.value)}
             />
           </div>
           
           <div className="relative">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
               <Target size={14} className="mr-1" /> {t('matrix.audience_label')}
             </label>
             <input
               type="text"
               className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
               placeholder="e.g. Women 30-45, busy professionals"
               value={targetAudience}
               onChange={(e) => setTargetAudience(e.target.value)}
             />
           </div>

           <div className="flex items-end">
             <button
               onClick={handleGenerate}
               disabled={loading || !productName || !targetAudience}
               className={`
                 w-full py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center h-[50px]
                 transition-all duration-200
                 ${loading 
                   ? 'bg-gray-800 cursor-not-allowed opacity-70' 
                   : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95'}
               `}
             >
               {loading ? (
                 <>
                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white mr-3"></div>
                   {t('matrix.generating')}
                 </>
               ) : (
                 <>
                   <Sparkles className="mr-2" /> {t('matrix.btn_generate')}
                 </>
               )}
             </button>
           </div>
        </div>
      </div>

      {/* Matrix Grid */}
      {matrix && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slideInUp">
          {/* Column Headers (Desktop) */}
          <div className="hidden lg:block col-span-full">
             <div className="grid grid-cols-5 gap-4 text-center">
                <div></div> {/* Empty corner */}
                {['Educational', 'Entertaining', 'Emotional', 'Promotional'].map(angle => (
                   <div key={angle} className="bg-gray-800/50 py-2 rounded text-xs font-bold text-brand-300 uppercase tracking-wider">
                      {angle}
                   </div>
                ))}
             </div>
          </div>

          {/* Rows */}
          {['Short Video', 'Carousel', 'Blog/Script'].map((format) => (
             <React.Fragment key={format}>
                {/* Row Header */}
                <div className="lg:col-span-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
                   <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-center lg:justify-end pr-6">
                      <h3 className="text-sm font-bold text-white flex items-center">
                         {format} <ArrowRight size={14} className="ml-2 text-gray-500 hidden lg:block" />
                      </h3>
                   </div>
                   
                   {['Educational', 'Entertaining', 'Emotional', 'Promotional'].map(angle => {
                      const item = matrix.items.find(i => i.angle === angle && i.format === format);
                      if (!item) return <div key={angle} className="hidden lg:block"></div>;
                      
                      return (
                         <div 
                           key={item.id}
                           onClick={() => setSelectedCell(item)}
                           className={`
                             bg-gray-950 border rounded-xl p-4 cursor-pointer transition-all hover:scale-105
                             flex flex-col justify-between min-h-[180px]
                             ${selectedCell?.id === item.id ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-900/10' : 'border-gray-800 hover:border-gray-600'}
                           `}
                         >
                            <div>
                               <div className="flex justify-between items-start mb-2 lg:hidden">
                                  <span className="text-[10px] text-gray-500">{angle}</span>
                                  {getFormatIcon(format)}
                               </div>
                               <h4 className="text-sm font-bold text-white mb-2 line-clamp-3 leading-snug">
                                  {item.hook}
                               </h4>
                               <p className="text-xs text-gray-400 line-clamp-3">
                                  {item.content_outline}
                               </p>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-800/50 flex justify-between items-center">
                               <span className="text-[10px] font-mono text-gray-500 uppercase">ID: {item.id.slice(-4)}</span>
                               <BoxSelect size={14} className="text-brand-500 opacity-0 group-hover:opacity-100" />
                            </div>
                         </div>
                      );
                   })}
                </div>
             </React.Fragment>
          ))}
        </div>
      )}

      {/* Detail View Modal / Slide-over */}
      {selectedCell && (
         <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCell(null)}>
            <div 
               className="bg-gray-900 h-full w-full max-w-md border-l border-gray-800 shadow-2xl p-6 flex flex-col animate-slideInRight"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h2 className="text-2xl font-bold text-white mb-1">{selectedCell.hook}</h2>
                     <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded font-medium">{selectedCell.angle}</span>
                        <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded font-medium">{selectedCell.format}</span>
                     </div>
                  </div>
                  <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-white">
                     <ArrowRight size={24} />
                  </button>
               </div>

               <div className="space-y-6 flex-1 overflow-y-auto">
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                     <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Content Outline</h3>
                     <p className="text-gray-200 text-sm leading-relaxed">
                        {selectedCell.content_outline}
                     </p>
                  </div>

                  <div className="bg-brand-900/20 p-4 rounded-xl border border-brand-500/20">
                     <h3 className="text-xs font-bold text-brand-400 uppercase mb-2">Call To Action (CTA)</h3>
                     <p className="text-white text-sm font-medium">
                        "{selectedCell.cta}"
                     </p>
                  </div>

                  <div>
                     <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Quick Actions</h3>
                     <div className="grid grid-cols-1 gap-3">
                        <button 
                           onClick={() => copyToClipboard(selectedCell.content_outline)}
                           className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                        >
                           <Copy size={16} className="mr-2" /> Copy Outline
                        </button>
                        {selectedCell.format.includes('Video') && (
                           <button className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white p-3 rounded-lg text-sm font-bold flex items-center justify-center shadow-lg">
                              <Video size={16} className="mr-2" /> Generate Video with Veo
                           </button>
                        )}
                        <button 
                           onClick={handleExpandToScript}
                           className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg text-sm font-bold flex items-center justify-center shadow-lg"
                        >
                           <Sparkles size={16} className="mr-2" /> Expand to Full Script
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default CreativeMatrixPage;
