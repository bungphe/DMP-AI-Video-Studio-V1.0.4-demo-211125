
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Blob } from "@google/genai";
import { Mic, Radio, PhoneOff, Activity, Lightbulb, FileText, Video, VideoOff, MicOff, Trash2, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { BrainstormNote, AIModel } from '../types';
import { storageService } from '../services/storageService';

const LiveBrainstorm: React.FC = () => {
  const { t } = useLanguage();
  
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  // Data State
  const [notes, setNotes] = useState<BrainstormNote[]>([]);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const videoIntervalRef = useRef<number | null>(null);
  
  // Elements
  const canvasRef = useRef<HTMLCanvasElement>(null); // Audio Visualizer
  const videoRef = useRef<HTMLVideoElement>(null); // Camera Input
  const videoCanvasRef = useRef<HTMLCanvasElement>(null); // Frame Capture
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // --- HELPER FUNCTIONS ---

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function createAudioBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    return {
      data: encode(bytes),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  async function blobToBase64(blob: globalThis.Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  // Tool Definition
  const saveIdeaTool: FunctionDeclaration = {
    name: 'saveIdea',
    parameters: {
      type: Type.OBJECT,
      description: 'Save a creative idea, prompt, or to-do item to the users notes.',
      properties: {
        content: { type: Type.STRING, description: 'The concise content of the idea or task.' },
        type: { type: Type.STRING, enum: ['idea', 'todo'], description: 'Type of note.' }
      },
      required: ['content', 'type'],
    },
  };

  useEffect(() => {
    loadNotes();
    return () => {
      disconnect();
    };
  }, []);

  const loadNotes = async () => {
    try {
      const savedNotes = await storageService.getNotes();
      setNotes(savedNotes);
    } catch (e) {
      console.error("Failed to load notes", e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await storageService.deleteNote(id);
    loadNotes();
  };

  // Camera Management
  useEffect(() => {
    if (isCameraOn && isConnected) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isCameraOn, isConnected]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Start Frame Loop
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      
      videoIntervalRef.current = window.setInterval(() => {
         sendVideoFrame();
      }, 1000); // 1 FPS is enough for brainstorming context

    } catch (e) {
      console.error("Camera Error", e);
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const sendVideoFrame = () => {
    if (!videoRef.current || !videoCanvasRef.current || !sessionRef.current) return;
    
    const video = videoRef.current;
    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const base64 = await blobToBase64(blob);
        sessionRef.current.then((session: any) => {
           try {
             session.sendRealtimeInput({
               media: { data: base64, mimeType: 'image/jpeg' }
             });
           } catch (e) {
             console.warn("Failed to send frame", e);
           }
        });
      }
    }, 'image/jpeg', 0.6);
  };

  const connect = async () => {
    try {
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
         await window.aistudio.openSelectKey();
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: AIModel.LIVE,
        callbacks: {
           onopen: () => {
              console.log("Session Opened");
              setIsConnected(true);
              setupAudioInput(stream, sessionPromise);
              visualize();
           },
           onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                 playAudioOutput(base64Audio);
                 setIsAiSpeaking(true);
              }

              if (message.serverContent?.turnComplete) {
                 setIsAiSpeaking(false);
              }
              
              if (message.toolCall) {
                 for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'saveIdea') {
                       const args = fc.args as any;
                       const newNote: BrainstormNote = {
                          id: Date.now().toString(),
                          timestamp: Date.now(),
                          content: args.content,
                          type: args.type
                       };
                       setNotes(prev => [newNote, ...prev]);
                       storageService.saveNote(newNote); // Persist
                       
                       sessionPromise.then(session => {
                          session.sendToolResponse({
                             functionResponses: {
                                id: fc.id, name: fc.name, response: { result: "Saved" }
                             }
                          });
                       });
                    }
                 }
              }
           },
           onclose: () => disconnect(),
           onerror: (e) => { console.error(e); disconnect(); }
        },
        config: {
           responseModalities: [Modality.AUDIO],
           tools: [{ functionDeclarations: [saveIdeaTool] }],
           systemInstruction: "You are an expert Creative Director (Gemini 3.0 Powered). Brainstorm video ideas. If the user likes an idea, ask to save it. Use the camera input to give feedback on visual objects if visible. Keep responses concise and conversational."
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Connection Failed", e);
      alert("Failed to connect. Check permissions and API Key.");
    }
  };

  const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
     if (!audioContextRef.current) return;
     const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
     const source = inputCtx.createMediaStreamSource(stream);
     const processor = inputCtx.createScriptProcessor(4096, 1, 1);
     
     processor.onaudioprocess = (e) => {
        if (!isMicOn) return; // Mute Logic

        const inputData = e.inputBuffer.getChannelData(0);
        
        // VAD for UI
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
        if ((sum / inputData.length) > 0.01) setIsSpeaking(true);
        else setIsSpeaking(false);

        const pcmBlob = createAudioBlob(inputData);
        sessionPromise.then(session => {
           session.sendRealtimeInput({ media: pcmBlob });
        });
     };

     source.connect(processor);
     processor.connect(inputCtx.destination);
     processorRef.current = processor;
  };

  const playAudioOutput = async (base64Audio: string) => {
     if (!audioContextRef.current) return;
     try {
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        
        if (analyserRef.current) {
           source.connect(analyserRef.current);
           analyserRef.current.connect(audioContextRef.current.destination);
        } else {
           source.connect(audioContextRef.current.destination);
        }
        
        const currentTime = audioContextRef.current.currentTime;
        if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        
        outputSourcesRef.current.add(source);
        source.onended = () => {
           outputSourcesRef.current.delete(source);
           if (outputSourcesRef.current.size === 0) setIsAiSpeaking(false);
        };
     } catch(e) { console.error(e); }
  };

  const disconnect = () => {
     setIsConnected(false);
     setIsSpeaking(false);
     setIsAiSpeaking(false);
     stopCamera();
     
     if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
     }
     if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
     }
     if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
     }
     outputSourcesRef.current.forEach(s => s.stop());
     outputSourcesRef.current.clear();
     cancelAnimationFrame(animFrameRef.current);
  };

  const visualize = () => {
     if (!analyserRef.current || !canvasRef.current) return;
     const ctx = canvasRef.current.getContext('2d');
     if (!ctx) return;
     const bufferLength = analyserRef.current.frequencyBinCount;
     const dataArray = new Uint8Array(bufferLength);
     
     const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current!.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, 400, 400);
        
        const centerX = 200;
        const centerY = 200;
        const radius = 60;
        
        // Base Orb
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, isConnected ? '#4f46e5' : '#1f2937');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isConnected ? '#111827' : '#0b0f19';
        ctx.fill();

        if (isConnected) {
           let avg = 0;
           for(let i=0; i<bufferLength; i++) avg += dataArray[i];
           avg = avg / bufferLength;
           const scale = 1 + (avg / 100);
           
           // Reactive Ring
           ctx.beginPath();
           ctx.arc(centerX, centerY, radius * scale, 0, 2 * Math.PI);
           ctx.strokeStyle = isAiSpeaking ? '#818cf8' : (isSpeaking ? '#34d399' : '#4f46e5');
           ctx.lineWidth = 4;
           ctx.stroke();
           
           // Glow
           ctx.shadowBlur = 20;
           ctx.shadowColor = ctx.strokeStyle;
           ctx.stroke();
           ctx.shadowBlur = 0;
        }
     };
     draw();
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      
      {/* Hidden Video Elements */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas ref={videoCanvasRef} className="hidden" />

      {/* Left: Live Interface */}
      <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 relative overflow-hidden flex flex-col">
         <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className={`flex items-center px-3 py-1 rounded-full border ${isConnected ? 'bg-brand-900/50 border-brand-500 text-brand-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
               <Activity size={14} className={`mr-2 ${isConnected ? 'animate-pulse' : ''}`} />
               <span className="text-xs font-bold uppercase">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            {/* Realtime Badge */}
            <div className="flex items-center px-3 py-1 rounded-full border bg-blue-900/30 border-blue-500/50 text-blue-300">
               <Zap size={12} className="mr-1" />
               <span className="text-xs font-bold uppercase">Realtime 3.0</span>
            </div>
            {isCameraOn && (
               <div className="flex items-center px-3 py-1 rounded-full border bg-red-900/50 border-red-500 text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs font-bold uppercase">Camera On</span>
               </div>
            )}
         </div>
         
         {/* Visualizer Center */}
         <div className="flex-1 flex flex-col items-center justify-center relative">
            <canvas ref={canvasRef} width={400} height={400} className="w-full h-full absolute inset-0" />
            
            <div className={`relative z-10 pointer-events-none transition-all duration-500 ${isConnected ? 'scale-110' : 'scale-100 opacity-50'}`}>
               <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] ${isAiSpeaking ? 'bg-brand-500' : 'bg-gray-800 border-2 border-gray-700'}`}>
                   <Radio size={48} className="text-white" />
               </div>
            </div>
            
            <div className="mt-12 text-center h-8 relative z-10">
               {isConnected && (
                  <p className="text-brand-200 font-medium animate-pulse">
                     {isAiSpeaking ? t('live.speaking') : isSpeaking ? t('live.listening') : "Listening..."}
                  </p>
               )}
            </div>
         </div>
         
         {/* Controls */}
         <div className="p-6 bg-gray-950/50 border-t border-gray-800 flex justify-center items-center gap-4">
            {!isConnected ? (
               <button 
                  onClick={connect}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-brand-600/20 flex items-center transition-transform active:scale-95"
               >
                  <Mic className="mr-2" /> {t('live.btn_connect')}
               </button>
            ) : (
               <>
                 <button onClick={() => setIsMicOn(!isMicOn)} className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-gray-800 text-white' : 'bg-red-500/20 text-red-400'}`}>
                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                 </button>

                 <button 
                    onClick={disconnect}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 px-8 py-4 rounded-full font-bold text-lg flex items-center transition-colors"
                 >
                    <PhoneOff className="mr-2" /> {t('live.btn_disconnect')}
                 </button>

                 <button onClick={() => setIsCameraOn(!isCameraOn)} className={`p-4 rounded-full transition-colors ${isCameraOn ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
                 </button>
               </>
            )}
         </div>
      </div>

      {/* Right: Notes & Logs */}
      <div className="w-full md:w-80 flex flex-col gap-4 h-full">
         <div className="bg-gray-900 rounded-xl border border-gray-800 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-gray-950/50">
               <h3 className="font-bold text-white flex items-center">
                  <Lightbulb className="mr-2 text-yellow-400" size={18} /> {t('live.notes_title')}
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {notes.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 text-sm">
                     <FileText className="mx-auto mb-2 opacity-50" />
                     {t('live.empty_notes')}
                  </div>
               ) : (
                  notes.map(note => (
                     <div key={note.id} className="bg-gray-800 p-3 rounded border border-gray-700 animate-fadeIn group relative">
                        <div className="flex justify-between items-start mb-1">
                           <span className={`text-[10px] px-1.5 rounded uppercase font-bold ${note.type === 'idea' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                              {note.type}
                           </span>
                           <span className="text-[10px] text-gray-500">{new Date(note.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-200 leading-relaxed pr-6">{note.content}</p>
                        <button 
                           onClick={() => handleDeleteNote(note.id)}
                           className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                           <Trash2 size={12} />
                        </button>
                     </div>
                  ))
               )}
            </div>
         </div>
         
         <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Commands</h4>
            <ul className="text-sm text-gray-400 space-y-1">
               <li>• "Save this idea..."</li>
               <li>• "Add to my todo list..."</li>
               <li>• "Can you see this object?"</li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default LiveBrainstorm;
