
import React, { useState } from 'react';
import { X, User, Phone, CreditCard, Copy, Check, Workflow, Zap, BrainCircuit, Clapperboard, Wand2 } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'info' | 'workflow' | 'contact' | 'donate';
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'workflow' | 'contact' | 'donate'>(initialTab);
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-2 flex flex-col items-center justify-center text-xs font-bold uppercase transition-colors border-b-2 ${
        activeTab === id 
          ? 'border-brand-500 text-brand-400 bg-brand-900/10' 
          : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800'
      }`}
    >
      <Icon size={20} className="mb-1" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="text-xl font-bold text-white flex items-center">
             <span className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 text-white font-black">D</span>
             DMP AI STUDIO
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900">
           <TabButton id="info" label="Giới thiệu" icon={User} />
           <TabButton id="workflow" label="Workflow (Pro)" icon={Workflow} />
           <TabButton id="contact" label="Liên hệ" icon={Phone} />
           <TabButton id="donate" label="Donate" icon={CreditCard} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50 scroll-smooth">
           
           {/* INTRO TAB */}
           {activeTab === 'info' && (
             <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                   <h1 className="text-3xl font-bold text-white mb-2">DMP AI VIDEO STUDIO</h1>
                   <p className="text-brand-400 font-medium">Developed by DONG MINH PHU</p>
                   <p className="text-gray-500 text-sm mt-1">Phiên bản 1.0.0 (Gemini 3.0 Core)</p>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                   <h3 className="text-lg font-bold text-white mb-4">Giới thiệu</h3>
                   <p className="text-gray-300 leading-relaxed mb-4">
                     DMP AI Video Studio là nền tảng sản xuất video tất-cả-trong-một (All-in-One), ứng dụng sức mạnh của <strong>Google Gemini 3.0 Pro</strong> và <strong>Veo 3.1</strong>. 
                     Chúng tôi cung cấp giải pháp tự động hóa quy trình sáng tạo Agency: từ chiến lược, kịch bản, storyboard đến video hoàn chỉnh.
                   </p>
                   
                   <h3 className="text-lg font-bold text-white mb-4">Công nghệ Lõi</h3>
                   <ul className="space-y-3">
                      <li className="flex items-start text-gray-300">
                        <span className="mr-3 text-brand-500 bg-brand-900/20 p-1 rounded"><BrainCircuit size={16} /></span>
                        <span><strong>Gemini 3.0 Pro (Reasoning):</strong> Lõi tư duy logic cho Script & Agent Director.</span>
                      </li>
                      <li className="flex items-start text-gray-300">
                        <span className="mr-3 text-purple-500 bg-purple-900/20 p-1 rounded"><Clapperboard size={16} /></span>
                        <span><strong>Google Veo 3.1:</strong> Model sinh video 1080p chân thực nhất hiện nay.</span>
                      </li>
                      <li className="flex items-start text-gray-300">
                        <span className="mr-3 text-blue-500 bg-blue-900/20 p-1 rounded"><Zap size={16} /></span>
                        <span><strong>Gemini Flash 2.5 (Real-time):</strong> Xử lý Live Brainstorm độ trễ cực thấp.</span>
                      </li>
                   </ul>
                </div>
             </div>
           )}

           {/* WORKFLOW TAB (New Guide) */}
           {activeTab === 'workflow' && (
              <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
                 <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Quy trình Sản xuất Đỉnh cao</h3>
                    <p className="text-gray-400 text-sm">Workflow chuẩn Agency để tạo ra các video triệu view.</p>
                 </div>
                 
                 <div className="relative border-l-2 border-gray-800 ml-6 space-y-10 pb-10">
                    
                    {/* STEP 1 */}
                    <div className="relative pl-8 group">
                       <div className="absolute -left-[21px] top-0 w-10 h-10 bg-gray-900 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-500 font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform">1</div>
                       <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-colors shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="text-lg font-bold text-white">Chiến lược & Ý tưởng (Development)</h4>
                             <span className="text-[10px] uppercase font-bold bg-blue-900/30 text-blue-400 px-2 py-1 rounded">Gemini 3.0</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">Đừng bắt đầu một cách mù mờ. Hãy dùng dữ liệu để định hướng.</p>
                          <ul className="text-sm text-gray-300 space-y-2">
                             <li className="flex items-center"><Zap size={14} className="mr-2 text-yellow-400" /> <strong>Trend Pulse:</strong> Quét tin tức nóng hổi (Newsjacking) để làm content bắt trend.</li>
                             <li className="flex items-center"><BrainCircuit size={14} className="mr-2 text-purple-400" /> <strong>Creative Matrix:</strong> Tạo 12 góc độ nội dung cho sản phẩm chỉ với 1 click.</li>
                          </ul>
                       </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="relative pl-8 group">
                       <div className="absolute -left-[21px] top-0 w-10 h-10 bg-gray-900 border-2 border-purple-500 rounded-full flex items-center justify-center text-purple-500 font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform">2</div>
                       <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-colors shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="text-lg font-bold text-white">Kịch bản & Đạo diễn (Pre-Production)</h4>
                             <span className="text-[10px] uppercase font-bold bg-purple-900/30 text-purple-400 px-2 py-1 rounded">Agentic AI</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">Chuyển ý tưởng thành kế hoạch quay chi tiết.</p>
                          <ul className="text-sm text-gray-300 space-y-2">
                             <li className="flex items-center"><Copy size={14} className="mr-2 text-gray-400" /> <strong>Script Generator:</strong> Viết kịch bản phân cảnh (Visual/Audio).</li>
                             <li className="flex items-center"><Workflow size={14} className="mr-2 text-brand-400" /> <strong>Send to AI Director:</strong> Nút quan trọng nhất. Chuyển kịch bản thẳng sang chế độ Đạo diễn để phân tích từng cảnh.</li>
                          </ul>
                       </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="relative pl-8 group">
                       <div className="absolute -left-[21px] top-0 w-10 h-10 bg-gray-900 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] group-hover:scale-110 transition-transform">3</div>
                       <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 hover:border-red-500/50 transition-colors shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="text-lg font-bold text-white">Sản xuất (Production)</h4>
                             <span className="text-[10px] uppercase font-bold bg-red-900/30 text-red-400 px-2 py-1 rounded">Google Veo</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">Giai đoạn tạo hình ảnh chuyển động.</p>
                          <ul className="text-sm text-gray-300 space-y-2">
                             <li className="flex items-center"><User size={14} className="mr-2 text-green-400" /> <strong>Asset Consistency:</strong> Upload ảnh nhân vật/sản phẩm vào Agent Director để giữ tính nhất quán xuyên suốt các cảnh.</li>
                             <li className="flex items-center"><Clapperboard size={14} className="mr-2 text-red-400" /> <strong>Batch Render:</strong> Bấm "Start Production" để AI tự động quay (render) 5-10 cảnh cùng lúc.</li>
                             <li className="flex items-center"><Wand2 size={14} className="mr-2 text-blue-400" /> <strong>Cinema Mode:</strong> Xem trước bản dựng thô (Assembly Cut) ngay lập tức.</li>
                          </ul>
                       </div>
                    </div>

                    {/* STEP 4 */}
                    <div className="relative pl-8 group">
                       <div className="absolute -left-[21px] top-0 w-10 h-10 bg-gray-900 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">4</div>
                       <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition-colors shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="text-lg font-bold text-white">Hậu kỳ (Post-Production)</h4>
                             <span className="text-[10px] uppercase font-bold bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded">Editor</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">Hoàn thiện tác phẩm cuối cùng.</p>
                          <ul className="text-sm text-gray-300 space-y-2">
                             <li className="flex items-center"><Workflow size={14} className="mr-2 text-emerald-400" /> <strong>Send to Editor:</strong> Chuyển toàn bộ cảnh đã quay từ Agent Director sang Web Editor.</li>
                             <li className="flex items-center"><Zap size={14} className="mr-2 text-yellow-400" /> <strong>AI Colorist:</strong> Dùng lệnh giọng nói (VD: "Làm màu phim ma trận") để chỉnh màu (Color Grading).</li>
                             <li className="flex items-center"><Check size={14} className="mr-2 text-white" /> <strong>Export:</strong> Xuất file MP4 hoàn chỉnh.</li>
                          </ul>
                       </div>
                    </div>
                 </div>
                 
                 <div className="bg-gradient-to-r from-brand-900/50 to-purple-900/50 p-4 rounded-lg border border-brand-500/30 text-center">
                    <p className="text-brand-200 text-sm font-medium">💡 Pro Tip: Sử dụng "Project" để lưu trữ toàn bộ quy trình này và tiếp tục bất cứ lúc nào.</p>
                 </div>
              </div>
           )}

           {/* CONTACT TAB */}
           {activeTab === 'contact' && (
              <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fadeIn">
                 <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Thông tin Liên hệ</h3>
                    <p className="text-gray-400">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-brand-900/30 text-brand-400 rounded-full flex items-center justify-center mb-3">
                          <Phone size={24} />
                       </div>
                       <h4 className="font-bold text-white mb-1">Hotline & Zalo</h4>
                       <p className="text-xl text-brand-400 font-mono font-bold mb-2">+84 766 771 509</p>
                       <a href="https://zalo.me/g/kodwgn037" target="_blank" rel="noreferrer" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full transition-colors">
                          Tham gia nhóm Zalo
                       </a>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-purple-900/30 text-purple-400 rounded-full flex items-center justify-center mb-3">
                          <User size={24} />
                       </div>
                       <h4 className="font-bold text-white mb-1">Email Hỗ trợ</h4>
                       <p className="text-lg text-gray-300 mb-2">dmpaidev@gmail.com</p>
                       <button onClick={() => handleCopy('dmpaidev@gmail.com', 'email')} className="text-xs text-gray-500 hover:text-white flex items-center">
                          {copied === 'email' ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                          {copied === 'email' ? 'Đã sao chép' : 'Sao chép Email'}
                       </button>
                    </div>
                 </div>
              </div>
           )}

           {/* DONATE TAB */}
           {activeTab === 'donate' && (
              <div className="space-y-6 animate-fadeIn">
                 <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Ủng hộ Nhà phát triển</h3>
                    <p className="text-gray-400 mt-2">Sự ủng hộ của bạn giúp chúng tôi duy trì server và phát triển tính năng mới.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bank Transfer */}
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 relative overflow-hidden">
                       <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl">Recommended</div>
                       <div className="flex items-center mb-4">
                          <CreditCard className="text-brand-400 mr-3" size={28} />
                          <div>
                             <h4 className="font-bold text-white">Ngân hàng (Bank Transfer)</h4>
                             <p className="text-xs text-gray-400">Techcombank</p>
                          </div>
                       </div>
                       
                       <div className="space-y-3 font-mono text-sm">
                          <div className="bg-black/30 p-3 rounded border border-gray-700 flex justify-between items-center">
                             <div>
                                <p className="text-gray-500 text-xs">Số tài khoản</p>
                                <p className="text-white font-bold text-lg">554646686868</p>
                             </div>
                             <button onClick={() => handleCopy('554646686868', 'bank')} className="text-gray-400 hover:text-white">
                                {copied === 'bank' ? <Check size={18} /> : <Copy size={18} />}
                             </button>
                          </div>
                          <div>
                             <p className="text-gray-500 text-xs">Chủ tài khoản</p>
                             <p className="text-white font-bold">DONG MINH PHU</p>
                          </div>
                       </div>
                    </div>

                    {/* E-Wallets */}
                    <div className="space-y-4">
                       <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                          <div className="flex items-center">
                             <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mr-3">MoMo</div>
                             <div>
                                <p className="text-white font-bold">Ví MoMo</p>
                                <p className="text-xs text-gray-400">0766771509</p>
                             </div>
                          </div>
                          <button onClick={() => handleCopy('0766771509', 'momo')} className="text-gray-500 hover:text-white">
                             <Copy size={18} />
                          </button>
                       </div>

                       <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                          <div className="flex items-center">
                             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mr-3">PayPal</div>
                             <div>
                                <p className="text-white font-bold">PayPal</p>
                                <p className="text-xs text-gray-400">minhphu1509@gmail.com</p>
                             </div>
                          </div>
                          <button onClick={() => handleCopy('minhphu1509@gmail.com', 'paypal')} className="text-gray-500 hover:text-white">
                             <Copy size={18} />
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* QR Code Display (VietQR) */}
                 <div className="bg-white p-6 rounded-xl max-w-sm mx-auto text-center shadow-xl shadow-black/20">
                    <p className="text-black font-bold mb-4 text-lg">Quét mã QR Ngân hàng</p>
                    <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-100">
                        <img 
                           src="https://img.vietqr.io/image/TCB-554646686868-compact2.png?accountName=DONG%20MINH%20PHU&addInfo=Ung%20ho%20DMP%20AI%20Studio"
                           alt="QR Code Techcombank"
                           className="w-full h-full object-contain"
                           onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/400x400?text=QR+Error";
                           }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Techcombank</p>
                    <p className="text-sm text-gray-800 font-bold">554646686868</p>
                    <p className="text-xs text-gray-500 uppercase">DONG MINH PHU</p>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
};
