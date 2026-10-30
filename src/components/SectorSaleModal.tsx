import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';

interface SectorSaleModalProps {
  sectorId: number;
  onClose: () => void;
}

export const SectorSaleModal = ({ sectorId, onClose }: SectorSaleModalProps) => {
  const isMobile = useIsMobile();
  const sectors = useGameStore((s) => s.sectors);
  const buildings = useGameStore((s) => s.buildings);
  const listings = useGameStore((s) => s.sectorListings);
  const calculateSectorValue = useGameStore((s) => s.calculateSectorValue);
  const listSectorForSale = useGameStore((s) => s.listSectorForSale);
  const cancelSectorListing = useGameStore((s) => s.cancelSectorListing);
  const buySector = useGameStore((s) => s.buySector);
  const currentTribeId = useGameStore((s) => s.currentTribeId);
  const tribes = useGameStore((s) => s.tribes);

  const sector = sectors.find((s) => s.id === sectorId);
  if (!sector) return null;

  const building = sector.buildingId ? buildings.find((b) => b.id === sector.buildingId) : null;
  const owner = sector.ownerId ? tribes.find((t) => t.id === sector.ownerId) : null;
  const estimatedValue = calculateSectorValue(sectorId);
  const activeListing = listings.find((l) => l.sectorId === sectorId && l.active);
  const isOwner = sector.ownerId === currentTribeId;
  const currentTribeMoney = tribes.find((t) => t.id === currentTribeId)?.resources.money || 0;

  const [price, setPrice] = useState<string>(String(estimatedValue));

  const handleList = () => {
    const p = parseInt(price);
    if (isNaN(p) || p <= 0) {
      alert('❌ Укажите корректную цену (> 0)');
      return;
    }
    if (listSectorForSale(sectorId, p)) {
      alert(`✅ Сектор #${sectorId} выставлен на продажу за 💰${p}`);
      onClose();
    }
  };

  const handleCancel = () => {
    if (activeListing && cancelSectorListing(activeListing.id)) {
      alert('✅ Снятие с продажи подтверждено');
      onClose();
    }
  };

  const handleBuy = () => {
    if (!activeListing) return;
    if (currentTribeMoney < activeListing.price) {
      alert(`❌ Недостаточно денег! Нужно 💰${activeListing.price}, у вас 💰${currentTribeMoney}`);
      return;
    }
    if (confirm(`Купить сектор #${sectorId} за 💰${activeListing.price}?`)) {
      if (buySector(activeListing.id)) {
        alert('✅ Покупка совершена!');
        onClose();
      }
    }
  };

  const BIOME_NAMES: Record<string, string> = {
    forest: '🌲 Тайга', mountain: '⛰️ Горы', coast: '🌊 Побережье',
    plain: '🌾 Степь', silk_road: '🐫 Шёлковый путь',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: isMobile ? '1rem' : '1.5rem',
        maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🏷️ Рынок сектора #{sectorId}</h2>
          <button onClick={onClose} style={{
            background: '#f87171', color: 'white', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem'
          }}>×</button>
        </div>

        {/* Информация о секторе */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '0.8rem', marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
            {BIOME_NAMES[sector.type] || sector.type}
            {building && <> · {building.icon} {building.name}</>}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Владелец: <strong style={{ color: owner?.color }}>{owner?.name || 'Ничейный'}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 'bold', marginTop: '0.3rem' }}>
            📊 Расчётная стоимость: 💰{estimatedValue}
          </div>
        </div>

        {/* Если сектор уже выставлен на продажу */}
        {activeListing && (
          <div style={{
            background: '#fef3c7', border: '2px solid #facc15', borderRadius: '8px',
            padding: '1rem', marginBottom: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>
              🏷️ Выставлен на продажу!
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#78350f', marginBottom: '0.7rem' }}>
              Цена: 💰{activeListing.price}
            </div>

            {isOwner ? (
              <button onClick={handleCancel} style={{
                width: '100%', padding: '0.7rem', background: '#f87171', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer'
              }}>
                ❌ Снять с продажи
              </button>
            ) : (
              <button onClick={handleBuy} disabled={currentTribeMoney < activeListing.price} style={{
                width: '100%', padding: '0.7rem',
                background: currentTribeMoney >= activeListing.price
                  ? 'linear-gradient(135deg, #4ade80, #16a34a)' : '#cbd5e1',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '0.95rem', fontWeight: 'bold',
                cursor: currentTribeMoney >= activeListing.price ? 'pointer' : 'not-allowed'
              }}>
                {currentTribeMoney >= activeListing.price
                  ? `💰 Купить за ${activeListing.price}`
                  : `Не хватает 💰${activeListing.price - currentTribeMoney}`}
              </button>
            )}
          </div>
        )}

        {/* Если сектор принадлежит текущему игроку и НЕ выставлен */}
        {isOwner && !activeListing && (
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#1e293b' }}>
              Установите цену продажи (💰):
            </label>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{
                width: '100%', padding: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '8px',
                fontSize: '1rem', marginBottom: '0.7rem', boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              💡 Рекомендуемая цена: 💰{estimatedValue}. Вы можете установить любую цену.
            </div>
            <button onClick={handleList} style={{
              width: '100%', padding: '0.8rem',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
            }}>
              🏷️ Выставить на продажу
            </button>
          </div>
        )}

        {/* Если сектор чужой и не выставлен */}
        {!isOwner && !activeListing && (
          <div style={{
            background: '#f1f5f9', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#64748b'
          }}>
            Этот сектор не выставлен на продажу.<br/>
            Предложите обмен через кнопку «🔄 Обменять» на карте.
          </div>
        )}
      </div>
    </div>
  );
};
