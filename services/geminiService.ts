
import { GoogleGenAI, Type, Modality, VideoGenerationReferenceType, SafetySetting, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { AIModel, Storyboard, VideoConfig, ViralAnalysis, CreativeMatrix, TrendItem, ColorGradeParams, NewsScript, StoryNode } from "../types";

// Helper to get client - Creates new instance to ensure fresh key usage
const getAiClient = () => {
  try {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client", error);
    throw new Error("AI Client Initialization Failed");
  }
};

// Improved Helper to clean JSON string
const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  let cleaned = str.trim();
  if (cleaned.includes("```json")) {
    cleaned = cleaned.split("```json")[1];
    if (cleaned.includes("```")) cleaned = cleaned.split("```")[0];
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.split("```")[1];
    if (cleaned.includes("```")) cleaned = cleaned.split("```")[0];
  }
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return cleaned; 

  let startIdx = 0;
  if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) startIdx = firstBrace;
  else startIdx = firstBracket;

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);

  if (endIdx > startIdx) cleaned = cleaned.substring(startIdx, endIdx + 1);
  return cleaned.trim();
};

// --- Retry Logic ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Enhanced error detection for Google GenAI SDK and raw responses
    const msg = error?.message || error?.toString() || "";
    const isQuotaError = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.error?.code === 429 || 
      error?.error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.response?.status === 429 ||
      msg.includes('429') || 
      msg.toLowerCase().includes('quota') || 
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.toLowerCase().includes('too many requests');
    
    if (isQuotaError) {
      if (retries > 0) {
        const nextDelay = delay * 2;
        console.warn(`Quota exceeded (429). Retrying in ${delay}ms... (${retries} attempts left)`);
        await wait(delay);
        return withRetry(fn, retries - 1, nextDelay); // Exponential backoff
      } else {
        throw new Error("QUOTA_EXCEEDED");
      }
    }

    if (msg.includes("Requested entity was not found")) throw new Error("KEY_NOT_FOUND");
    if (msg.includes("API key not valid")) throw new Error("API_KEY_INVALID");
    if (msg.toLowerCase().includes("safety")) throw new Error("CONTENT_POLICY");
    if (msg.includes("fetch") || msg.includes("network")) throw new Error("NETWORK_ERROR");

    throw error;
  }
}

// --- Audio Utilities ---

// Convert AudioBuffer to WAV Blob
export function bufferToWave(abuffer: AudioBuffer, len: number) {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this demo)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
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

export const generateSpeech = async (
  text: string,
  voiceName: string,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  const ai = getAiClient();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from Gemini");

    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
      24000,
      1, 
    );
    return audioBuffer;
  } catch (error) {
    console.error("TTS Error", error);
    throw error;
  }
};

export const generateSoundEffect = async (
  description: string,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  return generateSpeech(description, "Fenrir", audioContext);
};

export const generateScript = async (
  topic: string, 
  style: string, 
  duration: string,
  platform: string = 'YouTube',
  targetAudience: string = 'General Audience',
  language: string = 'vi'
): Promise<string> => {
  const ai = getAiClient();
  const langInstruction = language === 'vi' ? 'Respond in Vietnamese (Tiếng Việt).' : 'Respond in English.';
  const prompt = `Create a video script about "${topic}".
  Target Platform: ${platform}, Audience: ${targetAudience}, Style: ${style}, Duration: ${duration}
  ${langInstruction}
  Format output as JSON with scenes, visual descriptions, and voiceover text.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            synopsis: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  visual: { type: Type.STRING },
                  audio: { type: Type.STRING },
                  durationSeconds: { type: Type.NUMBER }
                },
                required: ["sceneNumber", "visual", "audio", "durationSeconds"]
              }
            }
          },
          required: ["title", "synopsis", "scenes"]
        }
      }
    }));
    return cleanJsonString(response.text || "{}");
  } catch (error) { console.error("Script gen error", error); throw error; }
};

export const generateNewsScript = async (headline: string, category: string, language: string): Promise<NewsScript> => {
  const ai = getAiClient();
  const langInstruction = language === 'vi' ? 'Tiếng Việt (Vietnamese)' : 'English';
  
  const prompt = `You are a professional TV News Director. 
  Create a structured broadcast script for a breaking news story.
  Headline: "${headline}".
  Category: "${category}".
  Language: ${langInstruction}.
  
  Structure required:
  1. Headline: Catchy, short title.
  2. Intro: Anchor greeting and hook (approx 10s).
  3. Body: The main story details (approx 20s).
  4. Outro: Sign off and call to action (approx 5s).
  5. Ticker Items: 5 related short news snippets for the scrolling ticker.
  6. B-Roll Prompt: An English prompt to generate a background image summarizing the story (for Imagen).
  
  Return JSON.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            intro: { type: Type.STRING },
            body: { type: Type.STRING },
            outro: { type: Type.STRING },
            ticker_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            b_roll_prompt: { type: Type.STRING }
          },
          required: ["headline", "intro", "body", "outro", "ticker_items", "b_roll_prompt"]
        }
      }
    }));
    return JSON.parse(cleanJsonString(response.text || "{}")) as NewsScript;
  } catch (error) { throw error; }
};

