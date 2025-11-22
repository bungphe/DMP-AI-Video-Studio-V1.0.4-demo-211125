
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, FileText, Video, Grid3x3, Zap, Search, Filter, 
  MoreVertical, Trash2, ExternalLink, Download, Plus, Clock, 
  CheckCircle2, AlertCircle, LayoutGrid, List, Kanban,
  Clapperboard, Layers, Calendar, Copy, Edit, Users, X, Save
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Project } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/Layout';

// Film Production Stages
const STAGES = [
  { id: 'development', color: 'bg-blue-500', label: 'Development' },
  { id: 'pre_production', color: 'bg-purple-500', label: 'Pre-Production' },
  { id: 'production', color: 'bg-red-500', label: 'Production' },
  { id: 'post_production', color: 'bg-orange-500', label: 'Post-Production' },
  { id: 'distribution', color: 'bg-green-500', label: 'Distribution' }
];

const Projects: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditingProject, setCurrentEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; deadline: string; targetAudience: string }>({
    title: '',
    deadline: '',
    targetAudience: ''
  });
  
  // Drag and Drop State
  const [draggedProject, setDraggedProject] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await storageService.getProjects();
      // Assign default stage if missing
      const normalized = data.map(p => ({
         ...p,
         data: { ...p.data, stage: p.data?.stage || 'development' }
      }));
      setProjects(normalized);
    } catch (e) {
      console.error("Failed to load projects", e);
      showToast("Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(confirm(t('projects.delete_confirm'))) {
      await storageService.deleteProject(id);
      loadProjects();
      showToast("Project deleted successfully", "success");
    }
  };

  const handleDuplicate = async (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newProject: Project = {
        ...project,
        id: Date.now().toString(),
        title: `${project.title} (Copy)`,
        createdAt: Date.now(),
        status: 'draft'
    };
    
    await storageService.saveProject(newProject);
    loadProjects();
    showToast("Project duplicated successfully!", "success");
  };

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentEditingProject(project);
    setEditForm({
      title: project.title,
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
      targetAudience: project.targetAudience || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!currentEditingProject) return;

    const updatedProject: Project = {
      ...currentEditingProject,
      title: editForm.title,
      deadline: editForm.deadline ? new Date(editForm.deadline).getTime() : undefined,
      targetAudience: editForm.targetAudience
    };

    await storageService.saveProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setIsEditModalOpen(false);
    showToast("Project details updated", "success");
  };

  const handleOpen = (project: Project) => {
    switch (project.type) {
       case 'script':
          navigate('/script', { state: { project: project } });
          break;
       case 'video':
          navigate('/video', { state: { project: project } });
          break;
       case 'matrix':
          navigate('/matrix', { state: { project: project } });
          break;
       default:
          // Default fallback based on stage
          if (project.data?.stage === 'pre_production') navigate('/script', { state: { project }});
          else navigate('/video', { state: { project }});
    }
  };

  // Kanban Logic
  const handleDrop = async (stageId: string) => {
     if (!draggedProject) return;
     
     // Optimistic Update
     setProjects(prev => prev.map(p => 
        p.id === draggedProject ? { ...p, data: { ...p.data, stage: stageId } } : p
     ));

     // Persist
     await storageService.updateProjectStage(draggedProject, stageId);
     setDraggedProject(null);
  };

  const getIcon = (type: string) => {
    switch(type) {
       case 'script': return <FileText size={16} className="text-blue-400" />;
       case 'video': return <Video size={16} className="text-purple-400" />;
       case 'matrix': return <Grid3x3 size={16} className="text-green-400" />;
       case 'trend': return <Zap size={16} className="text-yellow-400" />;
       default: return <Folder size={16} className="text-gray-400" />;
    }
  };

  const getDeadlineColor = (deadline?: number) => {
    if (!deadline) return 'text-gray-500';
    const now = Date.now();
    const diff = deadline - now;
    if (diff < 0) return 'text-red-500'; // Expired
    if (diff < 2 * 24 * 60 * 60 * 1000) return 'text-orange-400'; // Due in 2 days
    return 'text-green-400';
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-20 animate-fadeIn h-[calc(100vh-100px)] flex flex-col relative">
      
      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Edit size={18} className="mr-2 text-brand-400" /> Edit Details
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Project Title</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-brand-500 outline-none"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-brand-500 outline-none"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({...editForm, deadline: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Target Audience</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-brand-500 outline-none"
                  placeholder="e.g. Gen Z, Professionals..."
                  value={editForm.targetAudience}
                  onChange={(e) => setEditForm({...editForm, targetAudience: e.target.value})}
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-800">Cancel</button>
                <button onClick={handleUpdateProject} className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-500 flex items-center">
                  <Save size={16} className="mr-2" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center">
             <Clapperboard className="mr-3 text-brand-400" /> {t('projects.title')}
           </h1>
           <p className="text-gray-400 mt-1 text-sm">{t('projects.desc')}</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* View Toggles */}
           <div className="flex bg-gray-900 rounded-lg border border-gray-800 p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`} title={t('projects.view_grid')}><LayoutGrid size={18}/></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`} title={t('projects.view_list')}><List size={18}/></button>
              <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`} title={t('projects.view_kanban')}><Kanban size={18}/></button>
           </div>

           <button 
              onClick={() => navigate('/script')}
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center text-sm font-bold transition-colors shadow-lg shadow-brand-900/20"
           >
              <Plus size={16} className="mr-2" /> {t('projects.create_new')}
           </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 shadow-lg flex-shrink-0">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input 
               type="text"
               className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
               placeholder={t('projects.search_placeholder')}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
         <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      ) : filteredProjects.length === 0 ? (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-900/30 rounded-xl border border-gray-800/50 border-dashed">
            <Folder size={48} className="mb-4 opacity-20" />
            <p>{t('projects.empty_state')}</p>
         </div>
      ) : (
         <>
           {/* --- KANBAN VIEW --- */}
           {viewMode === 'kanban' && (
             <div className="flex-1 overflow-x-auto pb-4 flex gap-6">
                {STAGES.map(stage => (
                   <div 
                      key={stage.id} 
                      className="min-w-[300px] w-[300px] flex flex-col bg-gray-900/50 border border-gray-800 rounded-xl h-full"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(stage.id)}
                   >
                      {/* Column Header */}
                      <div className={`p-3 border-b border-gray-800 flex items-center justify-between ${stage.color} bg-opacity-10 rounded-t-xl`}>
                         <span className="font-bold text-sm text-white flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                            {t(`projects.stage.${stage.id}` as any) || stage.label}
                         </span>
                         <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 rounded">
                            {filteredProjects.filter(p => p.data?.stage === stage.id).length}
                         </span>
                      </div>

                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                         {filteredProjects.filter(p => p.data?.stage === stage.id).map(project => (
                            <div 
                               key={project.id}
                               draggable
                               onDragStart={() => setDraggedProject(project.id)}
                               onClick={() => handleOpen(project)}
                               className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-brand-500/50 hover:bg-gray-750 transition-all shadow-sm group relative"
                            >
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                                     {getIcon(project.type)} 
                                     <span className="capitalize">{project.type}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={(e) => handleEditClick(project, e)} className="text-gray-600 hover:text-white p-1" title="Edit Details">
                                        <Edit size={14} />
                                     </button>
                                     <button onClick={(e) => handleDuplicate(project, e)} className="text-gray-600 hover:text-blue-400 p-1" title="Duplicate">
                                        <Copy size={14} />
                                     </button>
                                     <button onClick={(e) => handleDelete(project.id, e)} className="text-gray-600 hover:text-red-400 p-1" title="Delete">
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                               
                               <h4 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight">{project.title}</h4>
                               
                               <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-700/50">
                                  <span className="text-[10px] text-gray-500 flex items-center justify-between">
                                     <span className="flex items-center"><Calendar size={10} className="mr-1" /> {new Date(project.createdAt).toLocaleDateString()}</span>
                                     {project.previewUrl && <Video size={12} className="text-brand-400" />}
                                  </span>
                                  {/* Deadline & Audience Indicators */}
                                  {(project.deadline || project.targetAudience) && (
                                     <div className="flex flex-wrap gap-2 mt-1">
                                        {project.deadline && (
                                           <span className={`text-[10px] flex items-center ${getDeadlineColor(project.deadline)}`}>
                                              <Clock size={10} className="mr-1" /> {new Date(project.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                           </span>
                                        )}
                                        {project.targetAudience && (
                                           <span className="text-[10px] text-blue-400 flex items-center truncate max-w-[120px]" title={project.targetAudience}>
                                              <Users size={10} className="mr-1" /> {project.targetAudience}
                                           </span>
                                        )}
                                     </div>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                ))}
             </div>
           )}

           {/* --- GRID VIEW --- */}
           {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
                 {filteredProjects.map(project => (
                    <div 
                       key={project.id}
                       onClick={() => handleOpen(project)}
                       className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-brand-500/50 transition-all hover:shadow-xl group cursor-pointer flex flex-col"
                    >
                       <div className="h-32 bg-black relative flex items-center justify-center overflow-hidden">
                          {project.previewUrl ? (
                             project.type === 'video' ? 
                                <video src={project.previewUrl} className="w-full h-full object-cover opacity-80" /> : 
                                <img src={project.previewUrl} className="w-full h-full object-cover opacity-80" />
                          ) : (
                             <div className="opacity-20 scale-150">{getIcon(project.type)}</div>
                          )}
                          <div className="absolute bottom-2 right-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase text-white shadow-sm ${STAGES.find(s => s.id === project.data?.stage)?.color || 'bg-gray-600'}`}>
                                {t(`projects.stage.${project.data?.stage}` as any) || 'Development'}
                             </span>
                          </div>
                       </div>
                       <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start">
                             <h3 className="font-bold text-white text-sm mb-1 truncate flex-1">{project.title}</h3>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => handleEditClick(project, e)} className="hover:text-white p-1"><Edit size={12} /></button>
                                <button onClick={(e) => handleDelete(project.id, e)} className="hover:text-red-400 p-1"><Trash2 size={12} /></button>
                             </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                             <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>

                          {(project.deadline || project.targetAudience) && (
                             <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
                                {project.deadline && (
                                   <div className={`flex items-center text-xs ${getDeadlineColor(project.deadline)}`}>
                                      <Calendar size={12} className="mr-2" /> Deadline: {new Date(project.deadline).toLocaleDateString()}
                                   </div>
                                )}
                                {project.targetAudience && (
                                   <div className="flex items-center text-xs text-blue-400">
                                      <Users size={12} className="mr-2" /> Audience: {project.targetAudience}
                                   </div>
                                )}
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           )}

           {/* --- LIST VIEW --- */}
           {viewMode === 'list' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                 <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800 text-xs uppercase font-bold text-gray-300">
                       <tr>
                          <th className="px-6 py-4">Project Name</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Stage</th>
                          <th className="px-6 py-4">Deadline</th>
                          <th className="px-6 py-4">Audience</th>
                          <th className="px-6 py-4">Created</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                       {filteredProjects.map(project => (
                          <tr key={project.id} onClick={() => handleOpen(project)} className="hover:bg-gray-800/50 cursor-pointer transition-colors group">
                             <td className="px-6 py-4 font-medium text-white">{project.title}</td>
                             <td className="px-6 py-4 flex items-center gap-2">
                                {getIcon(project.type)} <span className="capitalize">{project.type}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase text-white ${STAGES.find(s => s.id === project.data?.stage)?.color || 'bg-gray-600'}`}>
                                   {t(`projects.stage.${project.data?.stage}` as any) || 'Development'}
                                </span>
                             </td>
                             <td className="px-6 py-4">
                                {project.deadline ? (
                                   <span className={`flex items-center ${getDeadlineColor(project.deadline)}`}>
                                      <Clock size={12} className="mr-1" /> {new Date(project.deadline).toLocaleDateString()}
                                   </span>
                                ) : '-'}
                             </td>
                             <td className="px-6 py-4">
                                {project.targetAudience ? (
                                   <span className="flex items-center text-blue-400">
                                      <Users size={12} className="mr-1" /> {project.targetAudience}
                                   </span>
                                ) : '-'}
                             </td>
                             <td className="px-6 py-4">{new Date(project.createdAt).toLocaleDateString()}</td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-3">
                                   <button onClick={(e) => handleEditClick(project, e)} className="text-gray-500 hover:text-white p-1" title="Edit">
                                      <Edit size={16} />
                                   </button>
                                   <button onClick={(e) => handleDuplicate(project, e)} className="text-gray-500 hover:text-blue-400 p-1" title="Duplicate">
                                      <Copy size={16} />
                                   </button>
                                   <button onClick={(e) => handleDelete(project.id, e)} className="text-gray-500 hover:text-red-400 p-1" title="Delete">
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}
         </>
      )}
    </div>
  );
};

export default Projects;
