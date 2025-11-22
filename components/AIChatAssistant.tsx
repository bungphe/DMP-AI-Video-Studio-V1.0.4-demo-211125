
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Mic, Send, Maximize2, Minimize2, Bot, Phone, PhoneOff, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import { useLanguage } from '../contexts/LanguageContext';
import { ChatMessage, AIModel } from '../types';

const AIChatAssistant: React.FC = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'text' | 'live'>('text');
  
  // Text Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Live Voice State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Refs for Live
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // --- AUDIO HELPERS (Local to keep component self-contained) ---
  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function createBlob(data: Float32Array): any {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    const bytes = new Uint8Array(int16.buffer);
    return {
      data: encode(bytes),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length; // Mono
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
       channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  // --- TEXT CHAT LOGIC ---
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       const systemPrompt = `You are DMP Studio's expert AI Assistant. 
       Your role is to help with: Video Prompt Engineering, Script Writing, Directing advice, and Technical support for the studio app.
       Be concise, professional, and creative. Current Language: ${language}`;

       const chat = ai.chats.create({
          model: AIModel.SCRIPT,
          config: { systemInstruction: systemPrompt }
       });

       // Feed history
       // Note: Real implementation would maintain a persistent chat session object
       // For this widget, we just send the last query with context if needed, 
       // or restart session. To keep it simple for this widget, we treat each as new or simple context.
       
       const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage.content });
       
       const aiMessage: ChatMessage = {
         id: (Date.now() + 1).toString(),
         role: 'model',
         content: response.text || "I couldn't generate a response.",
         timestamp: Date.now()
       };
       setMessages(prev => [...prev, aiMessage]);

    } catch (e) {
       console.error(e);
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Error connecting to AI.", timestamp: Date.now() }]);
    } finally {
       setIsTyping(false);
    }
  };

  // --- LIVE VOICE LOGIC ---
  const connectLive = async () => {
     if (isLiveConnected) return;
     
     try {
        if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
           await window.aistudio.openSelectKey();
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        mediaStreamRef.current = stream;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const sessionPromise = ai.live.connect({
           model: AIModel.LIVE,
           callbacks: {
              onopen: () => {
                 setIsLiveConnected(true);
                 // Setup input
                 const inputCtx = new AudioContextClass({ sampleRate: 16000 });
                 const source = inputCtx.createMediaStreamSource(stream);
                 const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                 processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Simple VAD for UI
                    let sum = 0;
                    for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
                    setIsSpeaking(sum / inputData.length > 0.01);

                    const pcmBlob = createBlob(inputData);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                 };
                 source.connect(processor);
                 processor.connect(inputCtx.destination);
                 processorRef.current = processor;
              },
              onmessage: async (msg: LiveServerMessage) => {
                 const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                 if (base64) {
                    setIsAiSpeaking(true);
                    const buffer = await decodeAudioData(decode(base64), audioContextRef.current!);
                    const source = audioContextRef.current!.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContextRef.current!.destination);
                    
                    const now = audioContextRef.current!.currentTime;
                    if(nextStartTimeRef.current < now) nextStartTimeRef.current = now;
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    
                    outputSourcesRef.current.add(source);
                    source.onended = () => {
                       outputSourcesRef.current.delete(source);
                       if(outputSourcesRef.current.size === 0) setIsAiSpeaking(false);
                    };
                 }
              },
              onclose: () => disconnectLive(),
              onerror: (e) => { console.error(e); disconnectLive(); }
           },
           config: {
             responseModalities: [Modality.AUDIO],
             systemInstruction: "You are a professional Video Director and Screenwriter. Help the user with short, concise advice."
           }
        });
        sessionRef.current = sessionPromise;
     } catch (e) {
        console.error("Live Connection Failed", e);
        alert("Could not connect to Live AI. Check permissions.");
     }
  };

  const disconnectLive = () => {
     setIsLiveConnected(false);
     setIsSpeaking(false);
     setIsAiSpeaking(false);
     if(mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
     }
     if(processorRef.current) {
        processorRef.current.disconnect();
     }
     if(audioContextRef.current) {
        audioContextRef.current.close();
     }
     outputSourcesRef.current.forEach(s => s.stop());
     outputSourcesRef.current.clear();
  };

  const toggleMode = () => {
     if (mode === 'live') disconnectLive();
     setMode(mode === 'text' ? 'live' : 'text');
  };

  // Auto-scroll to bottom
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
     if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
     }
  }, [messages, isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'w-[800px] h-[80vh]' : 'w-80 md:w-96 h-[500px]'}`}>
      
      {/* Header */}
      <div className="bg-gray-950 p-4 border-b border-gray-800 flex items-center justify-between">
         <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isLiveConnected ? 'bg-green-500 animate-pulse' : 'bg-brand-500'}`}></div>
            <h3 className="font-bold text-white text-sm">{t('assistant.title')}</h3>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white">
               {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
               <X size={18} />
            </button>
         </div>
      </div>

      {/* Mode Switcher */}
      <div className="p-2 bg-gray-900 border-b border-gray-800 flex">
         <button 
            onClick={() => { if(mode !== 'text') toggleMode(); }}
            className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${mode === 'text' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
         >
            {t('assistant.mode_chat')}
         </button>
         <button 
            onClick={() => { if(mode !== 'live') toggleMode(); }}
            className={`flex-1 py-2 text-xs font-bold rounded transition-colors flex items-center justify-center ${mode === 'live' ? 'bg-red-900/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
         >
            <Activity size={12} className="mr-1" /> {t('assistant.mode_live')}
         </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-4 relative">
         
         {/* LIVE MODE UI */}
         {mode === 'live' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
               <div className={`relative transition-all duration-500 ${isLiveConnected ? 'scale-100' : 'scale-90 opacity-50'}`}>
                  {/* Visualizer Orb */}
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.2)] ${isAiSpeaking ? 'bg-brand-500 shadow-brand-500/50 scale-110' : isSpeaking ? 'bg-green-500 shadow-green-500/50' : 'bg-gray-800 border-2 border-gray-700'}`}>
                     <Phone size={48} className="text-white" />
                  </div>
                  {isLiveConnected && (
                      <div className="absolute -bottom-8 left-0 right-0 text-xs font-mono text-brand-400 animate-pulse">
                         {isAiSpeaking ? t('assistant.speaking') : isSpeaking ? t('assistant.listening') : "Listening..."}
                      </div>
                  )}
               </div>

               <button 
                  onClick={isLiveConnected ? disconnectLive : connectLive}
                  className={`
                     px-8 py-3 rounded-full font-bold flex items-center shadow-lg transition-transform active:scale-95
                     ${isLiveConnected ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-brand-600 text-white hover:bg-brand-500'}
                  `}
               >
                  {isLiveConnected ? <PhoneOff className="mr-2" /> : <Phone className="mr-2" />}
                  {isLiveConnected ? "End Call" : "Start Call"}
               </button>
            </div>
         )}

         {/* TEXT MODE UI */}
         {mode === 'text' && (
            <div ref={chatContainerRef} className="space-y-4 h-full overflow-y-auto pb-4">
               {messages.length === 0 && (
                  <div className="text-center text-gray-600 mt-10">
                     <Bot size={48} className="mx-auto mb-2 opacity-20" />
                     <p className="text-sm">{t('assistant.desc')}</p>
                  </div>
               )}
               {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                        {msg.content}
                     </div>
                  </div>
               ))}
               {isTyping && (
                  <div className="flex justify-start">
                     <div className="bg-gray-800 p-3 rounded-xl flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Footer (Input) - Only for Text Mode */}
      {mode === 'text' && (
         <div className="p-4 bg-gray-950 border-t border-gray-800">
            <div className="flex gap-2">
               <input 
                  type="text"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none"
                  placeholder={t('assistant.input_placeholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               />
               <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 text-white p-2 rounded-lg"
               >
                  <Send size={18} />
               </button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AIChatAssistant;
