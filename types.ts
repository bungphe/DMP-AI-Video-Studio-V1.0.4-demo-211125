
export interface User {
  id: string;
  email: string;
  plan: 'FREE' | 'PRO' | 'AGENCY';
  credits: number;
}

export interface Project {
  id: string;
  title: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  type: 'script' | 'video' | 'matrix' | 'trend' | 'magic' | 'interactive'; 
  previewUrl?: string;
  createdAt: Date | number; 
  deadline?: number; // NEW: Project Deadline
  targetAudience?: string; // NEW: Target Audience for the project
  data?: {
    result?: any;
    formData?: any;
    stage?: string;
    storyboard?: Storyboard; // Added for Agent Director
    referenceImage?: { data: string, mimeType: string }; // Added for Asset Consistency
    newsData?: NewsScript; // NEW: For Newsroom
    storyNodes?: StoryNode[]; // NEW: For Interactive Story
    [key: string]: any;
  }; 
}

export enum AIModel {
  // UPGRADE: Use Gemini 3.0 Pro for complex reasoning and creative direction
  SCRIPT = 'gemini-3-pro-preview', 
  // Use Flash for quick tasks
  FAST_TEXT = 'gemini-2.5-flash',
  
  VIDEO_FAST = 'veo-3.1-fast-generate-preview',
  VIDEO_HQ = 'veo-3.1-generate-preview',
  TTS = 'gemini-2.5-flash-preview-tts',
  IMAGE_GEN = 'imagen-4.0-generate-001',
  LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025' 
}

