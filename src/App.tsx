import React, { useState, useEffect, useCallback } from 'react';
import type { GameHistoryItem, GameSettings, UserStreak, VocabWord } from './types';
import {
  getGameHistory,
  getPersonalBest,
  getSettings,
  getUserStreak,
  getVocabularyLibrary,
  saveGameHistory,
  saveSettings,
  updateUserStreak
} from './services/storageService';
import { soundService } from './services/soundService';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { VocabularyLibrary } from './components/VocabularyLibrary';
import { StatisticsDashboard } from './components/StatisticsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  useTheme();

  // Navigation Tabs
  const [currentTab, setCurrentTab] = useState<'game' | 'vocabulary' | 'statistics'>('game');

  // Game Flow States
  const [gameState, setGameState] = useState<'home' | 'playing' | 'results'>('home');
  const [lastFinishedGame, setLastFinishedGame] = useState<GameHistoryItem | null>(null);

  // Persistent App State initialized lazily from storage
  const [personalBest, setPersonalBest] = useState<number>(() => getPersonalBest());
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>(() => getGameHistory());
  const [vocabulary, setVocabulary] = useState<Record<string, VocabWord>>(() => getVocabularyLibrary());
  const [streak, setStreak] = useState<UserStreak>(() => getUserStreak());
  const [settings, setSettings] = useState<GameSettings>(() => getSettings());

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Sync storage data on demand
  const refreshStorageData = useCallback(() => {
    setPersonalBest(getPersonalBest());
    setGameHistory(getGameHistory());
    setVocabulary(getVocabularyLibrary());
    setStreak(getUserStreak());
  }, []);

  useEffect(() => {
    soundService.setSoundEnabled(settings.soundEnabled);
    soundService.setSpeechEnabled(settings.speechEnabled);
  }, [settings.soundEnabled, settings.speechEnabled]);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      if (newSettings.soundEnabled !== undefined) {
        soundService.setSoundEnabled(newSettings.soundEnabled);
      }
      if (newSettings.speechEnabled !== undefined) {
        soundService.setSpeechEnabled(newSettings.speechEnabled);
      }
      return updated;
    });
  };

  // Start Game
  const handleStartGame = () => {
    setCurrentTab('game');
    setGameState('playing');
  };

  // Finish Game
  const handleFinishGame = (gameRecord: GameHistoryItem) => {
    saveGameHistory(gameRecord);
    const updatedStreak = updateUserStreak();
    setStreak(updatedStreak);
    setLastFinishedGame(gameRecord);
    setGameState('results');
    refreshStorageData();
  };

  // Play Again
  const handlePlayAgain = () => {
    setGameState('playing');
  };

  // Go to Home
  const handleGoHome = () => {
    setGameState('home');
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'game' && gameState === 'results') {
            // keep results or return to home
          }
        }}
        streak={streak}
        vocabCount={Object.keys(vocabulary).length}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Game Tab */}
        {currentTab === 'game' && (
          <>
            {gameState === 'home' && (
              <HomeScreen
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onStartGame={handleStartGame}
                personalBest={personalBest}
                totalWordsLearned={Object.keys(vocabulary).length}
                totalGamesPlayed={gameHistory.length}
                onOpenHelp={() => setShowHelpModal(true)}
              />
            )}

            {gameState === 'playing' && (
              <GameScreen
                settings={settings}
                personalBest={personalBest}
                onFinishGame={handleFinishGame}
                onExitGame={handleGoHome}
              />
            )}

            {gameState === 'results' && lastFinishedGame && (
              <ResultsScreen
                gameRecord={lastFinishedGame}
                personalBest={personalBest}
                onPlayAgain={handlePlayAgain}
                onGoVocabulary={() => setCurrentTab('vocabulary')}
                onGoStats={() => setCurrentTab('statistics')}
                onGoHome={handleGoHome}
              />
            )}
          </>
        )}

        {/* Vocabulary Library Tab */}
        {currentTab === 'vocabulary' && (
          <VocabularyLibrary
            vocabulary={vocabulary}
            onRefresh={refreshStorageData}
            onStartSprint={handleStartGame}
          />
        )}

        {/* Statistics Dashboard Tab */}
        {currentTab === 'statistics' && (
          <StatisticsDashboard
            history={gameHistory}
            vocabulary={vocabulary}
            personalBest={personalBest}
            streak={streak}
            onRefresh={refreshStorageData}
            onStartSprint={handleStartGame}
          />
        )}
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettingsModal(false)}
          onDataReset={refreshStorageData}
        />
      )}

      {/* How to Play Modal */}
      {showHelpModal && (
        <HowToPlayModal
          onClose={() => setShowHelpModal(false)}
        />
      )}
    </div>
  );
};

export default App;
