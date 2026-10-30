import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';

interface SectorExchangeModalProps {
  mySectorId: number;
  onClose: () => void;
}

export const SectorExchangeModal = ({ mySectorId, onClose }: SectorExchangeModalProps) => {
  const isMobile = useIsMobile();
  const sectors = useGameStore((s) => s.sectors);
  const tribes = useGameStore((s) => s.tribes);
  const buildings = useGameStore((s) => s.buildings);
  const currentTribeId = useGameStore((s) => s.currentTribeId);
  const calculateSectorValue = useGameStore((s) => s.calculateSectorValue);
  const proposeSectorExchange = useGameStore((s) => s.proposeSectorExchange);
  const exchanges = useGameStore((s) => s.sectorExchanges);
  const acceptSectorExchange = useGameStore((s) => s.acceptSectorExchange);
  const rejectSectorExchange = useGameStore((s) => s.rejectSectorExchange);

  const mySector = sectors.find((s) => s.id === mySectorId);
  if (!mySector) return null;

  const myValue = calculateSectorValue(mySectorId);
  const otherSectors = sectors.filter((s) => s.ownerId !== null && s.ownerId !== currentTribeId);

  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [additionalPayment, setAdditionalPayment] = useState<string>('0');

  // Входящие предложения обмена
  const incomingExchanges = exchanges.filter(
    (e) => e.status === 'pending' && e.owner2Id === currentTribeId
  );

  const targetSector = selectedTargetId !== null ? sectors.find((s) => s.id === selectedTargetId) : null;
  const targetValue = selectedTargetId !== null ? calculateSectorValue(selectedTargetId) : 0;
  const diff = targetValue - myValue;

  const handlePropose = () => {
    if (selectedTargetId === null) {
      alert('❌ Выберите сектор для обмена');
      return;
    }
    const payment = parseInt(additionalPayment) || 0;
    let addPay: { fromId: string; toId: string; amount: number } | undefined;

    if (payment > 0) {
      // Я доплачиваю
      addPay = { fromId: currentTribeId, toId: targetSector!.ownerId!, amount: payment };
    } else if (payment < 0) {
      // Мне доплачивают
      addPay = { fromId: targetSector!.ownerId!, toId: currentTribeId, amount: Math.abs(payment) };
    }

    const result = proposeSectorExchange(mySectorId, selectedTargetId, addPay);
    if (result) {
      alert('✅ Предложение об обмене отправлено!');
      onClose();
    } else {
      alert('❌ Не удалось отправить предложение');
    }
  };

  const handleAccept = (exchangeId: string) => {
    if (confirm('✅ Подтвердить обмен?')) {
      if (acceptSectorExchange(exchangeId)) {
        alert('✅ Обмен совершён!');
        onClose();
      } else {
        alert('❌ Не удалось совершить обмен. Проверьте ресурсы.');
      }
    }
  };

  const handleReject = (exchangeId: string) => {
    if (confirm('❌ Отклонить обмен?')) {
      rejectSectorExchange(exchangeId);
    }
  };

  const getBuildingInfo = (sectorId: number) => {
    const s = sectors.find((x) => x.id === sectorId);
    if (!s?.buildingId) return '';
    const b = buildings.find((x) => x.id === s.buildingId);
    return b ? ` · ${b.icon} ${b.name}` : '';
  };

  const BIOME_NAMES: Record<string, string> = {
    forest: '🌲', mountain: '⛰️', coast: '🌊', plain: '🌾', silk_road: '🐫',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: isMobile ? '1rem' : '1.5rem',
        maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🔄 Обмен секторами</h2>
          <button onClick={onClose} style={{
            background: '#f87171', color: 'white', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem'
          }}>×</button>
        </div>

        {/* Входящие предложения */}
        {incomingExchanges.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#dc2626', marginBottom: '0.5rem' }}>
              📩 Входящие предложения ({incomingExchanges.length})
            </h3>
            {incomingExchanges.map((ex) => {
              const sender = tribes.find((t) => t.id === ex.owner1Id);
              return (
                <div key={ex.id} style={{
                  border: '2px solid #fca5a5', borderRadius: '8px', padding: '0.7rem',
                  marginBottom: '0.5rem', background: '#fef2f2'
                }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <strong style={{ color: sender?.color }}>{sender?.name}</strong> предлагает:
                    <br/>
                    Сектор #{ex.sector1Id}{getBuildingInfo(ex.sector1Id)} ↔ Ваш сектор #{ex.sector2Id}{getBuildingInfo(ex.sector2Id)}
                    {ex.additionalPayment && (
                      <span style={{ fontWeight: 'bold' }}>
                        {' '}+ доплата 💰{ex.additionalPayment.amount}
                        {ex.additionalPayment.fromId === currentTribeId ? ' (вы платите)' : ' (вам платят)'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => handleAccept(ex.id)} style={{
                      flex: 1, padding: '0.5rem', background: '#4ade80', color: 'white',
                      border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                    }}>✅ Принять</button>
                    <button onClick={() => handleReject(ex.id)} style={{
                      flex: 1, padding: '0.5rem', background: '#f87171', color: 'white',
                      border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                    }}>❌ Отклонить</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Мой сектор */}
        <div style={{
          background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '8px',
          padding: '0.8rem', marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '0.3rem' }}>
            Ваш сектор #{mySectorId}: {BIOME_NAMES[mySector.type]}{getBuildingInfo(mySectorId)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
            📊 Стоимость: 💰{myValue}
          </div>
        </div>

        {/* Выбор целевого сектора */}
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
          Выберите сектор для обмена:
        </label>
        <select
          value={selectedTargetId ?? ''}
          onChange={(e) => setSelectedTargetId(e.target.value ? Number(e.target.value) : null)}
          style={{
            width: '100%', padding: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '8px',
            fontSize: '0.9rem', marginBottom: '0.7rem', boxSizing: 'border-box'
          }}
        >
          <option value="">-- Выберите сектор --</option>
          {otherSectors.map((s) => {
            const owner = tribes.find((t) => t.id === s.ownerId);
            const val = calculateSectorValue(s.id);
            return (
              <option key={s.id} value={s.id}>
                #{s.id} {BIOME_NAMES[s.type]}{getBuildingInfo(s.id)} · {owner?.name} · 💰{val}
              </option>
            );
          })}
        </select>

        {/* Расчёт разницы */}
        {targetSector && (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '0.8rem', marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <span>Ваш сектор:</span>
              <strong>💰{myValue}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <span>Чужой сектор:</span>
              <strong>💰{targetValue}</strong>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem',
              fontWeight: 'bold', color: diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b'
            }}>
              <span>Разница:</span>
              <span>{diff > 0 ? `Вы доплачиваете 💰${diff}` : diff < 0 ? `Вам доплачивают 💰${Math.abs(diff)}` : 'Равноценный обмен'}</span>
            </div>
          </div>
        )}

        {/* Ручная доплата */}
        {targetSector && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
              Доплата (💰, отрицательное = вам платят):
            </label>
            <input
              type="number"
              value={additionalPayment}
              onChange={(e) => setAdditionalPayment(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '8px',
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
              💡 Система рассчитала справедливую доплату автоматически. Вы можете скорректировать.
            </div>
          </div>
        )}

        <button
          onClick={handlePropose}
          disabled={selectedTargetId === null}
          style={{
            width: '100%', padding: '0.8rem',
            background: selectedTargetId !== null
              ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#cbd5e1',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: 'bold',
            cursor: selectedTargetId !== null ? 'pointer' : 'not-allowed'
          }}
        >
          🔄 Отправить предложение обмена
        </button>
      </div>
    </div>
  );
};
