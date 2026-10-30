import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore, getCaptureTargets, REGION_BG_COLORS } from '../store/gameStore';
import { HexTile } from './HexTile';
import { BuildMenu } from './BuildMenu';
import { SectorSaleModal } from './SectorSaleModal';
import { SectorExchangeModal } from './SectorExchangeModal';
import { playClick, playCapture, playError } from '../utils/sounds';

// Границы регионов для отрисовки фона
const REGION_BOUNDS = {
  siberia:   { x: 20,  y: 20, w: 510, h: 440 },
  america:   { x: 520, y: 20, w: 240, h: 440 },
  turkestan: { x: 800, y: 20, w: 350, h: 440 },
};

// Линии-мосты между регионами (визуализация связей ADJACENCY)
const BRIDGE_PAIRS: [number, number][] = [
  [3, 10], [7, 12], [9, 14],
  [11, 18], [13, 21], [15, 24], [17, 26],
];

export const GameMap = () => {
  const sectors = useGameStore((state) => state.sectors);
  const tribes = useGameStore((state) => state.tribes);
  const buildings = useGameStore((state) => state.buildings);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const capturesThisTurn = useGameStore((state) => state.capturesThisTurn);
  const captureSector = useGameStore((state) => state.captureSector);
  const listings = useGameStore((state) => state.sectorListings);

  const [buildMenuSectorId, setBuildMenuSectorId] = useState<number | null>(null);
  const [saleModalSectorId, setSaleModalSectorId] = useState<number | null>(null);
  const [exchangeModalSectorId, setExchangeModalSectorId] = useState<number | null>(null);
  const [justCapturedId, setJustCapturedId] = useState<number | null>(null);
  const justCapturedTimerRef = useRef<number | null>(null);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  const freeCount = sectors.filter((s) => s.ownerId === null).length;

  // Пересчитываем цели захвата только при изменении зависимостей
  const targets = useMemo(
    () => getCaptureTargets(sectors, tribes, currentTribeId),
    [sectors, tribes, currentTribeId]
  );

  useEffect(() => {
    return () => {
      if (justCapturedTimerRef.current !== null) {
        window.clearTimeout(justCapturedTimerRef.current);
      }
    };
  }, []);

  const handleSectorClick = (sectorId: number) => {
    const sector = sectors.find((s) => s.id === sectorId);
    if (!sector) return;

    // === СВОБОДНЫЙ СЕКТОР — ЗАХВАТ ===
    if (sector.ownerId === null) {
      // Проверка связности теперь внутри captureSector через таблицу ADJACENCY
      if (capturesThisTurn >= 2) {
        playError();
        alert('⛔ Лимит: не более 2 захватов за ход!');
        return;
      }
      if (freeCount - 1 < 8) {
        playError();
        alert('⛔ Минимум 8 свободных секторов должно остаться.');
        return;
      }
      if (confirm(`Захватить сектор #${sectorId} для ${currentTribe?.name}?`)) {
        const success = captureSector(sectorId);
        if (success) {
          playCapture();
          setJustCapturedId(sectorId);
          if (justCapturedTimerRef.current !== null) {
            window.clearTimeout(justCapturedTimerRef.current);
          }
          justCapturedTimerRef.current = window.setTimeout(() => {
            setJustCapturedId(null);
            justCapturedTimerRef.current = null;
          }, 2500);
        } else {
          playError();
          alert(`⛔ Сектор #${sectorId} не граничит с вашими владениями.`);
        }
      }
      return;
    }

    // === ЧУЖОЙ СЕКТОР — ПОКУПКА ИЛИ ИНФО ===
    if (sector.ownerId !== currentTribeId) {
      const activeListing = listings.find((l) => l.sectorId === sectorId && l.active);
      if (activeListing) {
        playClick();
        setSaleModalSectorId(sectorId);
      } else {
        playClick();
        const owner = tribes.find((t) => t.id === sector.ownerId);
        const building = buildings.find((b) => b.id === sector.buildingId);
        let info = `Сектор #${sectorId}\nТип: ${sector.type}\nВладелец: ${owner?.name}`;
        if (building) info += `\nЗдание: ${building.icon} ${building.name}`;
        info += '\n\n💡 Предложите обмен через свои сектора.';
        alert(info);
      }
      return;
    }

    // === СВОЙ СЕКТОР — МЕНЮ ДЕЙСТВИЙ ===
    playClick();
    const hasBuilding = sector.buildingId !== null;
    const activeListing = listings.find((l) => l.sectorId === sectorId && l.active);

    const actions: string[] = [];
    if (!hasBuilding) actions.push('🏗️ Построить здание');
    actions.push(activeListing ? '🏷️ Управление продажей' : '💰 Продать сектор');
    actions.push('🔄 Предложить обмен');
    actions.push('ℹ️ Информация');

    const choice = prompt(
      `Сектор #${sectorId} (${sector.type})\n\nВыберите действие (введите номер):\n` +
      actions.map((a, i) => `${i + 1}. ${a}`).join('\n')
    );

    const idx = parseInt(choice || '0') - 1;
    if (idx === 0 && !hasBuilding) {
      setBuildMenuSectorId(sectorId);
    } else if ((idx === 0 && hasBuilding) || (idx === 1 && !hasBuilding)) {
      setSaleModalSectorId(sectorId);
    } else if ((idx === 1 && hasBuilding) || (idx === 2 && !hasBuilding)) {
      setExchangeModalSectorId(sectorId);
    } else {
      const owner = tribes.find((t) => t.id === sector.ownerId);
      const building = buildings.find((b) => b.id === sector.buildingId);
      let info = `Сектор #${sectorId}\nТип: ${sector.type}\nВладелец: ${owner?.name}`;
      if (building) info += `\nЗдание: ${building.icon} ${building.name}`;
      alert(info);
    }
  };

  return (
    <div style={{
      border: '2px solid #cbd5e1',
      borderRadius: '12px',
      background: '#f8fafc',
      marginBottom: '1rem',
      maxWidth: '100%',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <svg
        viewBox="0 0 1200 560"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          minWidth: '600px'
        }}
      >
        {/* Фоны регионов */}
        {Object.entries(REGION_BOUNDS).map(([key, bounds]) => (
          <g key={key}>
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.w}
              height={bounds.h}
              rx="16"
              ry="16"
              fill={REGION_BG_COLORS[key]}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="6 3"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={bounds.x + bounds.w / 2}
              y={bounds.y + 18}
              textAnchor="middle"
              fontSize="13"
              fontWeight="bold"
              fill="#64748b"
              opacity="0.8"
              style={{ pointerEvents: 'none' }}
            >
              {key === 'siberia' ? '🌲 СИБИРЬ' : key === 'america' ? '🌊 РУССКАЯ АМЕРИКА' : '🐫 ЗАКАВКАЗЬЕ'}
            </text>
          </g>
        ))}

        {/* Линии-мосты между регионами */}
        {BRIDGE_PAIRS.map(([fromId, toId], i) => {
          const from = sectors.find((s) => s.id === fromId);
          const to = sectors.find((s) => s.id === toId);
          if (!from || !to) return null;
          return (
            <line
              key={`bridge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.5"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Заголовок и статистика */}
        <text x="20" y="545" style={{ fontSize: '14px', fontWeight: 'bold', fill: '#1e293b' }}>
          🗺️ Карта Империи
        </text>
        <text x="1180" y="545" textAnchor="end" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#475569' }}>
          Захватов: {capturesThisTurn}/2 · Свободно: {freeCount} · Целей: {targets.size}
        </text>

        {/* Сектора */}
        {sectors.map((sector) => {
          const owner = tribes.find((t) => t.id === sector.ownerId);
          const building = buildings.find((b) => b.id === sector.buildingId);
          return (
            <HexTile
              key={sector.id}
              sector={sector}
              tribe={owner}
              building={building}
              highlight={targets.has(sector.id)}
              justCaptured={justCapturedId === sector.id}
              onClick={() => handleSectorClick(sector.id)}
            />
          );
        })}
      </svg>

      {buildMenuSectorId !== null && (
        <BuildMenu sectorId={buildMenuSectorId} onClose={() => setBuildMenuSectorId(null)} />
      )}

      {saleModalSectorId !== null && (
        <SectorSaleModal sectorId={saleModalSectorId} onClose={() => setSaleModalSectorId(null)} />
      )}

      {exchangeModalSectorId !== null && (
        <SectorExchangeModal mySectorId={exchangeModalSectorId} onClose={() => setExchangeModalSectorId(null)} />
      )}
    </div>
  );
};
