import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { GameMap } from './components/GameMap';
import { TribePanel } from './components/TribePanel';
import { BankModal } from './components/BankModal';
import { TeacherPanel } from './components/TeacherPanel';
import { RulesModal } from './components/RulesModal';
import { Tutorial } from './components/Tutorial';
import { EndGameModal } from './components/EndGameModal';
import { playClick } from './utils/sounds';

export const App = () => {
  const [showBank, setShowBank] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const currentTribeId = useGameStore((s) => s.currentTribeId);
  const turn = useGameStore((s) => s.turn);
  const gameEnded = useGameStore((s) => s.gameEnded);
  const winnerId = useGameStore((s) => s.winnerId);
  const bankToast = useGameStore((s) => s.bankToast);
  
  const collectIncome = useGameStore((s) => s.collectIncome);
  const nextTurn = useGameStore((s) => s.nextTurn);
  const resetGame = useGameStore((s) => s.resetGame);

  // 🛡️ Автоматический сбор дохода. Защита от дублирования теперь внутри collectIncome!
  useEffect(() => {
    collectIncome(currentTribeId);
  }, [currentTribeId, collectIncome]);

  const handleNextTurn = () => {
    playClick();
    nextTurn();
  };

  const handleReset = () => {
    if (confirm('🔄 Вы уверены, что хотите начать новую игру? Все несохранённые данные будут потеряны.')) {
      resetGame();
      setShowTutorial(true);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1e293b'
    }}>
      <header style={{ 
        background: 'white', 
        borderBottom: '2px solid #cbd5e1', 
        padding: '0.8rem 1.5rem',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0f172a' }}>
            🏰 Экономическая Империя
          </h1>
          <span style={{ 
            background: '#e0f2fe', color: '#0369a1', 
            padding: '0.3rem 0.8rem', borderRadius: '20px', 
            fontSize: '0.9rem', fontWeight: 'bold' 
          }}>
            Ход {turn} / 10
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowRules(true)} style={btnStyle.secondary}>📖 Правила</button>
          <button onClick={() => setShowBank(true)} style={btnStyle.primary}>🏦 Банк</button>
          <button onClick={() => setShowTeacher(true)} style={btnStyle.secondary}>⚙️ Учитель</button>
          <button onClick={handleNextTurn} style={btnStyle.success}>⏭️ Следующий ход</button>
          <button onClick={handleReset} style={btnStyle.danger}>🔄 Сброс</button>
        </div>
      </header>

      <main style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
        <GameMap />
        <TribePanel />
      </main>

      {bankToast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px',
          background: '#fef3c7', border: '2px solid #f59e0b',
          borderRadius: '8px', padding: '1rem', maxWidth: '350px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 3000
        }}>
          <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>🏦 Имперский Банк</div>
          <div style={{ fontSize: '0.9rem', color: '#78350f', whiteSpace: 'pre-line' }}>{bankToast}</div>
        </div>
      )}

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showBank && <BankModal onClose={() => setShowBank(false)} />}
      {showTeacher && <TeacherPanel onClose={() => setShowTeacher(false)} />}
      {gameEnded && <EndGameModal winnerId={winnerId} onReset={handleReset} />}
    </div>
  );
};

const btnStyle = {
  primary: { padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' },
  secondary: { padding: '0.6rem 1.2rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' },
  success: { padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' },
  danger: { padding: '0.6rem 1.2rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }
};
