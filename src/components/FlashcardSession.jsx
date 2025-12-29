import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    BookOpen,
    Edit3,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
    Volume2,
    Image as ImageIcon,
    X,
    PlusCircle,
    RotateCcw,
    Upload,
    Clock,
    ThumbsDown,
    ThumbsUp,
    Zap,
    VolumeX,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Mic,
    MicOff,
    Play
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { calculateNextReview, getDueCards, getStats } from '../utils/sm2';
import { pinyin } from 'pinyin-pro';
import VoiceVisualizer from './VoiceVisualizer';
import { saveWordProgress, getUserProgress } from '../services/progressService';

const FlashcardSession = ({ data: initialData, onBack, user, deckId }) => {
    const [vocab, setVocab] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState('memorize'); // 'memorize' | 'writing' | 'review'
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [isCorrect, setIsCorrect] = useState(null);
    const [stats, setStats] = useState({ learned: 0, total: 0, due: 0, new: 0, mastered: 0 });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkInputText, setBulkInputText] = useState("");
    const [newWord, setNewWord] = useState({
        han: "", pinyin: "", hanviet: "", nghĩa: "", chineasy: "", context: "", example: "", translation: ""
    });
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Shadowing Mode States
    const [isShadowingMode, setIsShadowingMode] = useState(false);
    const [shadowingContentMode, setShadowingContentMode] = useState('word'); // 'word' | 'sentence'
    const [shadowingStatus, setShadowingStatus] = useState('idle'); // 'idle' | 'listening' | 'recording' | 'reviewing'
    const [hasPermission, setHasPermission] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [activeStream, setActiveStream] = useState(null);

    // Refs for audio recording
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordedAudioRef = useRef(null);
    const nativeAudioRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const utteranceRef = useRef(null);

    // Initialize vocab from database progress
    useEffect(() => {
        const fetchVocab = async () => {
            setIsLoading(true);
            try {
                // Normalize initial data
                // Normalize initial data
                const normalizedData = initialData.map((item, idx) => ({
                    ...item,
                    id: item.id || `local-${idx}`,
                    han: item.han || item.hanzi || "",
                    nghĩa: item.nghĩa || item.meaning || "",
                    pinyin: item.pinyin || "",
                    hanviet: item.hanviet || "",
                    chineasy: item.chineasy || "",
                    context: item.context || "",
                    example: item.example || item.example_cn || "",
                    translation: item.translation || item.example_vi || ""
                }));

                // If user and deckId are available, load progress from database
                if (user && deckId) {
                    const progress = await getUserProgress(user.id, deckId);

                    // Merge database progress with initial data (Left Join Pattern)
                    const mergedVocab = normalizedData.map(word => {
                        const savedProgress = progress.find(p => p.word_id === word.id);
                        if (savedProgress) {
                            return {
                                ...word,
                                interval: savedProgress.interval || 0,
                                repetitions: savedProgress.repetitions || 0,
                                ease_factor: savedProgress.ease_factor || 2.5,
                                next_review_at: savedProgress.next_review_at,
                                last_reviewed: savedProgress.last_reviewed_at,
                                status: savedProgress.status || 'new',
                                step_index: savedProgress.step_index || 0
                            };
                        }
                        // DEFAULT VALUES FOR NEW CARDS (Left Join Pattern)
                        // This ensures new users don't crash when they have zero progress
                        return {
                            ...word,
                            interval: 0,
                            repetitions: 0,
                            ease_factor: 2.5,
                            next_review_at: null,
                            last_reviewed: null,
                            status: 'new',
                            step_index: 0
                        };
                    });

                    setVocab(mergedVocab);
                } else {
                    // Fallback: use localStorage if no auth
                    const localDeckId = initialData[0]?.level || 'custom';
                    const saved = localStorage.getItem(`hsk_vocab_${localDeckId}`);
                    if (saved) {
                        setVocab(JSON.parse(saved));
                    } else {
                        setVocab(normalizedData);
                    }
                }
            } catch (error) {
                console.error('Error initializing vocab:', error);
                setVocab(initialData.map((item, idx) => ({
                    ...item,
                    id: item.id || `local-${idx}`,
                    han: item.han || item.hanzi || "",
                    nghĩa: item.nghĩa || item.meaning || "",
                    pinyin: item.pinyin || "",
                    hanviet: item.hanviet || "",
                    chineasy: item.chineasy || "",
                    context: item.context || "",
                    example: item.example || item.example_cn || "",
                    translation: item.translation || item.example_vi || ""
                })));
            } finally {
                setIsLoading(false);
            }
        };
        fetchVocab();
    }, [initialData, user, deckId]);

    // Sync to localStorage - DISABLE for authenticated users
    useEffect(() => {
        // Only sync to localStorage if user is NOT logged in
        if (!user && vocab.length > 0) {
            const deckId = vocab[0]?.level || 'custom';
            localStorage.setItem(`hsk_vocab_${deckId}`, JSON.stringify(vocab));
        }

        if (vocab.length > 0) {
            setStats(prev => ({ ...prev, ...getStats(vocab), total: vocab.length }));
        }
    }, [vocab, user]);

    const dueCards = useMemo(() => getDueCards(vocab), [vocab]);

    const currentWord = useMemo(() => {
        if (mode === 'review') {
            return dueCards[currentIndex] || dueCards[0] || {};
        }
        return vocab[currentIndex] || vocab[0] || {};
    }, [mode, vocab, dueCards, currentIndex]);

    const speak = (text) => {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    };

    // Enhanced speak function with callback support for shadowing
    const speakText = (text, lang = 'zh-CN', onEndCallback = null) => {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.8;

        if (onEndCallback) {
            utterance.onend = onEndCallback;
        }

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (isAudioEnabled && currentWord?.han && !isLoading && !isShadowingMode) {
            speak(currentWord.han);
        }
    }, [currentWord?.han, isAudioEnabled, isLoading, isShadowingMode]);

    // Shadowing Mode: Request microphone permission
    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            alert('Microphone access is required for Shadowing Mode.');
            return false;
        }
    };

    // Shadowing Mode: Start the cycle when card changes
    useEffect(() => {
        if (isShadowingMode && currentWord?.han && !isLoading) {
            startShadowingCycle();
        }
        return () => {
            // Cleanup on card change
            if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            if (recordedAudioRef.current) {
                URL.revokeObjectURL(recordedAudioRef.current);
                recordedAudioRef.current = null;
            }
            setActiveStream(null);
        };
    }, [currentWord?.han, isShadowingMode, isLoading]);

    // Shadowing Mode: Main cycle
    const startShadowingCycle = () => {
        setShadowingStatus('listening');
        setRecordingProgress(0);

        // Determine what to play based on mode
        const textToSpeak = shadowingContentMode === 'sentence'
            ? (currentWord.example || currentWord.example_cn || currentWord.han)
            : currentWord.han;

        // Play native audio with callback
        speakText(textToSpeak, 'zh-CN', () => {
            // After native audio ends, start recording
            startRecording();
        });
    };

    // Shadowing Mode: Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Revoke old URL if exists
                if (recordedAudioRef.current) {
                    URL.revokeObjectURL(recordedAudioRef.current);
                }

                recordedAudioRef.current = audioUrl;
                playRecordedAudio(audioUrl);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                setActiveStream(null);
            };

            mediaRecorder.start();
            setShadowingStatus('recording');
            setActiveStream(stream);

            // Adaptive recording duration based on mode
            const recordDuration = shadowingContentMode === 'sentence' ? 8000 : 4000;
            let elapsed = 0;

            // Store interval ref for manual stop
            recordingIntervalRef.current = setInterval(() => {
                elapsed += 100;
                setRecordingProgress((elapsed / recordDuration) * 100);
            }, 100);

            // Auto-stop timer (safety timeout)
            recordingTimerRef.current = setTimeout(() => {
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            }, recordDuration);

        } catch (error) {
            console.error('Recording failed:', error);
            setShadowingStatus('idle');
        }
    };

    // Shadowing Mode: Manual stop recording
    const stopRecordingManual = () => {
        // Clear the auto-stop timeout
        if (recordingTimerRef.current) {
            clearTimeout(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        // Clear the progress interval
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        // Stop the media recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    // Shadowing Mode: Play recorded audio
    const playRecordedAudio = (audioUrl) => {
        setShadowingStatus('reviewing');
        const audio = new Audio(audioUrl);

        audio.onended = () => {
            setShadowingStatus('idle');
            // Optional: Auto-advance to next card
            // handleNext();
        };

        audio.play();
    };

    // Shadowing Mode: Retry/Re-record current card
    const retryShadowing = () => {
        // Reset progress
        setRecordingProgress(0);

        // Clear any existing recorded audio
        if (recordedAudioRef.current) {
            URL.revokeObjectURL(recordedAudioRef.current);
            recordedAudioRef.current = null;
        }

        // Restart the shadowing cycle
        startShadowingCycle();
    };

    // Switch shadowing content mode
    const switchShadowingContentMode = (newMode) => {
        setShadowingContentMode(newMode);
        setShadowingStatus('idle');
        setRecordingProgress(0);
    };

    // Toggle Shadowing Mode
    const toggleShadowingMode = async () => {
        if (!isShadowingMode && !hasPermission) {
            const granted = await requestMicrophonePermission();
            if (!granted) return;
        }
        setIsShadowingMode(!isShadowingMode);
        setShadowingStatus('idle');
    };

    const handleNext = () => {
        setShowAnswer(false);
        setInputVal('');
        setIsCorrect(null);
        setIsDetailsOpen(false);
        setShadowingStatus('idle');
        setRecordingProgress(0);

        // Cleanup timers and intervals
        if (recordingTimerRef.current) {
            clearTimeout(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        // Cleanup recorded audio
        if (recordedAudioRef.current) {
            URL.revokeObjectURL(recordedAudioRef.current);
            recordedAudioRef.current = null;
        }
        setActiveStream(null);

        if (mode === 'review') {
            setCurrentIndex((prev) => (prev + 1) % (dueCards.length || 1));
        } else {
            setCurrentIndex((prev) => (prev + 1) % (vocab.length || 1));
        }
    };

    const handlePrev = () => {
        setShowAnswer(false);
        setInputVal('');
        setIsCorrect(null);
        setIsDetailsOpen(false);
        if (mode === 'review') {
            setCurrentIndex((prev) => (prev - 1 + dueCards.length) % (dueCards.length || 1));
        } else {
            setCurrentIndex((prev) => (prev - 1 + vocab.length) % (vocab.length || 1));
        }
    };

    const handleRateCard = async (quality) => {
        if (!currentWord) return;

        // 1. Calculate next review using SM-2 algorithm
        // updatedReviewData now includes: { status, step_index, interval, ease_factor, repetitions, next_review_at }
        const updatedReviewData = calculateNextReview(quality, currentWord);

        // 2. Status is now determined by the SM-2 algorithm directly
        const status = updatedReviewData.status;

        // 3. Update local state immediately (optimistic update)
        const updatedVocab = vocab.map(card =>
            card.id === currentWord.id
                ? { ...card, ...updatedReviewData }
                : card
        );
        setVocab(updatedVocab);

        // 4. Save to database (async, don't block UI)
        if (user && deckId) {
            try {
                await saveWordProgress(user.id, deckId, currentWord.id, {
                    ...updatedReviewData,
                    next_review_at: updatedReviewData.next_review_at // Ensure explicit mapping if needed, though spread covers it
                });
                console.log(`✅ Progress saved for "${currentWord.han}" - Status: ${status}, Next Review: ${updatedReviewData.next_review_at}`);
            } catch (error) {
                console.error('❌ Failed to save progress:', error);
            }
        }

        // 5. Move to next card
        if (currentIndex < dueCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCurrentIndex(0);
        }
        setShowAnswer(false);
        setIsDetailsOpen(false);
    };

    const handleAddWord = () => {
        if (!newWord.han || !newWord.nghĩa) return;
        const wordToAdd = { ...newWord, id: `local-${Date.now()}` };
        setVocab([...vocab, wordToAdd]);
        setIsAddModalOpen(false);
        setNewWord({ han: "", pinyin: "", hanviet: "", nghĩa: "", chineasy: "", context: "", example: "", translation: "" });
    };

    const handleBulkImport = () => {
        if (!bulkInputText.trim()) return;
        const lines = bulkInputText.split("\n");
        const parsedWords = lines.map(line => {
            const parts = line.split("|").map(p => p.trim());
            if (parts.length >= 2) {
                return {
                    id: `local-bulk-${Date.now()}-${Math.random()}`,
                    han: parts[0],
                    pinyin: parts[1] || pinyin(parts[0]),
                    hanviet: parts[2] || "",
                    nghĩa: parts[3] || "",
                    chineasy: parts[4] || "",
                    example: parts[5] || "",
                    translation: parts[6] || ""
                };
            }
            return null;
        }).filter(Boolean);

        setVocab([...vocab, ...parsedWords]);
        setIsBulkModalOpen(false);
        setBulkInputText("");
    };

    const checkWriting = () => {
        if (inputVal.trim() === currentWord.han) {
            setIsCorrect(true);
            setShowAnswer(true);
            if (isAudioEnabled) speak(currentWord.han);
        } else {
            setIsCorrect(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-600 font-bold animate-pulse">Initializing Session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 font-sans">
            {/* Top Header */}
            <div className="w-full max-w-2xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all group mr-auto sm:mr-0"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Dashboard
                </button>

                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                    <button
                        onClick={() => { setMode('memorize'); setCurrentIndex(0); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${mode === 'memorize' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <BookOpen size={16} />
                        <span className="font-bold text-xs uppercase tracking-tight">Learn</span>
                    </button>
                    <button
                        onClick={() => { setMode('writing'); setCurrentIndex(0); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${mode === 'writing' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Edit3 size={16} />
                        <span className="font-bold text-xs uppercase tracking-tight">Write</span>
                    </button>
                    <button
                        onClick={() => { setMode('review'); setCurrentIndex(0); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${mode === 'review' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Clock size={16} />
                        <span className="font-bold text-xs uppercase tracking-tight">Review</span>
                        {stats.due > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full leading-none">
                                {stats.due}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex gap-2 ml-auto sm:ml-0">
                    <button
                        onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                        className={`p-2.5 rounded-xl transition-all ${isAudioEnabled ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-transparent'}`}
                    >
                        {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button
                        onClick={toggleShadowingMode}
                        className={`p-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1 ${isShadowingMode ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                        title="Toggle Shadowing Mode"
                    >
                        {isShadowingMode ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg active:scale-95"><PlusCircle size={20} /></button>
                </div>
            </div>

            {/* Card Content Area */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                {/* Modern Progress Indicator */}
                <div className="w-full h-1.5 bg-slate-100">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${mode === 'review' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${mode === 'review' ? ((currentIndex + 1) / (dueCards.length || 1)) * 100 : ((currentIndex + 1) / (vocab.length || 1)) * 100}%` }}
                    />
                </div>

                <div className="p-8 sm:p-12 flex-grow flex flex-col items-center justify-center">
                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                        {mode === 'review' ? `Session Review: ${currentIndex + 1} of ${dueCards.length}` : `Mastery Loop: ${currentIndex + 1} of ${vocab.length}`}
                    </span>

                    {/* Shadowing Mode Tab Switcher */}
                    {isShadowingMode && (
                        <div className="mb-6 flex gap-2 bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => switchShadowingContentMode('word')}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${shadowingContentMode === 'word'
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                Word
                            </button>
                            <button
                                onClick={() => switchShadowingContentMode('sentence')}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${shadowingContentMode === 'sentence'
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                Sentence
                            </button>
                        </div>
                    )}

                    {mode === 'memorize' ? (
                        <div className="w-full flex flex-col items-center">
                            <div className={`text-center transition-all duration-300 ${showAnswer ? 'mb-8' : 'my-12'}`}>
                                <div className="flex items-center justify-center gap-6">
                                    {/* Display adapts to shadowing mode */}
                                    {isShadowingMode && shadowingContentMode === 'sentence' ? (
                                        <>
                                            <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-2xl">
                                                {currentWord.example || currentWord.example_cn || currentWord.han}
                                            </h1>
                                            <button
                                                onClick={() => {
                                                    if (shadowingStatus === 'idle' || shadowingStatus === 'reviewing') {
                                                        retryShadowing();
                                                    } else {
                                                        speakText(currentWord.example || currentWord.example_cn || currentWord.han);
                                                    }
                                                }}
                                                className="p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                                            >
                                                <Volume2 size={32} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <h1 className="text-8xl sm:text-9xl font-black text-slate-900 tracking-tighter">{currentWord.han}</h1>
                                            <button
                                                onClick={() => {
                                                    if (isShadowingMode && (shadowingStatus === 'idle' || shadowingStatus === 'reviewing')) {
                                                        retryShadowing();
                                                    } else {
                                                        speak(currentWord.han);
                                                    }
                                                }}
                                                className="p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                                            >
                                                <Volume2 size={32} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Manual Stop Button for Recording */}
                                {isShadowingMode && shadowingStatus === 'recording' && (
                                    <div className="mt-8 flex flex-col items-center gap-3">
                                        <button
                                            onClick={stopRecordingManual}
                                            className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-700 transition-all active:scale-95 shadow-xl shadow-rose-200 flex items-center gap-3"
                                        >
                                            <div className="w-4 h-4 bg-white rounded-sm"></div>
                                            Stop Recording
                                        </button>
                                        <p className="text-xs text-slate-400 font-medium">Tap to finish early</p>
                                    </div>
                                )}

                                {/* Retry Button - Shows after reviewing or when idle in shadowing mode */}
                                {isShadowingMode && (shadowingStatus === 'idle' || shadowingStatus === 'reviewing') && (
                                    <div className="mt-8 flex flex-col items-center gap-3">
                                        <button
                                            onClick={retryShadowing}
                                            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center gap-3"
                                        >
                                            <RotateCcw size={20} />
                                            {shadowingStatus === 'reviewing' ? 'Retry Now' : 'Practice Again'}
                                        </button>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {shadowingStatus === 'reviewing' ? 'Or wait for playback to finish' : 'Record this card again'}
                                        </p>
                                    </div>
                                )}

                                {!showAnswer && shadowingStatus === 'idle' && !isShadowingMode && (
                                    <button
                                        onClick={() => { setShowAnswer(true); if (isAudioEnabled) speak(currentWord.han); }}
                                        className="mt-12 px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                    >
                                        Reveal Memory
                                    </button>
                                )}
                            </div>

                            {showAnswer && (
                                <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Show different info based on shadowing mode */}
                                    {isShadowingMode && shadowingContentMode === 'sentence' ? (
                                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50 text-center">
                                            <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-2">Translation</p>
                                            <p className="text-2xl font-black text-slate-800 mb-2">
                                                {currentWord.translation || currentWord.example_vi || "No translation available"}
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium">
                                                {currentWord.pinyin} • {currentWord.hanviet}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-center">
                                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Pinyin</p>
                                                    <p className="text-xl font-black text-blue-900">{currentWord.pinyin}</p>
                                                </div>
                                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 text-center">
                                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Hán Việt</p>
                                                    <p className="text-xl font-black text-emerald-900">{currentWord.hanviet}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 text-center">
                                                <p className="text-2xl font-black text-slate-800 mb-2">{currentWord.nghĩa}</p>
                                                <p className="text-sm text-slate-500 font-medium italic leading-relaxed">{currentWord.chineasy}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Additional Details Accordion */}
                                    <div className="border-t border-slate-100 pt-4 mt-4">
                                        <button
                                            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                            className="flex items-center justify-center gap-2 w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-900 transition-colors"
                                        >
                                            {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            Usage Details
                                        </button>
                                        {isDetailsOpen && (
                                            <div className="mt-4 space-y-4 text-left animate-in fade-in zoom-in-95">
                                                <div>
                                                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Context / Contextual Note</h4>
                                                    <p className="text-sm text-slate-700 font-medium">{currentWord.context || "No specific context provided."}</p>
                                                </div>
                                                <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-100/30">
                                                    <h4 className="text-[9px] font-black uppercase text-amber-600 tracking-widest mb-1">Example Sentence</h4>
                                                    <p className="text-lg font-bold text-slate-800 mb-1">{currentWord.example || "No example provided."}</p>
                                                    <p className="text-xs text-slate-500">{currentWord.translation}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rating Buttons for Learn Mode - Save Progress */}
                                    {!isShadowingMode && (
                                        <div className="border-t border-slate-100 pt-6 mt-4">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4 text-center">How well do you know this?</p>
                                            <div className="grid grid-cols-4 gap-3">
                                                <button onClick={() => handleRateCard(0)} className="flex flex-col items-center gap-1 py-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl font-bold text-xs hover:bg-rose-100 active:scale-95 transition-all">
                                                    <ThumbsDown size={16} /> Again
                                                </button>
                                                <button onClick={() => handleRateCard(3)} className="flex flex-col items-center gap-1 py-3 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl font-bold text-xs hover:bg-orange-100 active:scale-95 transition-all">
                                                    <Clock size={16} /> Hard
                                                </button>
                                                <button onClick={() => handleRateCard(4)} className="flex flex-col items-center gap-1 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold text-xs hover:bg-blue-100 active:scale-95 transition-all">
                                                    <ThumbsUp size={16} /> Good
                                                </button>
                                                <button onClick={() => handleRateCard(5)} className="flex flex-col items-center gap-1 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs hover:bg-emerald-100 active:scale-95 transition-all">
                                                    <Zap size={16} /> Easy
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : mode === 'writing' ? (
                        <div className="w-full flex flex-col items-center">
                            <div className="p-6 bg-slate-50 rounded-3xl mb-12 text-center border border-slate-200/50 w-full max-w-sm">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Definition</p>
                                <p className="text-3xl font-black text-blue-600 mb-4">{currentWord.nghĩa}</p>
                                <div className="flex justify-center gap-4 text-xs font-bold text-slate-400">
                                    <span className="flex items-center gap-1"><Volume2 size={12} /> {currentWord.pinyin}</span>
                                    <span>|</span>
                                    <span>{currentWord.hanviet}</span>
                                </div>
                            </div>
                            <div className="w-full max-w-xs relative group">
                                <input
                                    type="text"
                                    value={inputVal}
                                    onChange={e => setInputVal(e.target.value)}
                                    placeholder="Draw Hanzi..."
                                    className={`w-full text-7xl text-center py-8 rounded-3xl border-4 outline-none transition-all duration-300 ${isCorrect === true ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : isCorrect === false ? 'border-rose-300 bg-rose-50 text-rose-900 animate-shake' : 'border-slate-100 focus:border-blue-400 bg-slate-50/30'}`}
                                    onKeyDown={e => e.key === 'Enter' && checkWriting()}
                                />
                                <button onClick={checkWriting} className="absolute -right-4 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-90 transition-transform"><ChevronRight size={24} /></button>
                            </div>
                            {isCorrect === true && <div className="mt-8 flex items-center gap-2 text-emerald-600 font-black animate-bounce tracking-tight"><CheckCircle2 size={20} /> Stroke perfect!</div>}
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            {dueCards.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50/50 w-full rounded-3xl border-2 border-dashed border-slate-100">
                                    <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Daily Goal Met! 🎉</h3>
                                    <p className="text-slate-500 font-medium">All cards for this deck are rested.</p>
                                    <button onClick={onBack} className="mt-8 text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline">Back to Dashboard</button>
                                </div>
                            ) : (
                                <>
                                    <div className={`text-center transition-all duration-300 ${showAnswer ? 'mb-8' : 'my-12'}`}>
                                        <h1 className="text-8xl font-black text-slate-900">{currentWord.han}</h1>
                                        {!showAnswer && (
                                            <button
                                                onClick={() => { setShowAnswer(true); if (isAudioEnabled) speak(currentWord.han); }}
                                                className="mt-12 px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-100"
                                            >
                                                Recall Answer
                                            </button>
                                        )}
                                    </div>
                                    {showAnswer && (
                                        <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 text-center mb-8">
                                                <p className="text-2xl font-black text-slate-800 mb-1">{currentWord.nghĩa}</p>
                                                <p className="text-sm text-blue-600 font-bold">{currentWord.pinyin} • {currentWord.hanviet}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={() => handleRateCard(0)} className="flex flex-col items-center gap-1 py-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl font-bold hover:bg-rose-100 active:scale-95 transition-all">
                                                    <ThumbsDown size={18} /> Again
                                                </button>
                                                <button onClick={() => handleRateCard(3)} className="flex flex-col items-center gap-1 py-4 bg-orange-50 text-orange-700 border border-orange-100 rounded-2xl font-bold hover:bg-orange-100 active:scale-95 transition-all">
                                                    😅 Hard
                                                </button>
                                                <button onClick={() => handleRateCard(4)} className="flex flex-col items-center gap-1 py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold hover:bg-emerald-100 active:scale-95 transition-all">
                                                    <ThumbsUp size={18} /> Good
                                                </button>
                                                <button onClick={() => handleRateCard(5)} className="flex flex-col items-center gap-1 py-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-bold hover:bg-blue-100 active:scale-95 transition-all">
                                                    <Zap size={18} /> Easy
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Shadowing Status Indicator */}
                {isShadowingMode && shadowingStatus !== 'idle' && (
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                {shadowingStatus === 'listening' && (
                                    <>
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-blue-400 font-bold text-sm">
                                            Listening to native {shadowingContentMode}...
                                        </span>
                                    </>
                                )}
                                {shadowingStatus === 'recording' && (
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                                        <span className="text-rose-400 font-bold text-sm flex items-center gap-2">
                                            <Mic size={16} className="animate-bounce" />
                                            Speak now!
                                        </span>
                                        <VoiceVisualizer stream={activeStream} />
                                    </div>
                                )}
                                {shadowingStatus === 'reviewing' && (
                                    <>
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                                            <Play size={16} />
                                            Reviewing your voice...
                                        </span>
                                    </>
                                )}
                            </div>
                            {shadowingStatus === 'recording' && (
                                <span className="text-slate-400 text-xs font-mono">
                                    {Math.round(recordingProgress)}%
                                </span>
                            )}
                        </div>
                        {shadowingStatus === 'recording' && (
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-rose-500 transition-all duration-100"
                                    style={{ width: `${recordingProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Universal Footer Nav */}
                <div className="bg-slate-50/50 border-t border-slate-100 px-8 py-6 flex justify-between items-center text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                    <button onClick={handlePrev} className="hover:text-slate-900 transition-colors flex items-center gap-2"><ArrowLeft size={14} /> Prev</button>
                    <div className="flex gap-6 items-center">
                        <button onClick={() => speak(currentWord.han)} className="hover:text-blue-600 transition-colors"><Volume2 size={20} /></button>
                        <a href={`https://www.google.com/search?tbm=isch&q=${currentWord.han}+chinese+visual+mnemonic`} target="_blank" className="hover:text-blue-600 transition-colors"><ImageIcon size={20} /></a>
                    </div>
                    <button onClick={handleNext} className="hover:text-slate-900 transition-colors flex items-center gap-2">Next <ChevronRight size={14} /></button>
                </div>
            </div>

            {/* Add/Edit Word Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-white/20">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors"><X size={24} /></button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Add New Vocabulary</h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hanzi Character</label>
                                    <input type="text" value={newWord.han} className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none transition-all font-bold" placeholder="学习" onChange={e => setNewWord({ ...newWord, han: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
                                        Pinyin
                                        <button type="button" onClick={() => setNewWord(prev => ({ ...prev, pinyin: pinyin(prev.han) }))} className="text-blue-600 hover:underline">Auto</button>
                                    </label>
                                    <input type="text" value={newWord.pinyin} className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none transition-all font-bold" placeholder="xuéxí" onChange={e => setNewWord({ ...newWord, pinyin: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hán Việt</label>
                                    <input type="text" value={newWord.hanviet} className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none transition-all font-bold" placeholder="Học tập" onChange={e => setNewWord({ ...newWord, hanviet: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Meaning (VN)</label>
                                    <input type="text" value={newWord.nghĩa} className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none transition-all font-bold" placeholder="Học" onChange={e => setNewWord({ ...newWord, nghĩa: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mnemonic / Story</label>
                                <textarea value={newWord.chineasy} className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl h-24 text-sm font-medium" placeholder="The story behind the characters..." onChange={e => setNewWord({ ...newWord, chineasy: e.target.value })} />
                            </div>

                            <button onClick={handleAddWord} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200">Save Vocabulary</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashcardSession;
