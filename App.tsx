
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScriptGenerator from './pages/ScriptGenerator';
import VideoGenerator from './pages/VideoGenerator';
import AgentDirector from './pages/AgentDirector';
import AudioGenerator from './pages/AudioGenerator';
import PostProduction from './pages/PostProduction';
import SettingsPage from './pages/Settings';
import CharacterStudio from './pages/CharacterStudio';
import LiveBrainstorm from './pages/LiveBrainstorm';
import AIClips from './pages/AIClips';
import CreativeMatrixPage from './pages/CreativeMatrix';
import TrendPulse from './pages/TrendPulse'; 
import PromptLibrary from './pages/PromptLibrary';
import Projects from './pages/Projects';
import MagicProducer from './pages/MagicProducer';
import SocialScheduler from './pages/SocialScheduler';
import RealEstateAgent from './pages/RealEstateAgent'; 
import Newsroom from './pages/Newsroom';
import PodcastVisualizer from './pages/PodcastVisualizer';
import InteractiveStory from './pages/InteractiveStory'; // NEW
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import WelcomeScreen from './components/WelcomeScreen';

const AppRoutes = () => {
  const { t } = useLanguage();
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/magic" element={<MagicProducer />} />
        <Route path="/real-estate" element={<RealEstateAgent />} />
        <Route path="/newsroom" element={<Newsroom />} />
        <Route path="/podcast" element={<PodcastVisualizer />} />
        <Route path="/interactive" element={<InteractiveStory />} />
        <Route path="/library" element={<PromptLibrary />} />
        <Route path="/script" element={<ScriptGenerator />} />
        <Route path="/shorts" element={<ScriptGenerator />} />
        <Route path="/live" element={<LiveBrainstorm />} />
        <Route path="/matrix" element={<CreativeMatrixPage />} />
        <Route path="/trend" element={<TrendPulse />} />
        <Route path="/video" element={<VideoGenerator />} />
        <Route path="/audio" element={<AudioGenerator />} />
        <Route path="/clips" element={<AIClips />} />
        <Route path="/agents" element={<AgentDirector />} />
        <Route path="/post" element={<PostProduction />} />
        <Route path="/scheduler" element={<SocialScheduler />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/studio" element={<CharacterStudio />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  // Check if user has visited before (optional, currently set to always show for demo impact)
  useEffect(() => {
    // const hasVisited = sessionStorage.getItem('has_visited');
    // if (hasVisited) setShowWelcome(false);
  }, []);

  const handleEnterApp = () => {
    setShowWelcome(false);
    sessionStorage.setItem('has_visited', 'true');
  };

  return (
    <ErrorBoundary>
      <LanguageProvider>
        {showWelcome ? (
           <WelcomeScreen onEnter={handleEnterApp} />
        ) : (
           <Router>
             <AppRoutes />
           </Router>
        )}
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;