export const refineScriptText = async (
  originalText: string,
  instruction: string,
  language: string = 'vi'
): Promise<string> => {
  const ai = getAiClient();
  const prompt = `Refine text based on: "${instruction}". Original: "${originalText}". Language: ${language === 'vi' ? 'Vietnamese' : 'English'}. Return ONLY refined text.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT,
      contents: prompt,
      config: { maxOutputTokens: 1024 }
    }));
    return response.text?.trim() || originalText;
  } catch (e) { return originalText; }
};

export const analyzeViralPotential = async (scriptContent: any, language: string = 'vi'): Promise<ViralAnalysis> => {
  const ai = getAiClient();
  const scriptText = JSON.stringify(scriptContent);
  const prompt = `Act as a Social Media Algorithm Expert. Analyze this video script for Viral Potential. Script: ${scriptText}
    Task: Rate Hook (1-10), Retention (1-10), Total (0-100). Provide 3 suggestions, viral title, hashtags. Language: ${language === 'vi' ? 'Vietnamese' : 'English'}. Return JSON.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hookScore: { type: Type.NUMBER },
            retentionScore: { type: Type.NUMBER },
            totalScore: { type: Type.NUMBER },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            viralTitle: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["hookScore", "retentionScore", "totalScore", "suggestions", "viralTitle", "hashtags"]
        }
      }
    }));
    const cleanText = cleanJsonString(response.text || "{}");
    const result = JSON.parse(cleanText);
    if (!result.suggestions) result.suggestions = [];
    if (!result.hashtags) result.hashtags = [];
    return result as ViralAnalysis;
  } catch (error) { throw error; }
};

export const generateStoryboard = async (
  topic: string,
  language: string = 'vi',
  sceneCount: number = 5,
  mode: 'cinematic' | 'viral_shorts' = 'cinematic'
): Promise<Storyboard> => {
  const ai = getAiClient();
  const langInstruction = language === 'vi' ? 'Descriptions in Vietnamese, prompt_optimized in English.' : 'Everything in English.';
  const prompt = `You are an Expert AI Film Director. Create storyboard for: "${topic}".
  Mode: ${mode}. Break into ${sceneCount} scenes.
  For 'prompt_optimized', write a MASTERPIECE VIDEO PROMPT for Google Veo 3.1.
  For 'audio_script', write voiceover.
  Determine 'voice_gender'.
  ${langInstruction} Return JSON.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 4096 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            style: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  visual_description: { type: Type.STRING },
                  audio_script: { type: Type.STRING },
                  camera_angle: { type: Type.STRING },
                  prompt_optimized: { type: Type.STRING },
                  voice_gender: { type: Type.STRING, enum: ["Male", "Female"] }
                },
                required: ["id", "visual_description", "audio_script", "camera_angle", "prompt_optimized", "voice_gender"]
              }
            }
          },
          required: ["title", "style", "scenes"]
        }
      }
    }));
    const cleanText = cleanJsonString(response.text || "{}");
    let result = JSON.parse(cleanText);
    if (result.scenes && Array.isArray(result.scenes)) {
      result.scenes = result.scenes.map((s: any) => ({ ...s, status: 'pending' }));
    } else { result.scenes = []; }
    return result as Storyboard;
  } catch (error) { throw new Error("Failed to generate storyboard"); }
};

export const generateSceneImage = async (prompt: string, aspectRatio: string = '16:9'): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await withRetry<any>(() => ai.models.generateImages({
      model: AIModel.IMAGE_GEN,
      prompt: prompt,
      config: { numberOfImages: 1, aspectRatio: aspectRatio as any, outputMimeType: 'image/jpeg' }
    }));
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) throw new Error("No image generated");
    return `data:image/jpeg;base64,${imageBytes}`;
  } catch (error) { throw error; }
};

export const enhanceVideoPrompt = async (userPrompt: string, language: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `Transform into cinematic Veo prompt: "${userPrompt}". Add camera, lighting, detail specs. Output ONLY enhanced prompt in English.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT, contents: prompt, config: { maxOutputTokens: 1024 }
    }));
    return response.text || userPrompt;
  } catch (e) { return userPrompt; }
};

