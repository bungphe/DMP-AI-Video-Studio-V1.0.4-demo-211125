import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Video, FileText, Clock, ArrowUpRight, Folder, Trash2, Star, Trophy, Award, PlayCircle, Zap, Sparkles, Building, TrendingUp, Briefcase } from 'lucide-react';
import { Project } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { storageService } from '../services/storageService';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadProjects();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const loadProjects = async () => {
    try {
      const data = await storageService.getProjects();
      setProjects(data);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(confirm('Delete this project?')) {
      await storageService.deleteProject(id);
      loadProjects();
    }
  };

  const getStatusLabel = (status: string) => t(`dashboard.status.${status}`);

  // Gamification Logic
  const projectCount = projects.length;
  const level = projectCount < 3 ? 1 : projectCount < 10 ? 2 : 3;
  const titles = ['Creator', 'Director', 'Producer'];
  const nextLevelCount = level === 1 ? 3 : level === 2 ? 10 : 100;
  const prevLevelCount = level === 1 ? 0 : level === 2 ? 3 : 10;
  const progress = Math.min(100, Math.max(0, ((projectCount - prevLevelCount) / (nextLevelCount - prevLevelCount)) * 100));
  const LevelIcon = level === 1 ? Star : level === 2 ? Trophy : Award;
  
  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-400 font-medium mb-2">
             <Sparkles size={16} className="animate-pulse" />
             <span className="text-sm tracking-wider uppercase">{greeting}, Producer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
             {t('dashboard.title')}
          </h1>
        </div>
        <div className="flex gap-3">
           <Link to="/magic" className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl flex items-center text-sm font-bold border border-gray-800 transition-colors group">
            <Zap size={18} className="mr-2 text-yellow-400 group-hover:rotate-12 transition-transform" />
            Magic Producer
          </Link>
          <Link to="/projects" className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl flex items-center text-sm font-bold shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all transform hover:scale-105">
            <ArrowUpRight size={18} className="mr-2" />
            All Projects
          </Link>
        </div>
      </div>

      {/* Main Grid (Bento Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         
         {/* 1. Quick Actions Row (Full Width on Mobile, Col 1-8 on Desktop) */}
         <div className="col-span-1 md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/script" className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-5 rounded-2xl hover:border-blue-500/50 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText size={64} /></div>
               <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center mb-3 text-blue-400">
                     <FileText size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">New Script</h3>
                  <p className="text-xs text-gray-500">AI Screenwriting</p>
               </div>
            </Link>
            
            <Link to="/video" className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-5 rounded-2xl hover:border-brand-500/50 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Video size={64} /></div>
               <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-brand-900/30 flex items-center justify-center mb-3 text-brand-400">
                     <Video size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">New Video</h3>
                  <p className="text-xs text-gray-500">Generative Video</p>
               </div>
            </Link>

            <Link to="/trend" className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-5 rounded-2xl hover:border-yellow-500/50 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={64} /></div>
               <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center mb-3 text-yellow-400">
                     <TrendingUp size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Trend Pulse</h3>
                  <p className="text-xs text-gray-500">Newsjacking</p>
               </div>
            </Link>
         </div>

         {/* 2. Gamification Card (Col 9-12) */}
         <div className="col-span-1 md:col-span-4 bg-gradient-to-br from-brand-600 to-purple-700 p-6 rounded-2xl relative overflow-hidden text-white shadow-lg">
            <div className="absolute top-0 right-0 p-6 opacity-30">
               <LevelIcon size={100} />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
               <div>
                  <div className="inline-flex items-center px-2 py-1 rounded bg-white/20 text-xs font-bold backdrop-blur mb-2">
                     LEVEL {level}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-wide">{titles[level - 1]}</h3>
                  <p className="text-white/80 text-xs mt-1">{t('dashboard.welcome')}</p>
               </div>
               <div className="mt-6">
                  <div className="flex justify-between text-xs font-bold mb-2 opacity-90">
                     <span>Progress</span>
                     <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                     <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-[10px] mt-2 opacity-70 text-right">{nextLevelCount - projectCount} projects to next level</p>
               </div>
            </div>
         </div>

         {/* 3. Stats Bar (Full Width) */}
         <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
               { label: t('dashboard.total_projects'), value: projects.length.toString(), icon: Folder, color: 'text-white' },
               { label: t('dashboard.render_hours'), value: (projects.length * 0.2).toFixed(1) + 'h', icon: Clock, color: 'text-blue-400' },
               { label: 'Real Estate Tours', value: projects.filter(p => p.title.includes('BĐS') || p.type === 'video').length.toString(), icon: Building, color: 'text-green-400' },
               { label: t('dashboard.credits_remaining'), value: 'UNLIMITED', icon: Zap, color: 'text-yellow-400' },
            ].map((stat, i) => (
               <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                     <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">{stat.label}</p>
                     <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-gray-950 rounded-lg ${stat.color}`}>
                     <stat.icon size={20} />
                  </div>
               </div>
            ))}
         </div>

         {/* 4. Recent Projects Table (Full Width) */}
         <div className="col-span-1 md:col-span-12">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-white flex items-center">
                  <PlayCircle size={18} className="mr-2 text-brand-500" />
                  {t('dashboard.recent_projects')}
               </h2>
               <Link to="/projects" className="text-xs font-bold text-gray-500 hover:text-white flex items-center transition-colors">
                  {t('dashboard.view_all')} <ArrowUpRight size={14} className="ml-1" />
               </Link>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                     <thead className="bg-black/40 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-800">
                        <tr>
                           <th className="px-6 py-4 tracking-wider">{t('dashboard.table.name')}</th>
                           <th className="px-6 py-4 tracking-wider">{t('dashboard.table.type')}</th>
                           <th className="px-6 py-4 tracking-wider">{t('dashboard.table.status')}</th>
                           <th className="px-6 py-4 tracking-wider">{t('dashboard.table.date')}</th>
                           <th className="px-6 py-4 text-right tracking-wider">{t('dashboard.table.action')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800">
                        {projects.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-600">
                                 <Folder size={40} className="mx-auto mb-3 opacity-20" />
                                 Start by creating your first project.
                              </td>
                           </tr>
                        ) : (
                           projects.slice(0, 5).map((project) => (
                              <tr key={project.id} className="hover:bg-gray-800/50 transition-colors group">
                                 <td className="px-6 py-4 font-medium text-white">
                                    <div className="flex items-center">
                                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 border ${project.type === 'video' ? 'bg-brand-900/10 border-brand-500/20 text-brand-500' : 'bg-blue-900/10 border-blue-500/20 text-blue-500'}`}>
                                          {project.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                                       </div>
                                       <span className="font-bold text-sm">{project.title}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 capitalize text-xs font-mono">
                                    <span className="bg-gray-800 px-2 py-1 rounded border border-gray-700">{project.type}</span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`
                                       inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border
                                       ${project.status === 'completed' ? 'bg-green-900/20 text-green-400 border-green-500/20' : 
                                         project.status === 'processing' ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' : 
                                         'bg-gray-800 text-gray-400 border-gray-700'}
                                    `}>
                                       {getStatusLabel(project.status)}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-xs text-gray-600">{new Date(project.createdAt).toLocaleDateString()}</td>
                                 <td className="px-6 py-4 text-right">
                                    <button 
                                       onClick={(e) => handleDelete(project.id, e)}
                                       className="text-gray-600 hover:text-red-400 transition-colors p-2 rounded hover:bg-gray-800 opacity-0 group-hover:opacity-100"
                                       title="Delete"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;