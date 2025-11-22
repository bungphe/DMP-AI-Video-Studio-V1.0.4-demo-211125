
import React, { useState } from 'react';
import { Calendar, Clock, Upload, Plus, Trash2, CheckCircle2, Video, Instagram, Youtube, Twitter, Facebook, Link as LinkIcon, Globe, X, Send, RefreshCw, AlertCircle, Music } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ScheduledPost {
  id: string;
  date: string;
  time: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook' | 'x';
  content: string;
  status: 'scheduled' | 'posted' | 'failed';
  videoUrl?: string;
}

interface SocialAccount {
  id: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook' | 'x';
  name: string;
  isConnected: boolean;
  webhookUrl?: string; // Link nhúng để đăng tự động
  avatar?: string;
}

const SocialScheduler: React.FC = () => {
  const { t } = useLanguage();
  
  // --- STATE ---
  const [posts, setPosts] = useState<ScheduledPost[]>([
     { id: '1', date: '2024-03-20', time: '10:00', platform: 'tiktok', content: 'Viral Dance #trend', status: 'scheduled' },
     { id: '2', date: '2024-03-21', time: '18:00', platform: 'youtube', content: 'Tech Review Vlog', status: 'scheduled' }
  ]);

  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { id: 'acc_tt', platform: 'tiktok', name: 'TikTok Channel', isConnected: false },
    { id: 'acc_yt', platform: 'youtube', name: 'YouTube Studio', isConnected: false },
    { id: 'acc_fb', platform: 'facebook', name: 'Facebook Page', isConnected: false },
    { id: 'acc_x', platform: 'x', name: 'X (Twitter)', isConnected: false },
  ]);

  // Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Publishing State
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // --- ACTIONS ---

  const addPost = () => {
     const newPost: ScheduledPost = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        platform: 'tiktok',
        content: 'New Video Post',
        status: 'scheduled'
     };
     setPosts([...posts, newPost]);
  };

  const deletePost = (id: string) => {
     setPosts(posts.filter(p => p.id !== id));
  };

  const openLinkModal = (platform: string) => {
    setSelectedPlatform(platform);
    setWebhookUrl('');
    setShowLinkModal(true);
  };

  const handleConnect = () => {
    if (!selectedPlatform || !webhookUrl) return;
    
    setIsConnecting(true);
    // Simulate API verification
    setTimeout(() => {
      setAccounts(prev => prev.map(acc => 
        acc.platform === selectedPlatform 
          ? { ...acc, isConnected: true, webhookUrl: webhookUrl, name: `${acc.name} (Linked)` } 
          : acc
      ));
      setIsConnecting(false);
      setShowLinkModal(false);
      alert(`Đã liên kết thành công với ${selectedPlatform.toUpperCase()}!`);
    }, 1500);
  };

  const handleDisconnect = (id: string) => {
    if(confirm('Ngắt kết nối tài khoản này?')) {
      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, isConnected: false, webhookUrl: undefined } : acc));
    }
  };

  const handleAutoPublish = (post: ScheduledPost) => {
    const account = accounts.find(a => a.platform === post.platform);
    
    if (!account || !account.isConnected) {
      alert(`Vui lòng kết nối tài khoản ${post.platform.toUpperCase()} trước khi đăng.`);
      openLinkModal(post.platform);
      return;
    }

    setPublishingId(post.id);
    
    // Simulate Upload Process
    setTimeout(() => {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'posted' } : p));
      setPublishingId(null);
      alert(`Đã đăng video lên ${account.name} thành công!`);
    }, 2000);
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'tiktok': return <Music size={16} />;
      case 'youtube': return <Youtube size={16} />;
      case 'instagram': return <Instagram size={16} />;
      case 'facebook': return <Facebook size={16} />;
      case 'x': return <Twitter size={16} />;
      default: return <Globe size={16} />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch(platform) {
      case 'youtube': return 'text-red-500 bg-red-900/20 border-red-500/30';
      case 'facebook': return 'text-blue-500 bg-blue-900/20 border-blue-500/30';
      case 'tiktok': return 'text-pink-500 bg-pink-900/20 border-pink-500/30';
      case 'x': return 'text-white bg-gray-700 border-gray-600';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fadeIn relative">
       
       {/* --- LINK MODAL --- */}
       {showLinkModal && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                     {selectedPlatform ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 border ${getPlatformColor(selectedPlatform)}`}>
                           {getPlatformIcon(selectedPlatform)}
                        </div>
                     ) : (
                        <LinkIcon className="mr-2 text-brand-400" size={20} /> 
                     )}
                     Liên kết {selectedPlatform?.toUpperCase()}
                  </h3>
                  <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200 flex items-start">
                     <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5"/>
                     Nhập Webhook URL, Stream Key hoặc đường dẫn Profile để cấp quyền đăng bài tự động.
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Đường dẫn liên kết (Webhook / URL)</label>
                     <input 
                        type="text" 
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none text-sm"
                        placeholder={`https://api.${selectedPlatform}.com/...`}
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                     />
                  </div>

                  <button 
                     onClick={handleConnect}
                     disabled={!webhookUrl || isConnecting}
                     className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                     {isConnecting ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                     {isConnecting ? 'Đang xác thực...' : 'Xác nhận Liên kết'}
                  </button>
               </div>
            </div>
         </div>
       )}

       <div className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-3xl font-bold text-white flex items-center">
                <Calendar className="mr-3 text-brand-400" /> Social Scheduler
             </h1>
             <p className="text-gray-400 mt-1">Lên lịch và tự động đăng tải video đa nền tảng.</p>
          </div>
          <button onClick={addPost} className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-lg font-bold flex items-center shadow-lg transition-transform hover:scale-105">
             <Plus size={18} className="mr-2"/> Tạo Lịch Mới
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: SCHEDULER LIST (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
             {/* Calendar Strip Simulation */}
             <div className="grid grid-cols-7 gap-2 mb-2">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, i) => (
                   <div key={i} className={`bg-gray-900 border border-gray-800 p-2 rounded-lg text-center ${i===2 ? 'border-brand-500 bg-brand-900/10' : ''}`}>
                      <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">{day}</p>
                      <p className="text-white font-bold">{20 + i}</p>
                   </div>
                ))}
             </div>

             <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
                   <h3 className="font-bold text-white">Danh sách chờ đăng</h3>
                   <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{posts.length} bài</span>
                </div>
                <div className="divide-y divide-gray-800">
                   {posts.map(post => (
                      <div key={post.id} className="p-4 flex items-center hover:bg-gray-800/30 transition-colors group">
                         
                         {/* Time */}
                         <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-800 pr-4 mr-4">
                            <span className="text-lg font-bold text-white">{post.time}</span>
                            <span className="text-[10px] text-gray-500">{post.date}</span>
                         </div>

                         {/* Icon */}
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 border ${getPlatformColor(post.platform)}`}>
                            {getPlatformIcon(post.platform)}
                         </div>

                         {/* Content */}
                         <div className="flex-1 min-w-0 mr-4">
                            <h4 className="text-sm font-bold text-white truncate">{post.content}</h4>
                            <div className="flex items-center mt-1">
                               <span className={`text-[10px] uppercase font-bold mr-2 ${post.status === 'posted' ? 'text-green-500' : post.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                                  {post.status}
                               </span>
                               <span className="text-[10px] text-gray-500 capitalize">• {post.platform}</span>
                            </div>
                         </div>

                         {/* Actions */}
                         <div className="flex items-center gap-2">
                            {post.status !== 'posted' && (
                               <button 
                                 onClick={() => handleAutoPublish(post)}
                                 disabled={publishingId === post.id}
                                 className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition-colors shadow-lg"
                                 title="Đăng ngay (Auto-Publish)"
                               >
                                  {publishingId === post.id ? <RefreshCw size={16} className="animate-spin"/> : <Send size={16} />}
                               </button>
                            )}
                            <button onClick={() => deletePost(post.id)} className="text-gray-600 hover:text-red-400 p-2 hover:bg-gray-800 rounded-lg">
                               <Trash2 size={16}/>
                            </button>
                         </div>
                      </div>
                   ))}
                   {posts.length === 0 && (
                      <div className="p-8 text-center text-gray-500">Chưa có bài đăng nào.</div>
                   )}
                </div>
             </div>
          </div>

          {/* RIGHT: CONNECTED ACCOUNTS (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
                <h3 className="font-bold text-white mb-4 flex items-center">
                   <Globe size={18} className="mr-2 text-brand-400" /> Kênh Phát Sóng
                </h3>
                <p className="text-xs text-gray-400 mb-4">Nhúng liên kết tài khoản để kích hoạt tính năng đăng tự động.</p>
                
                <div className="space-y-3">
                   {accounts.map(acc => (
                      <div key={acc.id} className="bg-black/40 border border-gray-800 rounded-lg p-3 flex items-center justify-between group hover:border-gray-600 transition-colors">
                         <div className="flex items-center min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 border ${acc.isConnected ? getPlatformColor(acc.platform) : 'bg-gray-800 text-gray-500 border-transparent'}`}>
                               {getPlatformIcon(acc.platform)}
                            </div>
                            <div className="min-w-0">
                               <p className={`text-sm font-bold truncate ${acc.isConnected ? 'text-white' : 'text-gray-500'}`}>{acc.name}</p>
                               <p className="text-[10px] text-gray-500 flex items-center">
                                  {acc.isConnected ? (
                                     <span className="text-green-500 flex items-center"><CheckCircle2 size={10} className="mr-1"/> Đã kết nối</span>
                                  ) : (
                                     'Chưa kết nối'
                                  )}
                               </p>
                            </div>
                         </div>
                         
                         {acc.isConnected ? (
                            <button onClick={() => handleDisconnect(acc.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Ngắt</button>
                         ) : (
                            <button 
                               onClick={() => openLinkModal(acc.platform)}
                               className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600"
                            >
                               Kết nối
                            </button>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             {/* Quick Stats */}
             <div className="bg-gradient-to-br from-brand-900/20 to-purple-900/20 border border-brand-500/20 rounded-xl p-5">
                <h4 className="text-sm font-bold text-white mb-3">Hiệu suất Tuần này</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[10px] text-gray-400 uppercase">Video đã đăng</p>
                      <p className="text-2xl font-bold text-white">12</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-gray-400 uppercase">Lượt tiếp cận</p>
                      <p className="text-2xl font-bold text-brand-400">85.2K</p>
                   </div>
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default SocialScheduler;