export const generateVideo = async (
  prompt: string,
  onProgress: (statusCode: string) => void,
  referenceImages: { data: string, mimeType: string }[] = [],
  videoConfig?: VideoConfig
): Promise<string | null> => {
  const ai = getAiClient();
  try {
    onProgress("init");
    const useHQ = referenceImages.length > 1;
    const model = useHQ ? AIModel.VIDEO_HQ : AIModel.VIDEO_FAST;
    const config: any = {
      numberOfVideos: 1,
      resolution: useHQ ? '720p' : (videoConfig?.resolution || '720p'),
      aspectRatio: useHQ ? '16:9' : (videoConfig?.aspectRatio || '16:9')
    };
    let finalPrompt = prompt;
    if (videoConfig?.fps) finalPrompt += ` (frame rate: ${videoConfig.fps} fps)`;

    const requestParams: any = { model: model, prompt: finalPrompt, config: config };

    if (referenceImages.length === 1 && !useHQ) {
      requestParams.image = { imageBytes: referenceImages[0].data, mimeType: referenceImages[0].mimeType };
    } else if (useHQ) {
      config.referenceImages = referenceImages.map(img => ({
        image: { imageBytes: img.data, mimeType: img.mimeType },
        referenceType: VideoGenerationReferenceType.ASSET
      }));
    }

    // Wrap the initial generation call with aggressive retry for quotas
    let operation = await withRetry<any>(() => ai.models.generateVideos(requestParams), 5, 5000);
    
    if (!operation || !operation.name) throw new Error("Operation failed to start");
    onProgress("rendering");

    let retries = 0;
    const maxRetries = 120; 
    while (!operation.done && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Polling interval
      retries++;
      try {
        // FIX: Use 'operation' parameter key and pass operation.name to ensure correct polling
        // 'getVideosOperation' expects { operation: string | Operation }
        const updatedOp = await withRetry<any>(() => ai.operations.getVideosOperation({ operation: operation.name }), 3, 2000);
        
        // Safeguard: Ensure we don't overwrite 'operation' with an invalid object
        if (updatedOp && (updatedOp.name || updatedOp.done)) {
            operation = updatedOp;
        } else if (!updatedOp) {
            console.warn("Received empty operation update, continuing...");
        }
        
        onProgress("still_rendering");
      } catch (pollError) {
         console.warn("Polling warning (retrying...)", pollError);
         // Do not throw here, let the loop continue to retry polling unless operation was somehow lost
         if (!operation || !operation.name) break; 
      }
    }
    
    if (operation.error) throw new Error(operation.error.message || "Video generation failed");
    if (!operation.done) throw new Error("Video generation timed out");

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI in response");
    
    return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (error) { 
      console.error("Video gen failed", error); 
      throw error; 
  }
};

export const createCharacterFromImage = async (
  base64Image: string,
  style: string,
  onStatus: (status: string) => void
): Promise<string> => {
  const ai = getAiClient();
  try {
    onStatus('analyzing');
    const analysisResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT,
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: "Analyze face, hair, age, features. Output descriptive visual profile." }
      ]
    }));
    const description = analysisResponse.text;
    onStatus('generating');
    const isDigitalTwin = style.includes("Digital Twin");
    const prompt = `Generate character portrait. Style: ${style}. Features: ${description}. ${isDigitalTwin ? "Photorealistic, exact likeness." : ""} High res.`;
    const imageResponse = await withRetry<any>(() => ai.models.generateImages({
      model: AIModel.IMAGE_GEN,
      prompt: prompt,
      config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
    }));
    const bytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    if (!bytes) throw new Error("Failed");
    return `data:image/jpeg;base64,${bytes}`;
  } catch (error) { throw error; }
};

