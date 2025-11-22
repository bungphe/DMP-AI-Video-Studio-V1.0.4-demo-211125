
import { PromptTemplate } from "../types";

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // --- VIRAL / TIKTOK ---
  {
    id: 'viral_1',
    label: 'TikTok Fast Hook',
    category: 'Viral',
    content: 'A fast-paced montage of a Gen Z teenager dancing in a neon-lit street, camera shaking slightly to the beat, glitch effects transitions, high energy, vertical ratio 9:16, trending TikTok style.',
  },
  {
    id: 'viral_2',
    label: 'Emotional Storytelling',
    category: 'Viral',
    content: 'Cinematic close-up of an elderly man smiling with tears in his eyes holding an old photograph, warm golden hour lighting, shallow depth of field, emotional and touching atmosphere, 4k resolution.',
  },
  {
    id: 'viral_3',
    label: 'Unexpected Twist',
    category: 'Viral',
    content: 'A cute cat jumping towards the camera, but mid-air it transforms into a fierce tiger, seamless morphing VFX, high quality CGI, slow motion impact.',
  },
  {
    id: 'viral_4',
    label: 'Oddly Satisfying',
    category: 'Viral',
    content: 'Macro shot of kinetic sand being sliced by a sharp knife, incredibly detailed texture, satisfying physics, soft studio lighting, 8k resolution.',
  },
  {
    id: 'viral_5',
    label: 'Looping Tunnel',
    category: 'Viral',
    content: 'Infinite loop flying through a abstract sci-fi tunnel with pulsating LED lights, synthwave aesthetic, purple and teal color palette, hypnotic motion.',
  },
  {
    id: 'viral_6',
    label: 'ASMR Soap Cutting',
    category: 'Viral',
    content: 'Extreme close-up of a cube of soap being carved into tiny squares, crisp audio visual representation, pastel colors, satisfying crumbling physics.',
  },
  {
    id: 'viral_7',
    label: 'Parkour POV',
    category: 'Viral',
    content: 'POV shot of a parkour runner jumping between rooftops in a dense city at sunset, wide angle lens, high adrenaline, camera shake, wind effects.',
  },

  // --- ARCHITECTURE & REAL ESTATE ---
  {
    id: 'arch_1',
    label: 'Sketch to Reality',
    category: 'Architecture',
    content: 'Timelapse transformation: A white paper with a hand-drawn pencil sketch of a modern glass skyscraper evolves into a wireframe 3D model, then renders into a photorealistic building in a busy city sunset. Smooth morphing, 8k architectural visualization.',
  },
  {
    id: 'arch_2',
    label: 'Luxury Villa Tour',
    category: 'Real Estate',
    content: 'Slow smooth drone shot flying into a modern luxury villa on a cliffside, floor-to-ceiling glass windows, infinity pool reflecting the ocean, sunset lighting, unreal engine 5 render quality.',
  },
  {
    id: 'arch_3',
    label: 'Interior Design Reveal',
    category: 'Architecture',
    content: 'Camera glides through an empty concrete room that magically fills with luxury Scandinavian furniture, rugs, and warm lighting. Before and after style transformation, photorealistic.',
  },
  {
    id: 'arch_4',
    label: 'Futuristic Eco-City',
    category: 'Architecture',
    content: 'A futuristic eco-city with buildings covered in vertical gardens, flying cars passing by, solar punk aesthetic, bright natural lighting, utopia atmosphere.',
  },
  {
    id: 're_1',
    label: 'Penthouse Panorama',
    category: 'Real Estate',
    content: 'Wide angle shot inside a luxury penthouse living room, panning to show the panoramic night view of the New York skyline through massive windows, expensive marble floors, ambient lighting.',
  },
  {
    id: 're_2',
    label: 'Cozy Cabin Flyover',
    category: 'Real Estate',
    content: 'Aerial drone shot revealing a cozy wooden A-frame cabin hidden in a snowy forest, smoke coming from chimney, warm yellow light from windows, winter wonderland atmosphere.',
  },
  {
    id: 're_3',
    label: 'Modern Kitchen Dolly',
    category: 'Real Estate',
    content: 'Slow dolly zoom across a marble kitchen island in a high-end apartment, morning sunlight streaming through blinds, bowl of fresh fruit, sharp focus, 4k.',
  },

  // --- FASHION & KOL ---
  {
    id: 'fash_1',
    label: 'Cyberpunk Runway',
    category: 'Fashion',
    content: 'A fashion model walking on a rainy neon street runway, wearing holographic translucent clothing, futuristic visor glasses, confident strut, cinematic lighting, cyberpunk 2077 aesthetic.',
  },
  {
    id: 'fash_2',
    label: 'High Fashion Editorial',
    category: 'Fashion',
    content: 'Portrait of a fashion icon in an avant-garde red dress blowing in the wind, desert dunes background, dramatic high-contrast fashion photography lighting, shot on 85mm lens.',
  },
  {
    id: 'fash_3',
    label: 'KOL Lifestyle Vlog',
    category: 'KOL',
    content: 'POV shot of a lifestyle influencer holding a coffee cup in a cozy aesthetic cafe in Paris, Eiffel tower in background, soft morning light, dreamy bokeh, slow motion.',
  },
  {
    id: 'fash_4',
    label: 'Sneaker Commercial',
    category: 'Fashion',
    content: 'Dynamic 360-degree camera spin around a floating limited edition sneaker, parts of the shoe assemble in mid-air, studio lighting, hypebeast style, 8k product render.',
  },
  {
    id: 'fash_5',
    label: 'Streetwear Slow-Mo',
    category: 'Fashion',
    content: 'Group of cool models wearing oversized streetwear walking towards camera in slow motion, urban graffiti background, smoke flares, trap music video vibe.',
  },

  // --- TRAVEL & INSPIRATION ---
  {
    id: 'trav_1',
    label: 'Cinematic Travel Montage',
    category: 'Travel',
    content: 'Montage of breathtaking travel locations: Santorini blue roofs, Kyoto cherry blossoms, and Icelandic waterfalls. Fast transitions, vivid colors, cinematic 4k travel vlog style.',
  },
  {
    id: 'trav_2',
    label: 'Mountain Summit',
    category: 'Inspirational',
    content: 'A lone hiker reaching the summit of a high snowy mountain at sunrise, raising arms in victory, sea of clouds below, epic orchestral atmosphere, wide angle lens.',
  },
  {
    id: 'trav_3',
    label: 'Road Trip POV',
    category: 'Travel',
    content: 'POV from driver seat driving a classic convertible car along the Pacific Coast Highway, ocean on the side, wind in hair, golden hour sun flare, sense of freedom.',
  },
  {
    id: 'trav_4',
    label: 'Underwater Reef',
    category: 'Travel',
    content: 'Swimming through a vibrant coral reef with schools of tropical fish, sun rays piercing through the water surface, crystal clear blue water, 4k nature documentary style.',
  },
  {
    id: 'trav_5',
    label: 'Northern Lights',
    category: 'Travel',
    content: 'Time-lapse of the Aurora Borealis dancing over a frozen lake in Norway, stars rotating in the sky, reflection on ice, magical atmosphere.',
  },

  // --- BUSINESS & ADS ---
  {
    id: 'ad_1',
    label: 'Perfume Bottle Splash',
    category: 'Business',
    content: 'Slow motion close-up of a luxury gold perfume bottle falling into water, splashing droplets, dramatic backlighting, elegant and expensive feel, high speed camera.',
  },
  {
    id: 'ad_2',
    label: 'Tech Gadget Reveal',
    category: 'Business',
    content: 'Dark sleek silhouette of a new smartphone, rim lighting slowly reveals the metallic edges and camera lenses, tech minimalism, glossy reflection, Apple commercial style.',
  },
  {
    id: 'ad_3',
    label: 'Food Cinematography',
    category: 'Business',
    content: 'Macro shot of sizzling steak on a grill, flames licking the sides, seasoning falling in slow motion, steam rising, mouth-watering food commercial quality.',
  },
  {
    id: 'ad_4',
    label: 'Coffee Pour',
    category: 'Business',
    content: 'Slow motion pour of espresso into a glass of milk, swirling patterns, coffee beans scattered on wooden table, warm lighting, cafe commercial.',
  },
  {
    id: 'ad_5',
    label: 'Corporate Meeting',
    category: 'Business',
    content: 'Diverse team of professionals brainstorming around a glass table in a modern office, pointing at charts, smiling, shaking hands, bright and optimistic corporate video.',
  },

  // --- TREND & MEME ---
  {
    id: 'trend_1',
    label: 'Wes Anderson Style',
    category: 'Trend',
    content: 'A perfectly symmetrical shot of a quirky character standing in front of a pastel yellow building, deadpan expression, vibrant pastel colors, flat lighting, Wes Anderson film aesthetic.',
  },
  {
    id: 'trend_2',
    label: 'Retro Anime 90s',
    category: 'Trend',
    content: 'A lo-fi scene of a girl studying at a desk with headphones, rain outside the window, 90s anime art style, nostalgic vibe, Studio Ghibli inspired.',
  },
  {
    id: 'trend_3',
    label: 'Vaporwave Drive',
    category: 'Trend',
    content: 'Driving a Testarossa towards a wireframe sunset grid, palm trees on side, magenta and cyan fog, VHS glitch effects, retro 80s synthwave style.',
  },

  // --- EMOTIONAL ---
  {
    id: 'emo_1',
    label: 'Reunion Hug',
    category: 'Emotional',
    content: 'Two long-lost friends running towards each other in an airport terminal and hugging tightly, emotional facial expressions, cinematic candid style, heartwarming.',
  },
  {
    id: 'emo_2',
    label: 'Rainy Window Reflection',
    category: 'Emotional',
    content: 'Close up of rain droplets on a window pane at night, city lights bokeh in background, reflection of a sad person looking out, moody and melancholic atmosphere.',
  },
  {
    id: 'emo_3',
    label: 'Childhood Memory',
    category: 'Emotional',
    content: 'Golden hour shot of a father teaching his child to ride a bike in a park, laughter, soft focus, lens flare, nostalgic and pure happiness.',
  }
];
