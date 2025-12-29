import React, { useState, useEffect } from 'react';
import { X, Volume2, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDeckStats } from '../services/progressService';
import hsk1Data from '../data/HSK1.json';
import hsk2Data from '../data/HSK2.json';


const DeckCard = ({ deck, onSelectDeck, onViewList, stats, loading }) => {
    const { title, desc, level, color, data, isComingSoon } = deck;

    // Calculate progress percentage
    const totalWords = data?.length || 0;
    const masteredWords = stats?.mastered || 0;
    const progressPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

    return (
        <div className={`group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 border border-gray-100 flex flex-col h-full ${isComingSoon ? 'opacity-75 grayscale' : ''}`}>
            {/* Header */}
            <div className={`${color} p-5 text-white relative overflow-hidden`}>
                <div className="relative z-10">
                    <span className="inline-block px-2 py-1 mb-2 text-xs font-bold uppercase tracking-wider bg-white/20 rounded-full backdrop-blur-sm">
                        {level}
                    </span>
                    <h3 className="text-2xl font-bold">{title}</h3>
                </div>
                {/* Subtle background decoration */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Body */}
            <div className="p-6 flex-grow">
                <p className="text-gray-600 mb-6 leading-relaxed">
                    {desc}
                </p>

                {/* Progress Section */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-500">Mastery Progress</span>
                        {loading ? (
                            <RefreshCw className="animate-spin text-blue-500" size={14} />
                        ) : (
                            <span className="text-blue-600">{progressPercent}%</span>
                        )}
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Stats Pills */}
                    {!loading && stats && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {stats.mastered > 0 && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                    ✓ {stats.mastered} mastered
                                </span>
                            )}
                            {stats.due > 0 && (
                                <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                                    ⏰ {stats.due} due
                                </span>
                            )}
                            {stats.learning > 0 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                    📚 {stats.learning} learning
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 mt-auto flex gap-3">
                {isComingSoon ? (
                    <div className="w-full py-3 text-center font-bold text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        Locked
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onSelectDeck(data, deck.id)}
                            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors active:scale-95"
                        >
                            Start Learning
                        </button>
                        <button
                            onClick={() => onViewList(deck)}
                            className="px-4 py-3 text-gray-700 font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors active:scale-95"
                        >
                            View List
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const VocabListModal = ({ deck, onClose }) => {
    const speak = (text) => {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{deck.title}</h2>
                        <p className="text-slate-300 text-sm mt-1">{deck.data.length} vocabulary items</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Vocabulary List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {deck.data.map((word, index) => (
                            <div
                                key={word.id || index}
                                className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-4xl font-bold text-slate-900">
                                                {word.han || word.hanzi}
                                            </span>
                                            <button
                                                onClick={() => speak(word.han || word.hanzi)}
                                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                            >
                                                <Volume2 size={18} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                            <div>
                                                <span className="text-slate-500 font-semibold">Pinyin:</span>
                                                <span className="ml-2 text-blue-600 font-medium">{word.pinyin}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 font-semibold">Hán Việt:</span>
                                                <span className="ml-2 text-emerald-600 font-medium">{word.hanviet}</span>
                                            </div>
                                        </div>
                                        <p className="text-slate-700 font-semibold mb-1">
                                            {word.nghĩa || word.meaning}
                                        </p>
                                        {(word.example || word.example_cn) && (
                                            <div className="mt-2 pt-2 border-t border-slate-200">
                                                <p className="text-sm text-slate-600 italic">
                                                    <span className="font-semibold">Example:</span> {word.example || word.example_cn}
                                                </p>
                                                {(word.translation || word.example_vi) && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {word.translation || word.example_vi}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">
                                        #{index + 1}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ onSelectDeck, user }) => {
    const [viewingDeck, setViewingDeck] = useState(null);
    const [deckStats, setDeckStats] = useState({});
    const [loading, setLoading] = useState(true);

    const handleLogout = async () => {
        // Clear local storage to prevent data leakage to other users
        localStorage.clear();
        await supabase.auth.signOut();
    };

    const DECKS = [
        {
            id: 'hsk1',
            title: 'HSK 1: Foundation',
            desc: 'Master the first 20 essential verbs to start your Chinese journey. Perfect for absolute beginners.',
            level: 'Beginner',
            color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
            data: hsk1Data
        },
        {
            id: 'hsk2',
            title: 'HSK 2: Elementary',
            desc: 'Expand your vocabulary with 30 more common verbs. Build confidence in daily conversations.',
            level: 'Elementary',
            color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
            data: hsk2Data
        },
        {
            id: 'hsk3',
            title: 'HSK 3: Intermediate',
            desc: 'Take your skills to the next level. More complex sentence structures and useful vocabulary.',
            level: 'Coming Soon',
            color: 'bg-gradient-to-br from-gray-400 to-gray-500',
            data: [],
            isComingSoon: true
        },
    ];

    // Fetch progress stats for all decks
    useEffect(() => {
        const fetchAllStats = async () => {
            if (!user) return;

            setLoading(true);
            const stats = {};

            for (const deck of DECKS) {
                if (!deck.isComingSoon) {
                    stats[deck.id] = await getDeckStats(user.id, deck.id);
                }
            }

            setDeckStats(stats);
            setLoading(false);
        };

        fetchAllStats();
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="text-center mb-12 relative">
                    {/* Logout Button - Top Right */}
                    <button
                        onClick={handleLogout}
                        className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all active:scale-95"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>

                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        My Course Dashboard
                    </h2>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
                        Choose a vocabulary deck to begin your session.
                    </p>
                    {user && (
                        <p className="mt-2 text-sm text-slate-400">
                            Welcome back, <span className="font-bold text-blue-600">{user.email}</span>
                        </p>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DECKS.map((deck) => (
                        <DeckCard
                            key={deck.id}
                            deck={deck}
                            onSelectDeck={onSelectDeck}
                            onViewList={setViewingDeck}
                            stats={deckStats[deck.id]}
                            loading={loading}
                        />
                    ))}
                </div>
            </div>

            {/* Vocabulary List Modal */}
            {viewingDeck && (
                <VocabListModal
                    deck={viewingDeck}
                    onClose={() => setViewingDeck(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
