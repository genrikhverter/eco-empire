import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { issueShare } from '../store/bank';
import type { ResourceType, Building, BiomeType } from '../types';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  fur: '🦊',
  ore: '⚒️',
  fabric: '🧵',
  food: '🍞',
  money: '💰',
};

const BIOME_NAMES: Record<BiomeType, string> = {
  forest: '🌲 Тайга',
  mountain: '⛰️ Горы',
  coast: '🌊 Побережье',
  plain: '🌾 Степь',
  silk_road: '🐫 Шёлковый путь',
};

interface BuildMenuProps {
  sectorId: number;
  onClose: () => void;
}

export const BuildMenu = ({ sectorId, onClose }: BuildMenuProps) => {
  const isMobile = useIsMobile();
  const buildings = useGameStore((state) => state.buildings);
  const sectors = useGameStore((state) => state.sectors);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const tribes = useGameStore((state) => state.tribes);
  const buildBuilding = useGameStore((state) => state.buildBuilding);
  const canAfford = useGameStore((state) => state.canAfford);

  const [shouldIssueShare, setShouldIssueShare] = useState(false);
  const [sharePrice, setSharePrice] = useState('3');
  const [shareDividend, setShareDividend] = useState('1');

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  const sector = sectors.find((s) => s.id === sectorId);
  
  if (!currentTribe || !sector) return null;

  const canBuildInBiome = (building: Building, biome: BiomeType): boolean => {
    if (!building.allowedBiomes || building.allowedBiomes === null) {
      return true;
    }
    return building.allowedBiomes.includes(biome);
  };

  const availableBuildings = buildings.filter((b) => canBuildInBiome(b, sector.type));
  const unavailableBuildings = buildings.filter((b) => !canBuildInBiome(b, sector.type));

  const handleBuild = (buildingId: string) => {
    const success = buildBuilding(sectorId, buildingId);
    if (success) {
      // Выпускаем пай, если выбрано
      if (shouldIssueShare) {
        const price = parseInt(sharePrice) || 0;
        const dividend = parseInt(shareDividend) || 0;
        if (price > 0 && dividend > 0) {
          issueShare(sectorId, price, dividend);
        }
      }
      onClose();
    } else {
      alert('Недостаточно ресурсов для постройки!');
    }
  };

  const renderBuildingCard = (building: Building, isAvailable: boolean) => {
    const affordable = isAvailable && canAfford(currentTribeId, building.id);
    
    return (
      <div
        key={building.id}
        style={{
          border: `2px solid ${
            !isAvailable ? '#94a3b8' : 
            affordable ? '#4ade80' : '#cbd5e1'
          }`,
          borderRadius: '8px',
          padding: isMobile ? '0.8rem' : '1rem',
          background: !isAvailable ? '#f1f5f9' : affordable ? '#f0fdf4' : '#f8fafc',
          opacity: !isAvailable ? 0.6 : affordable ? 1 : 0.8,
          position: 'relative'
        }}
      >
        {/* Бейдж "Недоступно" */}
        {!isAvailable && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-6px',
            background: '#ef4444',
            color: 'white',
            padding: '0.2rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            ❌ Не подходит
          </div>
        )}

        <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', textAlign: 'center' }}>
          {building.icon}
        </div>
        <h3 style={{ 
          margin: '0.4rem 0', 
          textAlign: 'center',
          fontSize: isMobile ? '1rem' : '1.15rem'
        }}>
          {building.name}
        </h3>
        
        {/* Описание */}
        <div style={{ 
          fontSize: isMobile ? '0.72rem' : '0.8rem', 
          color: '#64748b', 
          textAlign: 'center',
          marginBottom: '0.5rem',
          fontStyle: 'italic'
        }}>
          {building.description}
        </div>

        {/* Разрешённые биомы */}
        <div style={{ 
          fontSize: isMobile ? '0.7rem' : '0.75rem', 
          background: '#e0f2fe',
          padding: '0.3rem',
          borderRadius: '4px',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          <strong>Где:</strong>{' '}
          {building.allowedBiomes === null 
            ? '🌍 Везде' 
            : building.allowedBiomes.map((b) => BIOME_NAMES[b]).join(', ')
          }
        </div>

        <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', marginBottom: '0.4rem' }}>
          <strong>Цена:</strong>{' '}
          {Object.entries(building.cost).map(([resource, amount]) => (
            <span key={resource} style={{ marginRight: '0.4rem', whiteSpace: 'nowrap' }}>
              {RESOURCE_ICONS[resource as ResourceType]}{amount}
            </span>
          ))}
        </div>

        {Object.keys(building.income).length > 0 && (
          <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', marginBottom: '0.4rem' }}>
            <strong>Доход:</strong>{' '}
            {Object.entries(building.income).map(([resource, amount]) => (
              <span key={resource} style={{ marginRight: '0.4rem', whiteSpace: 'nowrap' }}>
                {RESOURCE_ICONS[resource as ResourceType]}+{amount}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', marginBottom: '0.6rem' }}>
          <strong>ОИ:</strong> +{building.score}
        </div>

        {/* Блок выпуска паёв (только для доступных и оплачиваемых зданий) */}
        {isAvailable && affordable && (
          <div style={{
            border: '2px solid #a78bfa',
            borderRadius: '6px',
            padding: '0.5rem',
            marginBottom: '0.6rem',
            background: '#f5f3ff'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              <input
                type="checkbox"
                checked={shouldIssueShare}
                onChange={(e) => setShouldIssueShare(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <strong>📈 Выпустить пай (акцию)</strong>
            </label>
            {shouldIssueShare && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <div>
                  Цена: <input
                    type="number"
                    min="1"
                    value={sharePrice}
                    onChange={(e) => setSharePrice(e.target.value)}
                    style={{ width: '50px', padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                  /> 💰
                </div>
                <div>
                  Дивиденд/ход: <input
                    type="number"
                    min="1"
                    value={shareDividend}
                    onChange={(e) => setShareDividend(e.target.value)}
                    style={{ width: '50px', padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                  /> 💰
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => handleBuild(building.id)}
          disabled={!affordable}
          style={{
            width: '100%',
            padding: '0.6rem',
            background: !isAvailable 
              ? '#94a3b8' 
              : affordable 
                ? '#4ade80' 
                : '#cbd5e1',
            color: affordable ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '6px',
            cursor: affordable ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            minHeight: '44px'
          }}
        >
          {!isAvailable 
            ? '❌ Нельзя здесь' 
            : affordable 
              ? '🔨 Построить' 
              : '❌ Мало ресурсов'
          }
        </button>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
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
        maxWidth: '800px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Заголовок */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '0.8rem',
          gap: '0.5rem'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1.1rem' : '1.5rem' 
            }}>
              🏗️ Сектор #{sectorId}
            </h2>
            <div style={{ 
              fontSize: isMobile ? '0.8rem' : '0.9rem', 
              color: '#64748b', 
              marginTop: '0.2rem' 
            }}>
              Биом: {BIOME_NAMES[sector.type]}
            </div>
          </div>
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

        {/* Казна */}
        <div style={{
          background: '#f1f5f9',
          padding: '0.6rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: isMobile ? '0.85rem' : '1rem'
        }}>
          <strong>Казна:</strong>{' '}
          {Object.entries(currentTribe.resources).map(([key, value]) => (
            <span key={key} style={{ marginRight: '0.6rem', whiteSpace: 'nowrap' }}>
              {RESOURCE_ICONS[key as ResourceType]}{value}
            </span>
          ))}
        </div>

        {/* Доступные здания */}
        {availableBuildings.length > 0 && (
          <>
            <h3 style={{ 
              color: '#16a34a', 
              marginBottom: '0.8rem',
              fontSize: isMobile ? '0.95rem' : '1.1rem'
            }}>
              ✅ Можно строить ({availableBuildings.length})
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: isMobile ? '0.8rem' : '1rem', 
              marginBottom: '1.2rem'
            }}>
              {availableBuildings.map((building) => renderBuildingCard(building, true))}
            </div>
          </>
        )}

        {/* Недоступные здания */}
        {unavailableBuildings.length > 0 && (
          <>
            <h3 style={{ 
              color: '#94a3b8', 
              marginBottom: '0.8rem',
              fontSize: isMobile ? '0.95rem' : '1.1rem'
            }}>
              ❌ Нельзя в этом биоме ({unavailableBuildings.length})
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: isMobile ? '0.8rem' : '1rem'
            }}>
              {unavailableBuildings.map((building) => renderBuildingCard(building, false))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
