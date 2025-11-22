
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, Folder, Type, Film, Wand2, Bot, Settings, Menu, X, Globe, Mic, Scissors, Radio, Clapperboard, Grid3x3, Zap, Book, Youtube, Sparkles, CheckCircle2, AlertCircle, Info, MessageSquare, Calendar, Music, Search, Bell, Command, ChevronRight, ArrowRight, Home, Building, Key, Cloud, BarChart3, Tv, Headphones, GitBranch
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AIChatAssistant from './AIChatAssistant';
import { InfoModal } from './InfoModal';

// --- TOAST SYSTEM ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

interface LayoutProps {
  children: React.ReactNode;
}

// --- TOOL GROUPS DEFINITION ---
const TOOL_GROUPS = [
  {
    id: 'core',
    label: 'Quy trình Chính (Core Workflow)',
    color: 'text-brand-400',
    items: [
      { key: '/projects', icon: Folder, label: 'Quản lý Dự án', desc: 'Theo dõi tiến độ từ A-Z' },
      { key: '/magic', icon: Sparkles, label: 'Magic Producer', desc: 'Từ ý tưởng thô ra video' },
      { key: '/newsroom', icon: Tv, label: 'AI Newsroom', desc: 'Phòng tin tức ảo (Anchor)' },
      { key: '/real-estate', icon: Building, label: 'BĐS Virtual Tour', desc: 'Video chính chủ cho Môi giới' },
      { key: '/script', icon: Type, label: 'Kịch bản AI', desc: 'Viết kịch bản phân cảnh' },
      { key: '/agents', icon: Bot, label: 'Đạo diễn AI', desc: 'Tự động hóa sản xuất' },
      { key: '/video', icon: Film, label: 'Tạo Video (Veo)', desc: 'Generative Video AI' },
    ]
  },
  {
    id: 'creative',
    label: 'Công cụ Sáng tạo (Creative Tools)',
    color: 'text-blue-400',
    items: [
      { key: '/interactive', icon: GitBranch, label: 'Phim Tương Tác', desc: 'Choose your own adventure' },
      { key: '/podcast', icon: Headphones, label: 'Podcast Visualizer', desc: 'Biến audio thành video' },
      { key: '/studio', icon: Scissors, label: 'Studio Nhân vật', desc: 'Makeup, Fashion, Face' },
      { key: '/matrix', icon: Grid3x3, label: 'Ma trận Sáng tạo', desc: 'Chiến lược nội dung' },
      { key: '/trend', icon: Zap, label: 'Săn Xu Hướng', desc: 'Google Trends Live' },
      { key: '/live', icon: Radio, label: 'Họp Ý Tưởng Live', desc: 'Brainstorm giọng nói' },
    ]
  },
  {
    id: 'utility',
    label: 'Hỗ trợ & Hậu kỳ (Support)',
    color: 'text-green-400',
    items: [
      { key: '/post', icon: Wand2, label: 'Hậu kỳ (Editor)', desc: 'Cắt ghép & Chỉnh màu' },
      { key: '/audio', icon: Music, label: 'Phòng thu Audio', desc: 'Giọng đọc & SFX' },
      { key: '/clips', icon: Clapperboard, label: 'Viral Clipper', desc: 'Cắt video ngắn tự động' },
      { key: '/scheduler', icon: Calendar, label: 'Lịch đăng bài', desc: 'Quản lý xuất bản' },
      { key: '/library', icon: Book, label: 'Thư viện Prompt', desc: 'Lưu trữ mẫu câu lệnh' },
    ]
  }
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [initialInfoTab, setInitialInfoTab] = useState<'info' | 'workflow' | 'contact' | 'donate'>('info');
  
  // Search / Command Palette State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  
  // Global Tooltip State
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string | React.ReactNode, top: number, left: number } | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // API Key State
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'connected' | 'missing'>('checking');

  const { t, language, setLanguage } = useLanguage();

  // Keyboard Shortcut for Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // API Key Check
  const checkApiKey = async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeyStatus(hasKey ? 'connected' : 'missing');
      } catch (e) {
        setApiKeyStatus('missing');
      }
    } else {
      // Fallback for dev environments without the bridge, assume connected via env
      setApiKeyStatus('connected'); 
    }
  };

  useEffect(() => {
    checkApiKey();
    // Re-check when window gets focus (in case user selected key in another tab/window)
    window.addEventListener('focus', checkApiKey);
    return () => window.removeEventListener('focus', checkApiKey);
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Optimistically set connected, though the actual check might take a moment
        setApiKeyStatus('connected');
        showToast("Đã kết nối API Key!", "success");
      } catch (e) {
        console.error(e);
        showToast("Không thể mở hộp thoại Key", "error");
      }
    } else {
      showToast("Tính năng này chỉ khả dụng trên AI Studio Platform", "info");
    }
  };

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const menuItems = [
    { key: '/', icon: LayoutGrid, label: t('layout.dashboard') },
    { key: '/projects', icon: Folder, label: t('layout.projects') },
    { key: '/newsroom', icon: Tv, label: t('layout.newsroom') },
    { key: '/interactive', icon: GitBranch, label: 'Story Mode' },
    { key: '/podcast', icon: Headphones, label: 'Podcast' },
    { key: '/magic', icon: Sparkles, label: t('layout.magic_producer') },
    { key: '/script', icon: Type, label: t('layout.ai_script') },
    { key: '/video', icon: Film, label: t('layout.ai_video') },
    { key: '/agents', icon: Bot, label: t('layout.ai_agents') },
    { key: '/live', icon: Radio, label: t('layout.live_brainstorm') },
    { key: '/trend', icon: Zap, label: t('layout.trend_pulse') },
    { key: '/matrix', icon: Grid3x3, label: t('layout.creative_matrix') },
    { key: '/studio', icon: Scissors, label: t('layout.studio') },
    { key: '/audio', icon: Music, label: t('layout.ai_voice') },
    { key: '/clips', icon: Clapperboard, label: t('layout.ai_clips') },
    { key: '/post', icon: Wand2, label: t('layout.post_production') },
    { key: '/scheduler', icon: Calendar, label: 'Scheduler' },
    { key: '/library', icon: Book, label: t('layout.prompt_library') },
    { key: '/settings', icon: Settings, label: t('layout.settings') },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname === path;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
    showToast(language === 'vi' ? 'Switched to English' : 'Đã chuyển sang Tiếng Việt', 'info');
  };

  const handleMouseEnter = (e: React.MouseEvent, label: string | React.ReactNode) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      top: rect.bottom + 8, // Position below for top nav
      left: rect.left + (rect.width / 2)
    });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  // Filter tools based on search query
  const getFilteredTools = () => {
    if (!searchQuery) return TOOL_GROUPS;
    
    const lowerQuery = searchQuery.toLowerCase();
    return TOOL_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(lowerQuery) || 
        item.desc.toLowerCase().includes(lowerQuery)
      )
    })).filter(group => group.items.length > 0);
  };

  const handleToolClick = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const openInfoModal = (tab: 'info' | 'workflow' | 'contact' | 'donate' = 'info') => {
    setInitialInfoTab(tab);
    setInfoModalOpen(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-black text-gray-100 font-sans flex flex-col overflow-hidden selection:bg-brand-500/30 selection:text-brand-400">
        
        {/* --- GLOBAL TOASTS --- */}
        <div className="fixed top-20 right-6 z-[110] flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`
                pointer-events-auto flex items-center p-4 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-xl
                ${toast.type === 'success' ? 'bg-gray-900/80 border-gray-800 text-brand-400 ring-1 ring-brand-500/20' : 
                  toast.type === 'error' ? 'bg-gray-900/80 border-red-500/30 text-red-400 ring-1 ring-red-500/20' : 
                  'bg-gray-900/80 border-gray-800 text-white'}
              `}
            >
              {toast.type === 'success' && <CheckCircle2 size={20} className="mr-3 text-brand-500" />}
              {toast.type === 'error' && <AlertCircle size={20} className="mr-3" />}
              {toast.type === 'info' && <Info size={20} className="mr-3" />}
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
          ))}
        </div>

        {/* --- COMMAND PALETTE (SEARCH MODAL) --- */}
        {searchOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fadeIn" onClick={() => setSearchOpen(false)}>
            <div 
              className="w-full max-w-2xl bg-gray-900/95 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideInUp ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Header */}
              <div className="flex items-center px-4 py-4 border-b border-gray-800">
                <Search className="text-gray-400 mr-3" size={20} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Tìm kiếm công cụ, dự án, hoặc lệnh..." 
                  className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 border border-gray-700">ESC</div>
              </div>

              {/* Results List */}
              <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {getFilteredTools().length > 0 ? (
                  getFilteredTools().map((group) => (
                    <div key={group.id} className="mb-4 last:mb-0">
                      <div className={`px-3 py-2 text-[10px] uppercase font-bold tracking-wider ${group.color} opacity-80 flex items-center`}>
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((tool) => (
                          <button
                            key={tool.key}
                            onClick={() => handleToolClick(tool.key)}
                            className="w-full flex items-center p-3 rounded-xl hover:bg-gray-800 hover:text-white text-gray-400 transition-all group"
                          >
                            <div className={`p-2 rounded-lg bg-gray-800 group-hover:bg-black border border-gray-700 group-hover:border-brand-500/50 mr-3 transition-colors ${group.color}`}>
                              <tool.icon size={18} />
                            </div>
                            <div className="text-left flex-1">
                              <div className="text-sm font-bold text-gray-200 group-hover:text-white">{tool.label}</div>
                              <div className="text-xs text-gray-500">{tool.desc}</div>
                            </div>
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-brand-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <Search size={40} className="mx-auto mb-3 opacity-20" />
                    <p>Không tìm thấy công cụ phù hợp.</p>
                  </div>
                )}
              </div>
              
              {/* Footer Hint */}
              <div className="bg-gray-950 px-4 py-2 border-t border-gray-800 flex justify-between text-[10px] text-gray-500">
                 <span>Dùng phím mũi tên để di chuyển</span>
                 <span>Nhấn Enter để chọn</span>
              </div>
            </div>
          </div>
        )}

        {/* --- GLOBAL FIXED TOOLTIP --- */}
        {hoveredTooltip && (
          <div 
            className="fixed z-[120] bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl border border-gray-700 whitespace-nowrap animate-fadeIn pointer-events-none transform -translate-x-1/2"
            style={{ 
              top: hoveredTooltip.top, 
              left: hoveredTooltip.left, 
            }}
          >
             <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 bg-gray-800 border-l border-t border-gray-700 transform rotate-45"></div>
             <span className="relative z-10 tracking-wide">{hoveredTooltip.label}</span>
          </div>
        )}

        {/* --- TOP HEADER NAVIGATION --- */}
        <header className="h-16 border-b border-gray-800 bg-black/90 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6">
          
          {/* Logo Area */}
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="md:hidden text-gray-400 hover:text-white"
                aria-label="Open Menu"
             >
               <Menu size={24} />
             </button>
             
             <Link to="/" className="flex items-center group" onClick={() => openInfoModal('info')}>
                <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center text-black font-black text-xl shadow-lg shadow-brand-500/20 mr-3 group-hover:scale-105 transition-transform">
                   D
                </div>
                <div className="hidden md:block">
                   <h1 className="font-bold text-lg leading-none tracking-tight text-white">DMP STUDIO</h1>
                   <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">AI Production</p>
                </div>
             </Link>
          </div>

          {/* Central Navigation (Desktop) - Scrollable if many items */}
          <nav className="hidden md:flex items-center flex-1 justify-center max-w-4xl mx-4 overflow-hidden">
             <div 
                ref={navScrollRef}
                onWheel={(e) => {
                  if (navScrollRef.current) {
                    navScrollRef.current.scrollLeft += e.deltaY;
                  }
                }}
                className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 mask-linear-fade px-4"
             >
                {menuItems.map((item) => {
                  const active = isActive(item.key);
                  return (
                    <Link
                      key={item.key}
                      to={item.key}
                      onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                      onMouseLeave={handleMouseLeave}
                      className={`
                        relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 flex-shrink-0
                        ${active 
                          ? 'bg-brand-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
                      `}
                      aria-label={item.label}
                    >
                      <item.icon size={18} strokeWidth={active ? 2.5 : 2} />
                      {active && <div className="absolute -bottom-3 w-1 h-1 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>}
                    </Link>
                  );
                })}
             </div>
          </nav>

          {/* Right Actions: Search & Profile */}
          <div className="flex items-center gap-3 md:gap-5">
             {/* Scientific "Command Center" Search Button */}
             <button 
               onClick={() => setSearchOpen(true)}
               className="hidden lg:flex items-center bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-xs text-gray-500 w-64 group hover:border-brand-500/50 hover:bg-gray-800 transition-all cursor-pointer shadow-inner"
               aria-label="Search Tools"
             >
                <Search size={14} className="mr-2 group-hover:text-brand-400 transition-colors" />
                <span className="flex-1 text-left group-hover:text-gray-300">Tìm kiếm công cụ...</span>
                <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 group-hover:border-gray-600">
                   <Command size={10} />
                   <span>K</span>
                </div>
             </button>

             {/* Mobile Search Icon */}
             <button 
               onClick={() => setSearchOpen(true)} 
               className="lg:hidden text-gray-400 hover:text-white"
               aria-label="Search"
             >
               <Search size={20} />
             </button>

             <div className="h-6 w-px bg-gray-800 hidden md:block"></div>

             <div className="flex items-center gap-2">
                {/* API Key Status Button (NEW) */}
                <div className="relative group">
                  <button 
                    onClick={handleConnectKey}
                    className={`
                      hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold mr-2
                      ${apiKeyStatus === 'connected' 
                        ? 'bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-900/30' 
                        : 'bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/30 animate-pulse'}
                    `}
                    aria-label="API Key Status"
                  >
                    {apiKeyStatus === 'connected' ? <Cloud size={14} /> : <Key size={14} />}
                    {apiKeyStatus === 'connected' ? 'Pro Access' : 'Connect Key'}
                  </button>
                  {/* Hover Menu for Usage */}
                  {apiKeyStatus === 'connected' && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-2 hidden group-hover:block animate-fadeIn z-50">
                        <a href="https://aistudio.google.com/app/settings" target="_blank" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white p-2 rounded hover:bg-gray-800">
                           <BarChart3 size={14} /> Check Credits & Usage
                        </a>
                     </div>
                  )}
                </div>

                {/* Home Button */}
                <Link 
                  to="/" 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-brand-400 transition-colors border border-gray-800"
                  title={t('layout.dashboard')}
                  aria-label="Dashboard"
                >
                  <Home size={16} />
                </Link>

                <button 
                  onClick={toggleLanguage}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                  title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
                  aria-label="Change Language"
                >
                  <Globe size={16} />
                </button>
                
                <button 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800 relative"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900"></span>
                </button>

                <div className="hidden md:flex items-center gap-2 ml-2 cursor-pointer group">
                   <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 p-[1px]">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                         <span className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors">DMP</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </header>

        {/* Mobile Menu Drawer */}
        <div className={`fixed inset-0 z-40 bg-black/95 backdrop-blur-md transition-transform duration-300 md:hidden pt-20 px-6 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="grid grid-cols-3 gap-4">
              {menuItems.map((item) => {
                 const active = isActive(item.key);
                 return (
                    <Link
                       key={item.key}
                       to={item.key}
                       onClick={() => setMobileMenuOpen(false)}
                       className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${active ? 'bg-brand-900/20 border-brand-500/50 text-brand-400' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                    >
                       <item.icon size={24} className="mb-2" />
                       <span className="text-[10px] text-center font-medium leading-tight">{item.label}</span>
                    </Link>
                 );
              })}
           </div>
        </div>

        {/* Main Content - Adjusted for Top Header */}
        <main className="flex-1 overflow-y-auto relative bg-black pt-16 flex flex-col scroll-smooth">
          <div className="p-4 md:p-8 max-w-[1920px] mx-auto w-full flex-1">
            {children}
          </div>
          
          <footer className="py-6 border-t border-gray-900 bg-black text-center mt-auto">
             <div className="text-gray-600 text-xs space-y-1 font-medium">
                <p className="opacity-50 uppercase tracking-widest text-[10px]">Engineered by Gemini 3.0 Pro & Veo</p>
                <div className="flex justify-center gap-4 pt-2">
                   <button onClick={() => openInfoModal('info')} className="hover:text-brand-400 transition-colors flex items-center">
                      <Info size={12} className="mr-1" /> About
                   </button>
                   <span className="text-gray-800">|</span>
                   <button onClick={() => openInfoModal('contact')} className="hover:text-brand-400 transition-colors flex items-center group">
                      <MessageSquare size={12} className="mr-1 group-hover:text-brand-400" />
                      Support
                   </button>
                </div>
             </div>
          </footer>

          <AIChatAssistant />
        </main>
        
        <InfoModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} initialTab={initialInfoTab} />
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
