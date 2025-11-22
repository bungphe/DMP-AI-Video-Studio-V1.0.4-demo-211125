
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Palette, Save, CheckCircle2, Key, Cloud, ExternalLink, CreditCard, BarChart3, Database, Upload, Download, AlertTriangle, RefreshCw, HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { storageService } from '../services/storageService';
import { BrandSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/Layout';

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<BrandSettings>({
    brandName: '',
    primaryColor: '#6366f1',
    secondaryColor: '#a855f7',
    brandVoice: 'Professional',
    logoUrl: ''
  });
  const [saved, setSaved] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'connected' | 'missing'>('checking');
  const [isImporting, setIsImporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getBrandSettings().then(setSettings);
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        try {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeyStatus(hasKey ? 'connected' : 'missing');
        } catch (e) {
            setApiKeyStatus('missing');
        }
    } else {
        setApiKeyStatus('connected'); // Fallback
    }
  };

  const handleConnectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setApiKeyStatus('connected');
        showToast("Đã kết nối API Key!", "success");
      } catch (e) {
        showToast("Lỗi kết nối Key", "error");
      }
    } else {
      showToast("Tính năng này chỉ hoạt động trên AI Studio", "info");
    }
  };

  const handleSave = async () => {
    await storageService.saveBrandSettings(settings);
    setSaved(true);
    showToast("Đã lưu cài đặt thành công", "success");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportData = async () => {
    try {
      const json = await storageService.exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dmp_studio_backup_${new Date().toISOString().slice(0, 10)}.dmp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Sao lưu dữ liệu thành công!", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi sao lưu", "error");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsImporting(true);
      try {
        const json = event.target?.result as string;
        const success = await storageService.importAllData(json);
        if (success) {
          showToast("Khôi phục dữ liệu thành công! Đang tải lại...", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast("File backup không hợp lệ", "error");
        }
      } catch (e) {
        showToast("Lỗi khi khôi phục dữ liệu", "error");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Settings className="mr-3 text-brand-400" /> {t('settings.title')}
        </h1>
        <p className="text-gray-400 mt-2">
          Quản lý cấu hình, kết nối API và dữ liệu ứng dụng.
        </p>
      </div>

      {/* API CONFIGURATION SECTION */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg mb-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Key size={120} />
         </div>
         
         <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Cloud className="mr-2 text-blue-400" /> Cấu hình API & Cloud
         </h2>

         <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
               <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  Để sử dụng các tính năng cao cấp như <strong>Google Veo 3.1 (Tạo Video)</strong> và <strong>Gemini 3.0 Pro (Logic)</strong>, bạn cần kết nối một API Key từ dự án Google Cloud có bật thanh toán (Billing).
               </p>
               <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className={`px-4 py-2 rounded-lg border flex items-center font-bold text-sm ${apiKeyStatus === 'connected' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}>
                     {apiKeyStatus === 'connected' ? (
                        <><CheckCircle2 size={16} className="mr-2"/> Đã kết nối Google Cloud</>
                     ) : (
                        <><Key size={16} className="mr-2"/> Chưa có API Key</>
                     )}
                  </div>
                  <a href="https://aistudio.google.com/app/settings" target="_blank" className="flex items-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded border border-gray-700 transition-colors">
                     <BarChart3 size={14} className="mr-2 text-brand-400" /> Kiểm tra Tín dụng & Quota
                  </a>
               </div>
            </div>
            
            <div>
               <button 
                  onClick={handleConnectKey}
                  className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-transform active:scale-95"
               >
                  <Key size={18} className="mr-2" />
                  {apiKeyStatus === 'connected' ? 'Đổi API Key Khác' : 'Kết nối API Key Ngay'}
               </button>
            </div>
         </div>

         {/* GUIDE SECTION */}
         <div className="mt-6 pt-6 border-t border-gray-800">
            <button 
               onClick={() => setShowGuide(!showGuide)}
               className="flex items-center text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
               <HelpCircle size={16} className="mr-2" />
               Hướng dẫn lấy API Key (Cho người mới)
               {showGuide ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
            </button>
            
            {showGuide && (
               <div className="mt-4 bg-black/30 rounded-xl p-5 text-sm text-gray-300 space-y-4 animate-fadeIn border border-gray-800">
                  <div className="flex items-start gap-3">
                     <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                     <div>
                        <p className="font-bold text-white">Truy cập Google AI Studio</p>
                        <p className="text-xs mt-1">Vào trang <a href="https://aistudio.google.com/" target="_blank" className="text-blue-400 hover:underline">aistudio.google.com</a> và đăng nhập bằng tài khoản Google của bạn.</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                     <div>
                        <p className="font-bold text-white">Tạo API Key</p>
                        <p className="text-xs mt-1">Nhấn vào nút <strong>"Get API key"</strong> ở thanh menu bên trái, sau đó chọn <strong>"Create API key"</strong> (Tạo trong dự án mới hoặc hiện có).</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">3</div>
                     <div>
                        <p className="font-bold text-white">Kích hoạt Billing (Quan trọng cho Veo)</p>
                        <p className="text-xs mt-1">Để tạo video, bạn cần bật thanh toán cho dự án Google Cloud chứa API Key đó. <a href="https://console.cloud.google.com/billing" target="_blank" className="text-blue-400 hover:underline">Truy cập Google Cloud Console Billing</a>.</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">4</div>
                     <div>
                        <p className="font-bold text-white">Kết nối vào DMP Studio</p>
                        <p className="text-xs mt-1">Quay lại trang này, nhấn nút <strong>"Kết nối API Key Ngay"</strong> màu trắng ở trên và chọn Key bạn vừa tạo.</p>
                     </div>
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200 flex items-center mt-2">
                     <BookOpen size={14} className="mr-2 flex-shrink-0"/>
                     Lưu ý: API Key được lưu trữ an toàn bởi Google và chỉ được sử dụng trong phiên làm việc của bạn.
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* DATA MANAGEMENT SECTION (NEW) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg mb-8">
         <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Database className="mr-2 text-green-400" /> Quản lý & Sao lưu Dữ liệu
         </h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-gray-800 rounded-xl p-5">
               <h3 className="font-bold text-white mb-2 flex items-center">
                  <Download size={18} className="mr-2 text-brand-400" /> Sao lưu (Backup)
               </h3>
               <p className="text-xs text-gray-400 mb-4">
                  Tải xuống toàn bộ dữ liệu dự án, nhân vật và cài đặt dưới dạng file <code>.dmp</code>.
               </p>
               <button 
                  onClick={handleExportData}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-bold border border-gray-700 transition-colors"
               >
                  Tải xuống Backup
               </button>
            </div>

            <div className="bg-black/40 border border-gray-800 rounded-xl p-5">
               <h3 className="font-bold text-white mb-2 flex items-center">
                  <Upload size={18} className="mr-2 text-blue-400" /> Khôi phục (Restore)
               </h3>
               <p className="text-xs text-gray-400 mb-4">
                  Khôi phục dữ liệu từ file backup. <span className="text-red-400">Lưu ý: Dữ liệu hiện tại sẽ bị ghi đè.</span>
               </p>
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-bold border border-gray-700 transition-colors flex justify-center items-center"
               >
                  {isImporting ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                  {isImporting ? 'Đang khôi phục...' : 'Chọn File Backup'}
               </button>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportData} 
                  accept=".dmp,.json" 
                  className="hidden" 
               />
            </div>
         </div>
      </div>

      {/* BRAND KIT SECTION */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Palette className="mr-2 text-purple-400" /> {t('settings.brand_kit')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Brand Basics */}
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.brand_name')}</label>
               <input 
                 type="text"
                 className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                 value={settings.brandName}
                 onChange={(e) => setSettings({...settings, brandName: e.target.value})}
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.brand_voice')}</label>
               <select 
                 className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                 value={settings.brandVoice}
                 onChange={(e) => setSettings({...settings, brandVoice: e.target.value})}
               >
                 <option value="Professional">Professional / Corporate</option>
                 <option value="Casual">Casual / Friendly</option>
                 <option value="Gen Z">Gen Z / Trendy / Slang</option>
                 <option value="Luxury">Luxury / Elegant</option>
                 <option value="Minimalist">Minimalist</option>
                 <option value="Excited">Excited / Salesy</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.logo_url')}</label>
               <input 
                 type="text"
                 placeholder="https://..."
                 className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                 value={settings.logoUrl}
                 onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
               />
             </div>
          </div>

          {/* Brand Colors */}
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.primary_color')}</label>
               <div className="flex gap-3">
                 <input 
                    type="color" 
                    className="h-12 w-12 rounded bg-transparent cursor-pointer"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                 />
                 <input 
                   type="text"
                   className="flex-1 bg-gray-950 border border-gray-800 rounded-lg p-3 text-white font-mono"
                   value={settings.primaryColor}
                   onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                 />
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.secondary_color')}</label>
               <div className="flex gap-3">
                 <input 
                    type="color" 
                    className="h-12 w-12 rounded bg-transparent cursor-pointer"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                 />
                 <input 
                   type="text"
                   className="flex-1 bg-gray-950 border border-gray-800 rounded-lg p-3 text-white font-mono"
                   value={settings.secondaryColor}
                   onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                 />
               </div>
             </div>

             {/* Preview Card */}
             <div className="mt-6 p-4 rounded-lg border border-gray-800" style={{ backgroundColor: '#111827' }}>
                <p className="text-xs text-gray-500 mb-2">Preview Card</p>
                <div className="h-24 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` }}>
                   <h3 className="text-white font-bold text-xl drop-shadow-md">{settings.brandName || 'Brand Name'}</h3>
                   <div className="absolute bottom-2 right-2 bg-white/20 px-2 py-1 rounded text-[10px] text-white">
                      {settings.brandVoice} Voice
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-bold flex items-center shadow-lg transition-all active:scale-95"
          >
            {saved ? (
              <>
                <CheckCircle2 size={20} className="mr-2" /> {t('settings.saved')}
              </>
            ) : (
              <>
                <Save size={20} className="mr-2" /> {t('settings.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