export const editCharacterStyle = async (
  base64Image: string,
  instruction: string,
  onStatus: (status: string) => void
): Promise<string> => {
  const ai = getAiClient();
  try {
    onStatus('analyzing');
    const analysisResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT, 
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: `Analyze image. Retain identity. Change: "${instruction}". Output prompt.` }
      ]
    }));
    const prompt = analysisResponse.text || instruction;
    onStatus('rendering');
    const imageResponse = await withRetry<any>(() => ai.models.generateImages({
      model: AIModel.IMAGE_GEN,
      prompt: `Photorealistic. ${prompt}. High quality.`,
      config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
    }));
    const bytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    if (!bytes) throw new Error("Failed");
    return `data:image/jpeg;base64,${bytes}`;
  } catch(e) { throw e; }
};

export const generateRandomIdea = async (category: string, language: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `Generate creative video idea for "${category}". Language: ${language}. One sentence.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
       model: AIModel.FAST_TEXT, contents: prompt, config: { maxOutputTokens: 100, temperature: 1.2 }
    }));
    return response.text?.trim() || "";
  } catch (e) { return ""; }
};

export const generateViralShortsMetadata = async (context: string, language: string): Promise<any[]> => {
  const ai = getAiClient();
  const prompt = `Based on "${context}", invent 3 viral segments. JSON: [{id, startTime, duration, viralScore, reason, caption}].`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT, contents: prompt, config: { responseMimeType: "application/json" }
    }));
    const result = JSON.parse(cleanJsonString(response.text || "[]"));
    return Array.isArray(result) ? result : [];
  } catch (e) { return []; }
};

export const generateCreativeMatrix = async (productName: string, targetAudience: string, language: string): Promise<CreativeMatrix> => {
  const ai = getAiClient();
  const prompt = `Create Content Strategy Matrix for "${productName}", audience "${targetAudience}". 
    Dimensions: Angles(Educational,Entertaining,Emotional,Promotional) x Formats(Short Video,Carousel,Blog). 
    Return JSON {productName, targetAudience, items:[{id, angle, format, hook, content_outline, cta}]}. Language: ${language}.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT, contents: prompt, config: { maxOutputTokens: 8192, responseMimeType: "application/json" }
    }));
    const result = JSON.parse(cleanJsonString(response.text || "{}"));
    if (!result.items) result.items = [];
    return result as CreativeMatrix;
  } catch (error) { throw error; }
};

export const getTrendingTopics = async (niche: string, language: string): Promise<TrendItem[]> => {
  const ai = getAiClient();
  const prompt = `Find 5 hot trending topics for "${niche}" (last 48h) using Google Search. 
    JSON Array: [{id, topic, volume(High/Rising), summary, video_hook}]. Language: ${language}.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT, contents: prompt, config: { tools: [{ googleSearch: {} }] }
    }));
    const text = cleanJsonString(response.text || "[]");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let trends: TrendItem[] = [];
    try { trends = JSON.parse(text); } catch (e) { return []; }
    if (groundingChunks && trends.length > 0) {
       trends.forEach((t, i) => {
          if (groundingChunks[i]?.web?.uri) {
             t.sourceUrl = groundingChunks[i].web.uri;
             t.sourceTitle = groundingChunks[i].web.title;
          }
       });
    }
    return trends;
  } catch (error) { throw error; }
};

export const generateColorGrade = async (description: string): Promise<ColorGradeParams> => {
  const ai = getAiClient();
  const prompt = `Convert "${description}" into CSS Filter params JSON {contrast, saturation, brightness, sepia, hueRotate, grayscale, blur}.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJsonString(response.text || "{}"));
  } catch (error) { return { contrast: 100, saturation: 100, brightness: 100, sepia: 0, hueRotate: 0, grayscale: 0, blur: 0 }; }
};

