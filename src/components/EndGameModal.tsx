import { useGameStore } from '../store/gameStore';

interface EndGameModalProps {
  winnerId: string | null;
  onReset: () => void;
}

export const EndGameModal = ({ winnerId, onReset }: EndGameModalProps) => {
  const tribes = useGameStore((s) => s.tribes);
  const winner = tribes.find((t) => t.id === winnerId);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Игра окончена!</h2>
        <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1.5rem' }}>
          Победитель: <strong style={{ color: winner?.color }}>{winner?.name}</strong>
        </p>
        
        <div style={{ 
          background: '#f1f5f9', borderRadius: '8px', padding: '1rem', 
          marginBottom: '1.5rem', textAlign: 'left' 
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>Итоговые очки:</h3>
          {tribes.sort((a, b) => b.score - a.score).map((t, i) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span>{i + 1}. {t.name}</span>
              <strong>{t.score} ОИ</strong>
            </div>
          ))}
        </div>

        <button 
          onClick={onReset}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🔄 Начать новую игру
        </button>
      </div>
    </div>
  );
};
