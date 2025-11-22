
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitBranch, Play, Plus, Save, Trash2, Video, ArrowRight, Film, Layout, Target, MonitorPlay, X, Move, Mic, Zap, ZoomIn, ZoomOut, BrainCircuit, Volume2 } from 'lucide-react';
import { generateVideo, generateInteractiveStoryStructure, generateSpeech, bufferToWave } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { StoryNode, AIVoices } from '../types';
import { useToast } from '../components/Layout';

const InteractiveStory: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  
  // --- STATE ---
  const [nodes, setNodes] = useState<StoryNode[]>([
    {
      id: 'start',
      title: 'The Beginning',
      prompt: 'A mysterious ancient gate standing in a foggy forest, glowing runes on the stone.',
      narratorText: 'You stand before the ancient gate. A low hum vibrates through the ground.',
      choices: [],
      isStart: true,
      x: 100,
      y: 300
    }
  ]);
  
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [storyPremise, setStoryPremise] = useState('');
  
  // Canvas State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Play Mode
  const [isPlaying, setIsPlaying] = useState(false);
  const [playNodeId, setPlayNodeId] = useState<string | null>(null);
  const [playVideoEnded, setPlayVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [timer, setTimer] = useState(100);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeNode = useMemo(() => nodes.find(n => n.id === activeNodeId), [nodes, activeNodeId]);

  // --- CANVAS LOGIC ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(0.5, s * delta), 2));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking background
    if ((e.target as HTMLElement).closest('.node-card')) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setIsDraggingNode(nodeId);
    setActiveNodeId(nodeId);
    // Initial logic for drag offset could be added here for smoother drag
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingNode) {
      const nodeIndex = nodes.findIndex(n => n.id === isDraggingNode);
      if (nodeIndex === -1) return;
      
      // Calculate delta in canvas space
      const dx = e.movementX / scale;
      const dy = e.movementY / scale;
      
      const newNodes = [...nodes];
      newNodes[nodeIndex] = {
        ...newNodes[nodeIndex],
        x: (newNodes[nodeIndex].x || 0) + dx,
        y: (newNodes[nodeIndex].y || 0) + dy
      };
      setNodes(newNodes);
    }
  };

  const handleGlobalMouseUp = () => {
    setIsDraggingCanvas(false);
    setIsDraggingNode(null);
  };

  // --- NODE OPERATIONS ---

  const handleAIArchitect = async () => {
    if (!storyPremise) return;
    setIsGenerating(true);
    try {
      const newNodes = await generateInteractiveStoryStructure(storyPremise, language);
      // Merge or replace? Let's replace for a clean slate or merge if sophisticated.
      // Replacing is safer for the demo to avoid ID conflicts.
      setNodes(newNodes);
      showToast("Story structure generated successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Architect failed to design story.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateNode = (field: keyof StoryNode, value: any) => {
    setNodes(prev => prev.map(n => n.id === activeNodeId ? { ...n, [field]: value } : n));
  };

  const handleAddChoice = () => {
    if (!activeNode) return;
    const newNodeId = `node_${Date.now()}`;
    const newChoice = {
       id: `choice_${Date.now()}`,
       label: 'New Decision',
       nextNodeId: newNodeId
    };
    
    // Create linked node with offset position
    const newNode: StoryNode = {
       id: newNodeId,
       title: `Scene: ${newChoice.label}`,
       prompt: '',
       choices: [],
       x: (activeNode.x || 0) + 350,
       y: (activeNode.y || 0) + (activeNode.choices.length * 100)
    };
    
    setNodes(prev => [...prev, newNode]);
    handleUpdateNode('choices', [...activeNode.choices, newChoice]);
  };

  const handleDeleteNode = (id: string) => {
     if (confirm("Delete this node?")) {
        setNodes(prev => prev.filter(n => n.id !== id));
        if (activeNodeId === id) setActiveNodeId(null);
     }
  };

  const handleGenerateVideo = async () => {
     if (!activeNode || !activeNode.prompt) return;
     setIsGenerating(true);
     try {
        // Use Veo fast for speed
        const url = await generateVideo(activeNode.prompt, () => {}, [], { resolution: '720p', aspectRatio: '16:9', duration: '5s', fps: '24' });
        if (url) {
           handleUpdateNode('videoUrl', url);
           showToast("Video generated!", "success");
        }
     } catch (e) {
        console.error(e);
        showToast("Generation failed.", "error");
     } finally {
        setIsGenerating(false);
     }
  };

  const handleGenerateAudio = async () => {
     if (!activeNode || !activeNode.narratorText) return;
     setIsGeneratingAudio(true);
     
     if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
     }

     try {
        const buffer = await generateSpeech(activeNode.narratorText, activeNode.voiceId || 'Puck', audioContextRef.current);
        const blob = bufferToWave(buffer, buffer.length);
        const url = URL.createObjectURL(blob);
        handleUpdateNode('audioUrl', url);
        showToast("Voiceover generated!", "success");
     } catch(e) {
        console.error(e);
        showToast("Audio gen failed.", "error");
     } finally {
        setIsGeneratingAudio(false);
     }
  };

  // --- PLAY MODE LOGIC ---

  const handleStartPlay = () => {
     const startNode = nodes.find(n => n.isStart) || nodes[0];
     if (!startNode) return;
     setPlayNodeId(startNode.id);
     setIsPlaying(true);
     setPlayVideoEnded(false);
     setTimer(100);
  };

  const playCurrentNode = (node: StoryNode) => {
     // Reset
     setPlayVideoEnded(false);
     setTimer(100);
     
     // Audio
     if (node.audioUrl && audioRef.current) {
        audioRef.current.src = node.audioUrl;
        audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
     }
  };

  useEffect(() => {
     if (isPlaying && playNodeId) {
        const node = nodes.find(n => n.id === playNodeId);
        if (node) playCurrentNode(node);
     }
  }, [playNodeId, isPlaying]);

  // Timer countdown
  useEffect(() => {
     let interval: any;
     if (isPlaying && playVideoEnded) {
        interval = setInterval(() => {
           setTimer(prev => Math.max(0, prev - 1));
        }, 100); // Fast countdown for effect
     }
     return () => clearInterval(interval);
  }, [isPlaying, playVideoEnded]);

  // --- RENDER SVG CONNECTIONS ---
  const renderConnections = () => {
     return nodes.map(node => (
        <React.Fragment key={node.id}>
           {node.choices.map(choice => {
              const target = nodes.find(n => n.id === choice.nextNodeId);
              if (!target) return null;
              
              // Calculate Bezier
              const startX = (node.x || 0) + 250; // Width of card approx
              const startY = (node.y || 0) + 50;  // Half height
              const endX = target.x || 0;
              const endY = (target.y || 0) + 50;
              
              const cp1X = startX + 100;
              const cp1Y = startY;
              const cp2X = endX - 100;
              const cp2Y = endY;
              
              const path = `M ${startX} ${startY} C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${endX} ${endY}`;
              
              return (
                 <g key={choice.id}>
                    <path d={path} stroke="#3b82f6" strokeWidth="3" fill="none" className="opacity-50" />
                    <circle cx={endX} cy={endY} r="4" fill="#60a5fa" />
                 </g>
              );
           })}
        </React.Fragment>
     ));
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-[#0a0a0a] overflow-hidden relative">
       
       {/* TOOLBAR */}
       <div className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
             <div className="flex items-center text-white font-bold text-lg">
                <GitBranch className="text-brand-400 mr-2" /> Interactive Story
             </div>
             <div className="h-6 w-px bg-gray-700 mx-2"></div>
             <div className="flex items-center bg-gray-800 rounded-lg p-1">
                <input 
                   type="text" 
                   placeholder="Premise: e.g. Cyberpunk Detective..." 
                   className="bg-transparent border-none text-xs text-white w-48 px-2 focus:outline-none"
                   value={storyPremise}
                   onChange={(e) => setStoryPremise(e.target.value)}
                />
                <button 
                   onClick={handleAIArchitect} 
                   disabled={isGenerating}
                   className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center transition-colors"
                >
                   <BrainCircuit size={14} className="mr-1" /> {isGenerating ? 'Thinking...' : 'Generate Tree'}
                </button>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-gray-800 rounded text-gray-400"><ZoomOut size={18}/></button>
             <span className="text-xs text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-gray-800 rounded text-gray-400"><ZoomIn size={18}/></button>
             <button 
                onClick={handleStartPlay}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg transition-transform hover:scale-105 ml-4"
             >
                <Play size={18} className="mr-2 fill-white" /> Play Mode
             </button>
          </div>
       </div>

       {/* MAIN WORKSPACE */}
       <div className="flex-1 flex overflow-hidden relative">
          
          {/* GRAPH CANVAS */}
          <div 
             className="flex-1 bg-[#050505] relative overflow-hidden cursor-grab active:cursor-grabbing"
             onMouseDown={handleCanvasMouseDown}
             onMouseMove={handleGlobalMouseMove}
             onMouseUp={handleGlobalMouseUp}
             onWheel={handleWheel}
             ref={canvasRef}
             style={{ 
                backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', 
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
             }}
          >
             <div 
                className="absolute top-0 left-0 w-full h-full origin-top-left"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
             >
                {/* Connections Layer */}
                <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                   {renderConnections()}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => (
                   <div 
                      key={node.id}
                      className={`
                         absolute w-64 bg-gray-900 border-2 rounded-xl shadow-2xl flex flex-col node-card
                         ${activeNodeId === node.id ? 'border-brand-500 ring-4 ring-brand-500/20 z-10' : 'border-gray-700 hover:border-gray-600 z-0'}
                      `}
                      style={{ left: node.x, top: node.y }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                   >
                      {/* Node Header */}
                      <div className={`p-3 border-b border-gray-800 flex justify-between items-center rounded-t-xl ${node.isStart ? 'bg-blue-900/20' : 'bg-gray-800/50'}`}>
                         <span className="text-xs font-bold text-white truncate max-w-[150px]">{node.title}</span>
                         {node.isStart && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded">START</span>}
                         {node.videoUrl && <Video size={12} className="text-green-400" />}
                      </div>
                      
                      {/* Node Body */}
                      <div className="p-3 space-y-2">
                         <p className="text-[10px] text-gray-400 line-clamp-3">{node.prompt || "No prompt set."}</p>
                         <div className="flex flex-wrap gap-1">
                            {node.choices.map((c, i) => (
                               <span key={i} className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700 truncate max-w-full">
                                  {c.label}
                               </span>
                            ))}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* INSPECTOR PANEL (Right Sidebar) */}
          {activeNode && (
             <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl z-10 animate-slideInRight">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                   <h3 className="font-bold text-white">Node Inspector</h3>
                   <button onClick={() => handleDeleteNode(activeNode.id)} className="text-red-400 hover:bg-red-900/20 p-1.5 rounded"><Trash2 size={16}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                   
                   {/* Text Data */}
                   <div className="space-y-3">
                      <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                         <input 
                            type="text" 
                            className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-brand-500 outline-none mt-1"
                            value={activeNode.title}
                            onChange={(e) => handleUpdateNode('title', e.target.value)}
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Visual Prompt (Veo)</label>
                         <textarea 
                            className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-brand-500 outline-none mt-1 h-24 resize-none"
                            value={activeNode.prompt}
                            onChange={(e) => handleUpdateNode('prompt', e.target.value)}
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Narrator Text</label>
                         <textarea 
                            className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-brand-500 outline-none mt-1 h-16 resize-none"
                            value={activeNode.narratorText || ''}
                            onChange={(e) => handleUpdateNode('narratorText', e.target.value)}
                         />
                      </div>
                   </div>

                   {/* Media Gen */}
                   <div className="space-y-3 border-t border-gray-800 pt-4">
                      <label className="text-xs font-bold text-brand-400 uppercase flex items-center"><Film size={12} className="mr-1"/> Media Production</label>
                      
                      {/* Video */}
                      <div className="bg-black rounded-lg overflow-hidden border border-gray-700 relative group">
                         {activeNode.videoUrl ? (
                            <video src={activeNode.videoUrl} className="w-full aspect-video object-cover" controls />
                         ) : (
                            <div className="w-full aspect-video flex items-center justify-center text-gray-600">
                               <MonitorPlay size={32} />
                            </div>
                         )}
                         {!activeNode.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={handleGenerateVideo} disabled={isGenerating} className="bg-brand-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg transform hover:scale-105 transition-transform">
                                  {isGenerating ? 'Generating...' : 'Generate Video'}
                               </button>
                            </div>
                         )}
                      </div>

                      {/* Audio */}
                      <div className="flex items-center gap-2">
                         <select 
                            className="bg-gray-800 text-xs text-white p-2 rounded border border-gray-700 flex-1"
                            value={activeNode.voiceId || AIVoices[0].id}
                            onChange={(e) => handleUpdateNode('voiceId', e.target.value)}
                         >
                            {AIVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                         </select>
                         <button 
                            onClick={handleGenerateAudio} 
                            disabled={isGeneratingAudio || !activeNode.narratorText}
                            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded border border-gray-700"
                         >
                            {isGeneratingAudio ? <Zap size={16} className="animate-spin"/> : <Mic size={16}/>}
                         </button>
                      </div>
                      {activeNode.audioUrl && (
                         <audio src={activeNode.audioUrl} controls className="w-full h-8" />
                      )}
                   </div>

                   {/* Choices */}
                   <div className="space-y-3 border-t border-gray-800 pt-4">
                      <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-gray-500 uppercase">Branching Choices</label>
                         <button onClick={handleAddChoice} className="text-xs text-brand-400 hover:text-white"><Plus size={12}/> Add</button>
                      </div>
                      {activeNode.choices.map((c, i) => (
                         <div key={c.id} className="bg-gray-800 p-2 rounded border border-gray-700 flex gap-2">
                            <input 
                               className="bg-transparent text-xs text-white font-bold flex-1 outline-none"
                               value={c.label}
                               onChange={(e) => {
                                  const newChoices = [...activeNode.choices];
                                  newChoices[i].label = e.target.value;
                                  handleUpdateNode('choices', newChoices);
                               }}
                            />
                            <ArrowRight size={12} className="text-gray-500 mt-1" />
                         </div>
                      ))}
                   </div>

                </div>
             </div>
          )}
       </div>

       {/* CINEMATIC PLAYER OVERLAY */}
       {isPlaying && (
          <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-fadeIn">
             <audio ref={audioRef} className="hidden" />
             {(() => {
                const currentNode = nodes.find(n => n.id === playNodeId);
                if (!currentNode) return <div className="text-white text-2xl font-mono animate-pulse">THE END</div>;

                return (
                   <div className="relative w-full h-full flex flex-col">
                      {/* Main Video */}
                      <div className="flex-1 relative bg-black">
                         {currentNode.videoUrl ? (
                            <video 
                               ref={videoRef}
                               src={currentNode.videoUrl} 
                               className="w-full h-full object-cover"
                               autoPlay 
                               onEnded={() => setPlayVideoEnded(true)}
                            />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-gray-900">
                               <div className="text-center">
                                  <p className="text-4xl font-bold mb-4">{currentNode.title}</p>
                                  <p className="text-gray-500 italic max-w-md mx-auto">{currentNode.narratorText}</p>
                                  <button onClick={() => setPlayVideoEnded(true)} className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm">Skip Scene</button>
                               </div>
                            </div>
                         )}
                         
                         {/* Cinematic Subtitles */}
                         {currentNode.narratorText && !playVideoEnded && (
                            <div className="absolute bottom-20 left-0 right-0 text-center px-10">
                               <p className="text-white text-xl font-medium drop-shadow-xl bg-black/40 inline-block px-4 py-2 rounded backdrop-blur-sm">
                                  {currentNode.narratorText}
                               </p>
                            </div>
                         )}
                      </div>

                      {/* Interactive Layer (Shows when video ends) */}
                      {playVideoEnded && (
                         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fadeIn">
                            <div className="max-w-4xl w-full px-6">
                               <h2 className="text-4xl font-bold text-white mb-12 text-center tracking-tight">What happens next?</h2>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {currentNode.choices.map(choice => (
                                     <button 
                                        key={choice.id}
                                        onClick={() => setPlayNodeId(choice.nextNodeId || null)}
                                        className="group relative overflow-hidden bg-white text-black p-8 rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] text-left"
                                     >
                                        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="text-2xl font-black relative z-10">{choice.label}</span>
                                        <ArrowRight className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-2" />
                                     </button>
                                  ))}
                               </div>

                               {currentNode.choices.length === 0 && (
                                  <div className="text-center">
                                     <p className="text-gray-400 mb-6">End of Story Line</p>
                                     <button onClick={() => setIsPlaying(false)} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full">Exit</button>
                                  </div>
                               )}

                               {/* Timer Bar */}
                               {currentNode.choices.length > 0 && (
                                  <div className="mt-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${timer}%` }}></div>
                                  </div>
                               )}
                            </div>
                         </div>
                      )}

                      <button 
                         onClick={() => setIsPlaying(false)}
                         className="absolute top-6 right-6 text-white/50 hover:text-white z-50 bg-black/20 p-2 rounded-full backdrop-blur"
                      >
                         <X size={24} />
                      </button>
                   </div>
                );
             })()}
          </div>
       )}
    </div>
  );
};

export default InteractiveStory;
