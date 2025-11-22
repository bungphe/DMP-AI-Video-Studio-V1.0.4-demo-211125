import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Clapperboard, ArrowRight, BrainCircuit } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  const [stage, setStage] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Sequence timing
    const timings = [
      2000, // Stage 0: Presenting
      3000, // Stage 1: The Future
      3500, // Stage 2: Technology
      99999 // Stage 3: Logo Reveal (Wait for user)
    ];

    let timeout: ReturnType<typeof setTimeout>;

    if (stage < 3) {
      timeout = setTimeout(() => {
        setStage(prev => prev + 1);
      }, timings[stage]);
    }

    return () => clearTimeout(timeout);
  }, [stage]);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(onEnter, 1000); // Wait for exit animation
  };

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 z-0">
         {/* Gradient Orb */}
         <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[120px] transition-all duration-[3000ms] ${stage === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}></div>
         
         {/* Particle Dust (CSS Simulated) */}
         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
      </div>

      {/* STAGE 0: Intro Text */}
      <div className={`absolute z-10 transition-all duration-1000 transform ${stage === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
         <p className="text-gray-500 tracking-[0.5em] text-sm uppercase font-light">DMP AI Dev Presents</p>
      </div>

      {/* STAGE 1: Slogan */}
      <div className={`absolute z-10 text-center transition-all duration-1000 transform ${stage === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
         <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 leading-tight">
            The Future of <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-white">Filmmaking</span>
         </h2>
         <p className="text-gray-400 text-lg">Where Imagination Meets Intelligence.</p>
      </div>

      {/* STAGE 2: Tech Stack */}
      <div className={`absolute z-10 text-center transition-all duration-1000 transform ${stage === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
         <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-4 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-900/20">
                  <BrainCircuit className="text-blue-400" size={32} />
                  <div className="text-left">
                     <p className="text-xs text-gray-500 font-bold uppercase">Reasoning Engine</p>
                     <p className="text-xl font-bold text-white">Gemini 3.0 Pro</p>
                  </div>
               </div>
               <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-4 rounded-2xl flex items-center gap-3 shadow-2xl shadow-purple-900/20">
                  <Clapperboard className="text-purple-400" size={32} />
                  <div className="text-left">
                     <p className="text-xs text-gray-500 font-bold uppercase">Video Generation</p>
                     <p className="text-xl font-bold text-white">Google Veo 3.1</p>
                  </div>
               </div>
            </div>
            <p className="text-brand-200 text-sm tracking-widest uppercase mt-4 animate-pulse">Loading Assets...</p>
         </div>
      </div>

      {/* STAGE 3: Logo Reveal & Entry */}
      <div className={`absolute z-10 text-center transition-all duration-1000 transform w-full max-w-3xl px-4 ${stage >= 3 ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-lg pointer-events-none'}`}>
         
         {/* Logo Mark */}
         <div className="relative w-24 h-24 mx-auto mb-8 group cursor-default">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl rotate-3 group-hover:rotate-6 transition-transform duration-500 blur-lg opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/30">
               <span className="text-5xl font-black text-black">D</span>
            </div>
         </div>

         {/* Brand Name */}
         <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-2">
            DMP AI <span className="text-brand-500">STUDIO</span>
         </h1>
         <div className="h-1 w-24 bg-gradient-to-r from-transparent via-brand-500 to-transparent mx-auto mb-6"></div>
         
         <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Nền tảng sản xuất video chuyên nghiệp tự động hóa. <br/>
            Từ ý tưởng đến thước phim điện ảnh chỉ trong vài phút.
         </p>

         {/* CTA Button */}
         <button 
            onClick={handleEnter}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-transparent font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
         >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-full opacity-30 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400"></span>
            <span className="relative w-full h-full px-8 py-4 transition-all duration-200 bg-brand-600 rounded-full group-hover:bg-brand-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_50px_rgba(249,115,22,0.8)] flex items-center">
               <Sparkles className="mr-2 animate-pulse" size={20} />
               Truy cập Studio
               <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </span>
         </button>

         <div className="mt-12 flex justify-center gap-8 text-gray-600 text-xs font-mono uppercase tracking-widest">
            <span className="flex items-center"><Zap size={12} className="mr-2 text-yellow-500" /> Real-time</span>
            <span className="flex items-center"><BrainCircuit size={12} className="mr-2 text-blue-500" /> Reasoning</span>
            <span className="flex items-center"><Clapperboard size={12} className="mr-2 text-purple-500" /> Cinematic</span>
         </div>
      </div>

      {/* Skip Button (Visible early) */}
      {stage < 3 && (
         <button 
            onClick={() => setStage(3)}
            className="absolute bottom-8 right-8 text-gray-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors z-50"
         >
            Skip Intro
         </button>
      )}

    </div>
  );
};

export default WelcomeScreen;