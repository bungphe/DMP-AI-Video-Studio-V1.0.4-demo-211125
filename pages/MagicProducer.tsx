import React, { useState } from 'react';
import { Sparkles, FileText, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { transformTextToVideoPlan } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { Project } from '../types';

const MagicProducer: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [inputContent, setInputContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<'idle' | 'analyzing' | 'planning' | 'success'>('idle');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const handleMagicProduce = async () => {
    if (!inputContent.trim()) return;
    
    setIsProcessing(true);
    setStage('analyzing');
    
    try {
      // 1. Generate Plan
      const plan = await transformTextToVideoPlan(inputContent, language);
      setStage('planning');

      // 2. Create Project Object
      const newProject: Project = {
        id: Date.now().toString(),
        title: plan.title || "Magic Video Project",
        type: 'magic',
        status: 'processing',
        createdAt: Date.now(),
        data: {
           result: plan, // Store script structure
           stage: 'pre_production',
           sourceContent: inputContent
        }
      };

      // 3. Save to Storage
      await storageService.saveProject(newProject);
      setCreatedProjectId(newProject.id);
      setStage('success');

    } catch (e) {
      console.error("Magic Producer Error", e);
      alert("Failed to produce video plan. Please try again.");
      setStage('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const goToProject = () => {
     navigate('/projects');
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fadeIn">
       <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-brand-500 to-purple-600 rounded-full shadow-2xl mb-6">
           <Sparkles size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">
           {t('magic.title')}
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
           {t('magic.desc')}
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
         {stage === 'success' ? (
            <div className="text-center py-10 animate-fadeIn">
               <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
               <h2 className="text-2xl font-bold text-white mb-2">{t('magic.success')}</h2>
               <p className="text-gray-400 mb-8">Your video plan, script, and scenes have been generated.</p>
               <button 
                  onClick={goToProject}
                  className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform hover:scale-105"
               >
                  {t('magic.view_project')} <ArrowRight className="inline-block ml-2" size={20} />
               </button>
            </div>
         ) : (
            <>
               <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                     {t('magic.input_label')}
                  </label>
                  <textarea 
                     className="w-full h-64 bg-gray-950 border border-gray-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none text-base leading-relaxed"
                     placeholder={t('magic.input_placeholder')}
                     value={inputContent}
                     onChange={(e) => setInputContent(e.target.value)}
                     disabled={isProcessing}
                  />
               </div>

               <button 
                  onClick={handleMagicProduce}
                  disabled={!inputContent || isProcessing}
                  className={`
                     w-full py-5 rounded-xl font-bold text-xl text-white flex items-center justify-center shadow-lg transition-all
                     ${!inputContent || isProcessing ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-brand-500/30 active:scale-[0.98]'}
                  `}
               >
                  {isProcessing ? (
                     <>
                        <Loader2 className="animate-spin mr-3" size={24} />
                        {stage === 'analyzing' ? t('magic.analyzing') : t('magic.planning')}
                     </>
                  ) : (
                     <>
                        <Sparkles className="mr-3" size={24} /> {t('magic.btn_produce')}
                     </>
                  )}
               </button>
            </>
         )}
         
         {/* Decorative background glow */}
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-purple-500"></div>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
         <div className="p-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-400">
               <FileText size={24} />
            </div>
            <h3 className="font-bold text-white mb-1">Auto Scripting</h3>
            <p className="text-xs text-gray-500">Converts unstructured text into professional video scripts.</p>
         </div>
         <div className="p-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
               <ArrowRight size={24} />
            </div>
            <h3 className="font-bold text-white mb-1">Instant Workflow</h3>
            <p className="text-xs text-gray-500">Automatically sets up your Kanban board project.</p>
         </div>
         <div className="p-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-green-400">
               <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-white mb-1">Ready to Render</h3>
            <p className="text-xs text-gray-500">Pre-fills Veo prompts for immediate generation.</p>
         </div>
      </div>
    </div>
  );
};

export default MagicProducer;