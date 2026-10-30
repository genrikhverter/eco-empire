import { useIsMobile } from '../hooks/useIsMobile';
import type { GameEvent, ResourceType } from '../types';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  fur: '🦊',
  ore: '⚒️',
  fabric: '🧵',
  food: '🍞',
  money: '💰',
};

interface EventModalProps {
  event: GameEvent;
  onClose: () => void;
}

export const EventModal = ({ event, onClose }: EventModalProps) => {
  const isMobile = useIsMobile();
  const bgColor = event.type === 'positive' ? '#dcfce7' : event.type === 'negative' ? '#fee2e2' : '#f1f5f9';
  const borderColor = event.type === 'positive' ? '#22c55e' : event.type === 'negative' ? '#ef4444' : '#94a3b8';
  const textColor = event.type === 'positive' ? '#166534' : event.type === 'negative' ? '#991b1b' : '#334155';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '0.75rem' : '1rem',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: bgColor,
        border: `4px solid ${borderColor}`,
        borderRadius: '16px',
        padding: isMobile ? '1.2rem' : '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.3s ease-out'
      }}>
        {/* Иконка и заголовок */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '0.8rem' : '1.5rem' }}>
          <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '0.4rem' }}>
            {event.icon}
          </div>
          <h2 style={{ 
            margin: 0, 
            color: textColor, 
            fontSize: isMobile ? '1.25rem' : '1.8rem',
            lineHeight: 1.2
          }}>
            {event.name}
          </h2>
        </div>

        {/* Описание */}
        <p style={{
          fontSize: isMobile ? '0.95rem' : '1.1rem',
          color: textColor,
          textAlign: 'center',
          marginBottom: isMobile ? '0.8rem' : '1.5rem',
          lineHeight: 1.5
        }}>
          {event.description}
        </p>

        {/* Эффект */}
        {Object.keys(event.effect).length > 0 && (
          <div style={{
            background: 'white',
            padding: isMobile ? '0.7rem' : '1rem',
            borderRadius: '8px',
            marginBottom: isMobile ? '0.8rem' : '1.5rem',
            textAlign: 'center'
          }}>
            <strong style={{ 
              display: 'block', 
              marginBottom: '0.4rem', 
              color: textColor,
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              Эффект:
            </strong>
            <div style={{ 
              fontSize: isMobile ? '1.1rem' : '1.3rem',
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              {Object.entries(event.effect).map(([resource, amount]) => (
                <span 
                  key={resource} 
                  style={{ 
                    color: (amount || 0) > 0 ? '#16a34a' : '#dc2626',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold'
                  }}
                >
                  {RESOURCE_ICONS[resource as ResourceType]} {(amount || 0) > 0 ? '+' : ''}{amount}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Кнопка */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: borderColor,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: isMobile ? '1rem' : '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            minHeight: '48px'
          }}
        >
          Понятно
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
