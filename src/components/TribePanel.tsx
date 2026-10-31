import { useGameStore } from '../store/gameStore';

export const TribePanel = () => {
  const currentTribeId = useGameStore((s) => s.currentTribeId);
  const tribes = useGameStore((s) => s.tribes);
  const currentTribe = tribes.find((t) => t.id === currentTribeId);

  if (!currentTribe) return null;

  const res = currentTribe.resources;

  return (
    <div style={{
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1rem',
      marginTop: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: currentTribe.color }}>
          {currentTribe.name} 👑
        </h2>
        <span style={{ 
          background: '#fef3c7', color: '#92400e', 
          padding: '0.3rem 0.8rem', borderRadius: '20px', fontWeight: 'bold' 
        }}>
          🏆 Очки Империи: {currentTribe.score}
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
        gap: '0.8rem' 
      }}>
        <div style={resourceCardStyle}>🦊 Пушнина: <strong>{res.fur}</strong></div>
        <div style={resourceCardStyle}>⚒️ Руда: <strong>{res.ore}</strong></div>
        <div style={resourceCardStyle}>🧵 Ткани: <strong>{res.fabric}</strong></div>
        <div style={resourceCardStyle}>🍞 Еда: <strong>{res.food}</strong></div>
        <div style={{ ...resourceCardStyle, background: '#ecfdf5', borderColor: '#34d399' }}>
          💰 Деньги: <strong>{res.money}</strong>
        </div>
      </div>
    </div>
  );
};

const resourceCardStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '0.6rem',
  textAlign: 'center' as const,
  fontSize: '0.9rem',
  color: '#475569'
};
