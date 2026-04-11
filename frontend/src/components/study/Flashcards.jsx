import { useState, useEffect } from 'react';
import { generateFlashcards } from '../../services/aiService';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiLayers, FiChevronLeft, FiChevronRight, FiX, FiRotateCw, FiHelpCircle, FiCheckCircle } from 'react-icons/fi';

const Flashcards = ({ topicId, onClose }) => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    setLoading(true);
    setError(null);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    try {
      const data = await generateFlashcards(topicId);
      setCards(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate flashcards.';
      if (err.response?.status === 404) {
        setError('No notes found for this topic. Upload notes first to generate flashcards.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1)), 200);
  };

  const goPrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => Math.max(prev - 1, 0)), 200);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="glass-card border border-accent/20 overflow-hidden animate-fadeInUp">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-accent/5">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <FiLayers className="text-accent" /> Smart Flashcards
        </h2>
        <div className="flex items-center gap-3">
          {cards.length > 0 && (
            <span className="text-sm text-text-muted font-medium">
              {currentIndex + 1} / {cards.length}
            </span>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <FiX size={18} />
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      )}

      <div className="p-6 min-h-[380px] flex flex-col items-center justify-center">
        {loading ? (
          <LoadingSpinner text="AI is generating your flashcards..." />
        ) : error ? (
          <div className="text-center">
            <p className="text-danger mb-4">{error}</p>
            <button onClick={fetchFlashcards} className="btn-gradient text-sm flex items-center gap-2 mx-auto">
              <FiRotateCw size={14} /> Retry
            </button>
          </div>
        ) : currentCard ? (
          <>
            <div
              className="flip-card w-full max-w-lg cursor-pointer mb-8"
              onClick={() => setFlipped(!flipped)}
            >
              <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
                <div className="flip-card-front glass-card p-8 flex flex-col items-center justify-center min-h-[250px] border border-accent/20">
                  <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mb-5">
                    <FiHelpCircle size={24} className="text-accent" />
                  </div>
                  <p className="text-lg text-text text-center font-medium leading-relaxed">
                    {currentCard.q}
                  </p>
                  <p className="text-xs text-text-muted mt-6 opacity-60">Tap to reveal answer</p>
                </div>

                <div className="flip-card-back glass-card p-8 flex flex-col items-center justify-center min-h-[250px] border border-success/20" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mb-5">
                    <FiCheckCircle size={24} className="text-success" />
                  </div>
                  <p className="text-lg text-text text-center font-medium leading-relaxed">
                    {currentCard.a}
                  </p>
                  <p className="text-xs text-text-muted mt-6 opacity-60">Tap to see question</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="w-11 h-11 rounded-full bg-white/10 text-text flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronLeft size={20} />
              </button>

              <div className="flex gap-1.5">
                {cards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === currentIndex ? 'bg-accent scale-125' : i < currentIndex ? 'bg-accent/40' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={currentIndex === cards.length - 1}
                className="w-11 h-11 rounded-full bg-white/10 text-text flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={fetchFlashcards}
              className="mt-6 text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1.5"
            >
              <FiRotateCw size={12} /> Generate new set
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Flashcards;
