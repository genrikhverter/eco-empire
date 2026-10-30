import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';
import type { ResourceType } from '../types';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  fur: '🦊',
  ore: '⚒️',
  fabric: '🧵',
  food: '🍞',
  money: '💰',
};

interface GameEndModalProps {
  onClose: () => void;
}

export const GameEndModal = ({ onClose }: GameEndModalProps) => {
  const isMobile = useIsMobile();
  const tribes = useGameStore((state) => state.tribes);
  const winnerId = useGameStore((state) => state.winnerId);
  const turn = useGameStore((state) => state.turn);
  const resetGame = useGameStore((state) => state.resetGame);

  const winner = tribes.find((t) => t.id === winnerId);
  const sortedTribes = [...tribes].sort((a, b) => b.score - a.score);

  const handleNewGame = () => {
    if (confirm('Начать новую игру? Весь текущий прогресс будет потерян!')) {
      resetGame();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: isMobile ? '0.5rem' : '1rem',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #fef3c7, #fbbf24)',
        border: isMobile ? '4px solid #f59e0b' : '6px solid #f59e0b',
        borderRadius: '20px',
        padding: isMobile ? '1.2rem' : '3rem',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        animation: 'scaleIn 0.5s ease-out'
      }}>
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '1rem' : '2rem' }}>
          <div style={{ fontSize: isMobile ? '3rem' : '5rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ 
            margin: 0, 
            fontSize: isMobile ? '1.6rem' : '2.5rem', 
            color: '#92400e',
            lineHeight: 1.2
          }}>
            Игра окончена!
          </h1>
          <p style={{ 
            fontSize: isMobile ? '0.95rem' : '1.2rem', 
            color: '#78350f', 
            marginTop: '0.4rem' 
          }}>
            Ходов сыграно: {turn}
          </p>
        </div>

        {/* Победитель */}
        {winner && (
          <div style={{
            background: winner.color,
            color: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '12px',
            marginBottom: isMobile ? '1rem' : '2rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '0.3rem' }}>👑</div>
            <h2 style={{ 
              margin: '0 0 0.3rem 0', 
              fontSize: isMobile ? '1.2rem' : '2rem',
              lineHeight: 1.2
            }}>
              {winner.name}
            </h2>
            <div style={{ 
              fontSize: isMobile ? '0.95rem' : '1.5rem', 
              fontWeight: 'bold' 
            }}>
              Победитель: {winner.score} ОИ
            </div>
          </div>
        )}

        {/* Таблица результатов */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: isMobile ? '0.8rem' : '1.5rem',
          marginBottom: isMobile ? '1rem' : '2rem'
        }}>
          <h3 style={{ 
            margin: '0 0 0.8rem 0', 
            textAlign: 'center', 
            color: '#1e293b',
            fontSize: isMobile ? '1rem' : '1.2rem'
          }}>
            📊 Итоговая таблица
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sortedTribes.map((tribe, index) => (
              <div
                key={tribe.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: isMobile ? '0.6rem' : '1rem',
                  background: tribe.id === winnerId ? '#fef3c7' : '#f8fafc',
                  borderRadius: '8px',
                  border: `2px solid ${tribe.color}`,
                  gap: '0.6rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* Место */}
                <div style={{
                  fontSize: isMobile ? '1.2rem' : '1.5rem',
                  fontWeight: 'bold',
                  minWidth: '32px',
                  textAlign: 'center'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                </div>

                {/* Информация о племени */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: isMobile ? '0.9rem' : '1.1rem', 
                    color: tribe.color 
                  }}>
                    {tribe.name}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '0.72rem' : '0.9rem', 
                    color: '#64748b', 
                    marginTop: '0.2rem' 
                  }}>
                    🗺️ {tribe.sectors.length} | 🏛️ {tribe.buildings.length}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '0.7rem' : '0.85rem', 
                    color: '#64748b', 
                    marginTop: '0.2rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.3rem'
                  }}>
                    {Object.entries(tribe.resources).map(([key, value]) => (
                      <span key={key} style={{ whiteSpace: 'nowrap' }}>
                        {RESOURCE_ICONS[key as ResourceType]}{value}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Очки */}
                <div style={{
                  fontSize: isMobile ? '1.1rem' : '1.8rem',
                  fontWeight: 'bold',
                  color: tribe.id === winnerId ? '#f59e0b' : '#1e293b',
                  whiteSpace: 'nowrap'
                }}>
                  {tribe.score} ОИ
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки: на мобильных — друг под другом */}
        <div style={{ 
          display: 'flex', 
          gap: '0.8rem',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <button
            onClick={handleNewGame}
            style={{
              flex: 1,
              padding: '0.9rem',
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '1rem' : '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            🔄 Новая игра
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.9rem',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '1rem' : '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            Закрыть
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