export const transformTextToVideoPlan = async (inputText: string, language: string): Promise<any> => {
  const ai = getAiClient();
  const prompt = `Transform text into Video Plan. Text: "${inputText.substring(0,8000)}". 
    JSON: {title, synopsis, scenes:[{sceneNumber, visual, audio, durationSeconds}]}. Language: ${language}.`;
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT, contents: prompt, config: { thinkingConfig: { thinkingBudget: 1024 }, responseMimeType: "application/json" }
    }));
    const result = JSON.parse(cleanJsonString(response.text || "{}"));
    if (!result.scenes) result.scenes = [];
    return result;
  } catch (error) { throw error; }
};

export const analyzeImageTags = async (base64Image: string): Promise<string[]> => {
  const ai = getAiClient();
  const prompt = "Identify objects, style, color palette, and mood in this image. Return tags as JSON array of strings. e.g. ['cat', 'neon', 'cyberpunk'].";
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT,
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: prompt }
      ],
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) { return ["image", "asset"]; }
};

export const suggestMakeupStyle = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = "Analyze this face and suggest a trendy makeup style description for an AI image editor. Keep it under 20 words.";
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.FAST_TEXT,
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    }));
    return response.text || "Natural makeup style";
  } catch (e) { return "Natural makeup style"; }
};

export const generateRealEstateScript = async (features: string[], agentName: string, vibe: string): Promise<string> => {
  const ai = getAiClient();
  const featuresStr = features.join(", ");
  const prompt = `You are a professional Real Estate Copywriter. Write a short, engaging video script (approx 30-45 seconds) for an agent named "${agentName}".
  Property Features detected: ${featuresStr}.
  Vibe/Music Style: ${vibe}.
  Structure:
  1. Hook (Grab attention)
  2. Key Highlights (Weave features naturally)
  3. Call to Action.
  Output ONLY the script text in Vietnamese (Tiếng Việt). Make it sound natural, not robotic.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: { maxOutputTokens: 2048 }
    }));
    return response.text || "";
  } catch (e) { return ""; }
};

// NEW: Interactive Story Structure Generation
export const generateInteractiveStoryStructure = async (premise: string, language: string): Promise<StoryNode[]> => {
  const ai = getAiClient();
  const prompt = `Act as an expert Interactive Story Architect. 
  Create a branching story structure based on this premise: "${premise}".
  Language: ${language}.
  
  Output a JSON array of nodes.
  Each node structure:
  {
    "id": "unique_string_id",
    "title": "Short Node Title",
    "prompt": "Detailed visual description for video generation (English)",
    "narratorText": "The story narration text for this scene",
    "choices": [
      { "id": "c1", "label": "Choice Text", "nextNodeId": "target_node_id" }
    ],
    "isStart": boolean (true only for the first node)
  }
  
  Create at least 5 nodes with logical connections. Ensure coordinates (x,y) are not needed in JSON, I will layout them.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: AIModel.SCRIPT,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 }
      }
    }));
    
    const nodes = JSON.parse(cleanJsonString(response.text || "[]"));
    
    // Post-process to add default layout coordinates to prevent stacking
    let x = 0; 
    let y = 0;
    return nodes.map((node: any, i: number) => {
       // Simple diagonal layout for initial placement
       const processedNode = { ...node, x: x, y: y };
       x += 350;
       y += 150;
       return processedNode;
    });
  } catch (error) {
    console.error("Story Gen Error", error);
    throw error;
  }
};