export const AIVoices = [
  { id: 'Puck', name: 'Puck (Male, Deep)', gender: 'Male' },
  { id: 'Kore', name: 'Kore (Female, Calm)', gender: 'Female' },
  { id: 'Fenrir', name: 'Fenrir (Male, Intense)', gender: 'Male' },
  { id: 'Charon', name: 'Charon (Male, Deep)', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr (Female, Soft)', gender: 'Female' },
];

export const CharacterStyles = [
  { id: 'digital_twin', name: 'Digital Twin (Hyper Realistic)' },
  { id: 'cinematic', name: 'Cinematic Realistic' },
  { id: '3d_render', name: '3D Animation (Pixar/Disney Style)' },
  { id: 'unreal_engine', name: 'Unreal Engine 5 Game Asset' },
  { id: 'anime', name: 'Anime / Manga' },
  { id: 'cyberpunk', name: 'Cyberpunk / Sci-Fi' },
  { id: 'oil_painting', name: 'Oil Painting' },
  { id: 'sketch', name: 'Pencil Sketch' },
  { id: 'pixel_art', name: 'Pixel Art (Retro)' },
  { id: 'claymation', name: 'Claymation (Stop Motion)' },
];

// Asset Library Types
export interface SavedCharacter {
  id: string;
  name: string;
  imageBase64: string;
  style: string;
  defaultVoiceId?: string; 
  voiceSampleBase64?: string; 
  createdAt: number;
  tags?: string[]; // NEW: Smart Tags
  stats?: { // NEW: Trading Card Stats
    realism: number;
    style: number;
    charisma: number;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  }
}

// Advanced Video Configuration
export interface VideoConfig {
  resolution: '720p' | '1080p'; 
  aspectRatio: '16:9' | '9:16' | '1:1' | '21:9'; 
  fps: '24' | '30' | '60'; 
  duration?: '5s' | '10s'; // NEW: Video Duration
  sceneCount?: number; 
  mode?: 'cinematic' | 'viral_shorts'; 
}

// Video Preset for Saving Settings
export interface VideoPreset {
  id: string;
  name: string;
  category?: string; // NEW: Organized presets
  config: VideoConfig;
  renderSettings?: {
    lighting: string;
    camera: string;
    style: string;
  };
  createdAt: number;
}

// Storyboard Types for Agent Workflow
export interface StoryboardScene {
  id: number;
  visual_description: string;
  camera_angle: string;
  prompt_optimized: string;
  audio_script?: string; 
  status: 'pending' | 'generating' | 'completed' | 'error';
  video_url?: string;
  audio_url?: string; 
  voice_gender?: 'Male' | 'Female'; 
  thumbnail_url?: string; // Added for image preview
}

export interface Storyboard {
  title: string;
  style: string;
  scenes: StoryboardScene[];
}

// Editor Types
export interface EditorClip {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'subtitle';
  src?: string;
  content?: string;
  thumbnail?: string;
  name: string;
  startOffset: number; 
  duration: number; 
}

export interface EditorOverlay {
  id: string;
  type: 'text' | 'subtitle';
  content: string;
  startOffset: number;
  duration: number;
  style: {
    x: number;
    y: number;
    fontSize: number;
    color: string;
    backgroundColor?: string;
  }
}

// Viral Analysis Types
export interface ViralAnalysis {
  hookScore: number; 
  retentionScore: number; 
  totalScore: number; 
  suggestions: string[];
  viralTitle: string;
  hashtags: string[];
}

// Brand Kit Settings
export interface BrandSettings {
  brandName: string;
  primaryColor: string; 
  secondaryColor: string; 
  brandVoice: string; 
  logoUrl?: string;
}

// Prompt Templates
export interface PromptTemplate {
  id: string;
  label: string;
  category: 'Viral' | 'Business' | 'Lifestyle' | 'Creative' | 'Real Estate' | 'Custom' | 'Architecture' | 'Fashion' | 'KOL' | 'Travel' | 'Inspirational' | 'Trend' | 'Emotional';
  content: string;
  style?: string; 
  icon?: string;
  isCustom?: boolean; 
  author?: string; // NEW: For Community Hub
  likes?: number; // NEW: For Community Hub
}

// Character Studio Types
export type StudioMode = 'makeup' | 'hair' | 'fashion' | 'photoshoot' | 'voice' | 'card'; // NEW: Card

export interface StylePreset {
  id: string;
  label: string;
  prompt: string;
  category: StudioMode;
  icon?: string;
}

// Live Brainstorm Note
export interface BrainstormNote {
  id: string;
  timestamp: number;
  content: string;
  type: 'idea' | 'todo';
}

// Creative Matrix Types
export interface MatrixItem {
  id: string;
  angle: 'Educational' | 'Entertaining' | 'Emotional' | 'Promotional';
  format: 'Short Video' | 'Carousel' | 'Blog/Script';
  hook: string;
  content_outline: string;
  cta: string;
}

export interface CreativeMatrix {
  productName: string;
  targetAudience: string;
  items: MatrixItem[];
}

// NEW: Trend Pulse Types
export interface TrendItem {
  id: string;
  topic: string;
  volume: 'High' | 'Rising' | 'Exploding';
  summary: string;
  video_hook: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

// NEW: AI Newsroom Types
export interface NewsScript {
  headline: string;
  intro: string;
  body: string;
  outro: string;
  ticker_items: string[];
  b_roll_prompt: string; // Prompt for creating an image overlay
}

// NEW: Interactive Story Types - UPGRADED
export interface StoryNode {
  id: string;
  parentId?: string;
  title: string;
  prompt: string;
  videoUrl?: string;
  
  // NEW FIELDS for Graph Editor & Audio
  x?: number;
  y?: number;
  narratorText?: string;
  audioUrl?: string;
  voiceId?: string; // e.g., 'Puck', 'Kore'

  choices: {
    id: string;
    label: string;
    nextNodeId?: string;
  }[];
  isStart?: boolean;
}

// NEW: AI Assistant Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// NEW: AI Color Grading Response
export interface ColorGradeParams {
  contrast: number; 
  saturation: number; 
  brightness: number; 
  sepia: number; 
  hueRotate: number; 
  grayscale: number; 
  blur: number; 
}

// NEW: Social Schedule Post
export interface SocialPost {
  id: string;
  platform: 'tiktok' | 'youtube' | 'instagram';
  content: string; // Caption
  videoUrl?: string;
  scheduledTime: number; // Timestamp
  status: 'scheduled' | 'posted' | 'failed';
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}