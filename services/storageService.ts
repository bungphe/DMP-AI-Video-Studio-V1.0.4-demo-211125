
import { SavedCharacter, BrandSettings, PromptTemplate, Project, BrainstormNote, VideoPreset } from "../types";

const DB_NAME = 'DMP_AI_DB_v3';
const DB_VERSION = 5; // Incremented version for presets

const STORES = {
  CHARACTERS: 'characters',
  TEMPLATES: 'templates',
  SETTINGS: 'settings',
  PROJECTS: 'projects',
  NOTES: 'notes',
  PROMPT_HISTORY: 'prompt_history',
  VIDEO_PRESETS: 'video_presets' // New store
};

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create Stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
          db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROMPT_HISTORY)) {
          db.createObjectStore(STORES.PROMPT_HISTORY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.VIDEO_PRESETS)) {
          db.createObjectStore(STORES.VIDEO_PRESETS, { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- GENERIC CRUD HELPERS ---

  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const store = await this.getStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          // Sort by createdAt/timestamp desc if available
          const result = request.result as any[];
          if (result.length > 0) {
            if (result[0].createdAt) {
                result.sort((a, b) => (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime()));
            } else if (result[0].timestamp) {
                result.sort((a, b) => b.timestamp - a.timestamp);
            }
          }
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  }

  private async put<T>(storeName: string, item: T): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const store = await this.getStore(storeName, 'readwrite');
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const store = await this.getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await this.getStore(storeName, 'readwrite');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) { reject(e); }
    });
  }

  // --- PUBLIC API ---

  // Characters
  public async getCharacters(): Promise<SavedCharacter[]> {
    return this.getAll<SavedCharacter>(STORES.CHARACTERS);
  }

  public async saveCharacter(character: SavedCharacter): Promise<void> {
    await this.put(STORES.CHARACTERS, character);
  }

  public async deleteCharacter(id: string): Promise<void> {
    await this.delete(STORES.CHARACTERS, id);
  }

  // Templates
  public async getTemplates(): Promise<PromptTemplate[]> {
    return this.getAll<PromptTemplate>(STORES.TEMPLATES);
  }

  public async saveTemplate(template: PromptTemplate): Promise<void> {
    await this.put(STORES.TEMPLATES, template);
  }

  public async deleteTemplate(id: string): Promise<void> {
    await this.delete(STORES.TEMPLATES, id);
  }

  // Projects (Dashboard)
  public async getProjects(): Promise<Project[]> {
    return this.getAll<Project>(STORES.PROJECTS);
  }

  public async saveProject(project: Project): Promise<void> {
    await this.put(STORES.PROJECTS, project);
  }

  public async updateProjectStage(id: string, stage: string): Promise<void> {
     const projects = await this.getProjects();
     const project = projects.find(p => p.id === id);
     if(project) {
        // Store stage in data property to maintain backward compatibility with types
        project.data = { ...project.data, stage: stage };
        await this.saveProject(project);
     }
  }

  public async deleteProject(id: string): Promise<void> {
    await this.delete(STORES.PROJECTS, id);
  }

  // Live Brainstorm Notes
  public async getNotes(): Promise<BrainstormNote[]> {
    return this.getAll<BrainstormNote>(STORES.NOTES);
  }

  public async saveNote(note: BrainstormNote): Promise<void> {
    await this.put(STORES.NOTES, note);
  }

  public async deleteNote(id: string): Promise<void> {
    await this.delete(STORES.NOTES, id);
  }

  // PROMPT HISTORY
  public async getPromptHistory(): Promise<{id: string, text: string, timestamp: number}[]> {
    return this.getAll(STORES.PROMPT_HISTORY);
  }

  public async savePromptHistory(text: string): Promise<void> {
    // Prevent duplicates (simple check) or just add new
    const history = { id: Date.now().toString(), text, timestamp: Date.now() };
    await this.put(STORES.PROMPT_HISTORY, history);
  }
  
  public async clearPromptHistory(): Promise<void> {
     await this.clearStore(STORES.PROMPT_HISTORY);
  }

  // VIDEO PRESETS
  public async getVideoPresets(): Promise<VideoPreset[]> {
    return this.getAll(STORES.VIDEO_PRESETS);
  }

  public async saveVideoPreset(preset: VideoPreset): Promise<void> {
    await this.put(STORES.VIDEO_PRESETS, preset);
  }

  public async deleteVideoPreset(id: string): Promise<void> {
    await this.delete(STORES.VIDEO_PRESETS, id);
  }

  // Brand Settings
  public async getBrandSettings(): Promise<BrandSettings> {
    return new Promise(async (resolve) => {
      try {
        const store = await this.getStore(STORES.SETTINGS);
        const request = store.get('default_brand');
        request.onsuccess = () => {
           const defaultSettings: BrandSettings = {
            brandName: '',
            primaryColor: '#6366f1',
            secondaryColor: '#a855f7',
            brandVoice: 'Professional'
          };
          resolve(request.result ? request.result.data : defaultSettings);
        };
        request.onerror = () => {
          resolve({
            brandName: '',
            primaryColor: '#6366f1',
            secondaryColor: '#a855f7',
            brandVoice: 'Professional'
          });
        };
      } catch (e) {
        resolve({
          brandName: '',
          primaryColor: '#6366f1',
          secondaryColor: '#a855f7',
          brandVoice: 'Professional'
        });
      }
    });
  }

  public async saveBrandSettings(settings: BrandSettings): Promise<void> {
    // Wrap settings in an object with ID 'default_brand'
    await this.put(STORES.SETTINGS, { id: 'default_brand', data: settings });
  }

  // --- BACKUP & RESTORE SYSTEM ---

  public async exportAllData(): Promise<string> {
    const data = {
      version: DB_VERSION,
      timestamp: Date.now(),
      projects: await this.getProjects(),
      characters: await this.getCharacters(),
      templates: await this.getTemplates(),
      notes: await this.getNotes(),
      settings: await this.getBrandSettings(),
      history: await this.getPromptHistory(),
      presets: await this.getVideoPresets()
    };
    return JSON.stringify(data);
  }

  public async importAllData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      
      // Simple validation
      if (!data.timestamp || !data.version) throw new Error("Invalid backup file");

      // Clear existing data
      await this.clearStore(STORES.PROJECTS);
      await this.clearStore(STORES.CHARACTERS);
      await this.clearStore(STORES.TEMPLATES);
      await this.clearStore(STORES.NOTES);
      await this.clearStore(STORES.VIDEO_PRESETS);
      
      // Import
      if (data.projects) {
        for (const p of data.projects) await this.saveProject(p);
      }
      if (data.characters) {
        for (const c of data.characters) await this.saveCharacter(c);
      }
      if (data.templates) {
        for (const t of data.templates) await this.saveTemplate(t);
      }
      if (data.notes) {
        for (const n of data.notes) await this.saveNote(n);
      }
      if (data.presets) {
        for (const p of data.presets) await this.saveVideoPreset(p);
      }
      if (data.settings) {
        await this.saveBrandSettings(data.settings);
      }
      
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }
}

export const storageService = new IndexedDBService();
