import { useState } from 'react';
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

const RESOURCE_NAMES: Record<ResourceType, string> = {
  fur: 'Пушнина',
  ore: 'Руда',
  fabric: 'Ткани',
  food: 'Провизия',
  money: 'Рубли',
};

const ALL_RESOURCES: ResourceType[] = ['fur', 'ore', 'fabric', 'food', 'money'];

interface TradeModalProps {
  onClose: () => void;
}

export const TradeModal = ({ onClose }: TradeModalProps) => {
  const isMobile = useIsMobile();
  const tribes = useGameStore((state) => state.tribes);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const trades = useGameStore((state) => state.trades);
  const makeTrade = useGameStore((state) => state.makeTrade);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  const otherTribes = tribes.filter((t) => t.id !== currentTribeId);

  const [partnerId, setPartnerId] = useState<string>(otherTribes[0]?.id || '');
  const [giveAmounts, setGiveAmounts] = useState<Partial<Record<ResourceType, number>>>({});
  const [receiveAmounts, setReceiveAmounts] = useState<Partial<Record<ResourceType, number>>>({});

  if (!currentTribe) return null;
  const partner = tribes.find((t) => t.id === partnerId);
  if (!partner) return null;

  const handleGiveChange = (resource: ResourceType, value: string) => {
    const num = parseInt(value) || 0;
    setGiveAmounts({ ...giveAmounts, [resource]: Math.max(0, num) });
  };

  const handleReceiveChange = (resource: ResourceType, value: string) => {
    const num = parseInt(value) || 0;
    setReceiveAmounts({ ...receiveAmounts, [resource]: Math.max(0, num) });
  };

  const handleTrade = () => {
    const given = Object.fromEntries(
      Object.entries(giveAmounts).filter(([_, v]) => v && v > 0)
    ) as Partial<Record<ResourceType, number>>;
    const received = Object.fromEntries(
      Object.entries(receiveAmounts).filter(([_, v]) => v && v > 0)
    ) as Partial<Record<ResourceType, number>>;

    if (Object.keys(given).length === 0 && Object.keys(received).length === 0) {
      alert('Укажите ресурсы для обмена!');
      return;
    }

    const success = makeTrade(currentTribeId, partnerId, given, received);
    if (success) {
      alert(`✅ Сделка совершена!\n${currentTribe.name} ↔ ${partner.name}`);
      setGiveAmounts({});
      setReceiveAmounts({});
    } else {
      alert('❌ Недостаточно ресурсов для сделки!');
    }
  };

  // Компонент колонки ресурсов (используется дважды)
  const renderResourceColumn = (
    tribe: typeof currentTribe,
    amounts: Partial<Record<ResourceType, number>>,
    onChange: (r: ResourceType, v: string) => void,
    title: string,
    bgColor: string
  ) => (
    <div style={{
      border: `3px solid ${tribe.color}`,
      borderRadius: '12px',
      padding: isMobile ? '0.8rem' : '1rem',
      background: bgColor
    }}>
      <h3 style={{ 
        margin: '0 0 0.8rem 0', 
        color: tribe.color, 
        textAlign: 'center',
        fontSize: isMobile ? '0.95rem' : '1.1rem'
      }}>
        {title}
      </h3>
      {ALL_RESOURCES.map((resource) => (
        <div 
          key={resource} 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '0.5rem',
            gap: '0.4rem'
          }}
        >
          <span style={{ fontSize: isMobile ? '0.85rem' : '1.05rem', flex: 1 }}>
            {RESOURCE_ICONS[resource]} {isMobile ? '' : RESOURCE_NAMES[resource]}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#666', whiteSpace: 'nowrap' }}>
            есть: {tribe.resources[resource]}
          </span>
          <input
            type="number"
            min="0"
            max={tribe.resources[resource]}
            value={amounts[resource] || 0}
            onChange={(e) => onChange(resource, e.target.value)}
            style={{
              width: '55px',
              padding: '0.4rem 0.2rem',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '1rem'
            }}
          />
        </div>
      ))}
    </div>
  );

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
      padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white',
        padding: isMobile ? '1rem' : '2rem',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Заголовок */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem' 
        }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>🤝 Торговля</h2>
          <button
            onClick={onClose}
            style={{
              background: '#f87171',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              flexShrink: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Выбор партнёра */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            fontSize: isMobile ? '0.85rem' : '1rem'
          }}>
            Выберите партнёра:
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {otherTribes.map((tribe) => (
              <button
                key={tribe.id}
                onClick={() => setPartnerId(tribe.id)}
                style={{
                  padding: '0.5rem 0.8rem',
                  background: tribe.id === partnerId ? tribe.color : '#e2e8f0',
                  color: tribe.id === partnerId ? 'white' : '#1e293b',
                  border: `2px solid ${tribe.color}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: tribe.id === partnerId ? 'bold' : 'normal',
                  fontSize: isMobile ? '0.75rem' : '0.9rem',
                  flex: isMobile ? '1 1 45%' : 'none'
                }}
              >
                {tribe.name}
              </button>
            ))}
          </div>
        </div>

        {/* Панель обмена: на мобильных — колонки друг под другом */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', 
          gap: isMobile ? '0.5rem' : '1rem',
          marginBottom: '1rem'
        }}>
          {renderResourceColumn(
            currentTribe,
            giveAmounts,
            handleGiveChange,
            `${currentTribe.name} отдаёт`,
            '#f0fdf4'
          )}

          {/* Стрелка обмена */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.8rem',
            transform: isMobile ? 'rotate(90deg)' : 'none',
            padding: isMobile ? '0.2rem 0' : '0'
          }}>
            ⇄
          </div>

          {renderResourceColumn(
            partner,
            receiveAmounts,
            handleReceiveChange,
            `${partner.name} отдаёт`,
            '#fef3c7'
          )}
        </div>

        {/* Кнопка сделки */}
        <button
          onClick={handleTrade}
          style={{
            width: '100%',
            padding: isMobile ? '0.9rem' : '1rem',
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: isMobile ? '1rem' : '1.2rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '1rem',
            minHeight: '48px'
          }}
        >
          ✅ Совершить сделку
        </button>

        {/* История сделок */}
        {trades.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
              📜 История сделок
            </h3>
            <div style={{ 
              background: '#f8fafc', 
              padding: '0.8rem', 
              borderRadius: '8px',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {trades.slice().reverse().slice(0, 10).map((trade) => {
                const fromTribe = tribes.find((t) => t.id === trade.fromTribeId);
                const toTribe = tribes.find((t) => t.id === trade.toTribeId);
                if (!fromTribe || !toTribe) return null;
                return (
                  <div 
                    key={trade.id} 
                    style={{
                      padding: '0.4rem',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: isMobile ? '0.75rem' : '0.9rem'
                    }}
                  >
                    <strong>Ход {trade.turn}:</strong>{' '}
                    <span style={{ color: fromTribe.color, fontWeight: 'bold' }}>
                      {fromTribe.name}
                    </span>
                    {' ↔ '}
                    <span style={{ color: toTribe.color, fontWeight: 'bold' }}>
                      {toTribe.name}
                    </span>
                    <div style={{ marginTop: '0.2rem', color: '#64748b' }}>
                      Отдали: {Object.entries(trade.given).map(([r, a]) => `${RESOURCE_ICONS[r as ResourceType]}${a}`).join(' ')}
                      {' → '}
                      Получили: {Object.entries(trade.received).map(([r, a]) => `${RESOURCE_ICONS[r as ResourceType]}${a}`).join(' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
