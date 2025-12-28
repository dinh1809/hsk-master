import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import FlashcardSession from './components/FlashcardSession';
import { RefreshCw } from 'lucide-react';

const App = () => {
  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Navigation state: stores the selected deck object { id: string, data: array }
  const [currentDeck, setCurrentDeck] = useState(null);

  // Initialize auth listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Handle deck selection from Dashboard
   * @param {Array} deckData - Raw array of vocabulary items
   * @param {string} deckId - Deck identifier (e.g., 'hsk1', 'hsk2')
   */
  const handleSelectDeck = (deckData, deckId) => {
    // Store both data and id for the session
    setCurrentDeck({ data: deckData, id: deckId });
  };

  /**
   * Return to dashboard from FlashcardSession
   */
  const handleBackToMenu = () => {
    setCurrentDeck(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-slate-400 font-bold animate-pulse">Initializing...</p>
      </div>
    );
  }

  // Not authenticated - show auth screen
  if (!session) {
    return <AuthScreen />;
  }

  // Authenticated - show main app
  return (
    <div className="min-h-screen bg-gray-50 selection:bg-blue-100">
      {currentDeck ? (
        // Flashcard Session View
        <FlashcardSession
          data={currentDeck.data}
          deckId={currentDeck.id}
          onBack={handleBackToMenu}
          user={session.user}
        />
      ) : (
        // Course Dashboard View
        <Dashboard
          onSelectDeck={handleSelectDeck}
          user={session.user}
        />
      )}
    </div>
  );
};

export default App;
