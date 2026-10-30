import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore, getCaptureTargets, REGION_BG_COLORS, ADJACENCY } from '../store/gameStore';
import { HexTile } from './HexTile';
import { BuildMenu } from './BuildMenu';
import { SectorSaleModal } from './SectorSaleModal';
import { SectorExchangeModal } from './SectorExchangeModal';
import { playClick, playCapture, playError } from '../utils/sounds';

// Увеличен отступ сверху (y: 40 вместо 20), чтобы названия не перекрывались тайлами
const REGION_BOUNDS = {
  siberia:   { x: 20,  y: 40, w: 510, h: 420 },
  america:   { x: 520, y: 40, w: 240, h: 420 },
  turkestan: { x: 800, y: 40, w: 350, h: 420 },
};

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

  const targets = useMemo(
    () => getCaptureTargets(sectors, tribes, currentTribeId),
    [sectors, tribes, currentTribeId]
  );

  const viewBoxWidth = useMemo(() => {
    if (sectors.length === 0) return 1200;
    const maxX = Math.max(...sectors.map((s) => s.x));
    return Math.max(1200, maxX + 300);
  }, [sectors]);

  const expandedBounds = useMemo(() => {
    const expandedSectors = sectors.filter((s) => s.id >= 28);
    if (expandedSectors.length === 0) return null;
    const minX = Math.min(...expandedSectors.map((s) => s.x)) - 60;
    const maxX = Math.max(...expandedSectors.map((s) => s.x)) + 60;
    return { x: minX, y: 40, w: maxX - minX, h: 420 };
  }, [sectors]);

  const bridgeLines = useMemo(() => {
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number; fromId: number; toId: number }[] = [];
    for (const sector of sectors) {
      const neighbors = ADJACENCY[sector.id];
      if (!neighbors) continue;
      for (const neighborId of neighbors) {
        if (neighborId <= sector.id) continue;
        const neighbor = sectors.find((s) => s.id === neighborId);
        if (!neighbor) continue;
        const dist = Math.hypot(sector.x - neighbor.x, sector.y - neighbor.y);
        if (dist <= 125) continue;
        lines.push({
          key: `bridge-${sector.id}-${neighborId}`,
          x1: sector.x, y1: sector.y, x2: neighbor.x, y2: neighbor.y,
          fromId: sector.id,
          toId: neighborId,
        });
      }
    }
    return lines;
  }, [sectors]);

  const visibleBridges = useMemo(() => {
    return bridgeLines.filter((line) => line.fromId >= 28 || line.toId >= 28);
  }, [bridgeLines]);

  const getBridgeColor = (fromId: number): string => {
    if (fromId < 10) return '#22c55e';
    if (fromId < 18) return '#3b82f6';
    if (fromId < 28) return '#f59e0b';
    return '#8b5cf6';
  };

  useEffect(() => {
    return () => {
      if (justCapturedTimerRef.current !== null) window.clearTimeout(justCapturedTimerRef.current);
    };
  }, []);

  const handleSectorClick = (sectorId: number) => {
    const sector = sectors.find((s) => s.id === sectorId);
    if (!sector) return;

    if (sector.ownerId === null) {
      if (capturesThisTurn >= 2) { playError(); alert('⛔ Лимит: не более 2 захватов за ход!'); return; }
      if (freeCount - 1 < 8) { playError(); alert('⛔ Минимум 8 свободных секторов должно остаться.'); return; }
      if (confirm(`Захватить сектор #${sectorId} для ${currentTribe?.name}?`)) {
        const success = captureSector(sectorId);
        if (success) {
          playCapture();
          setJustCapturedId(sectorId);
          if (justCapturedTimerRef.current !== null) window.clearTimeout(justCapturedTimerRef.current);
          justCapturedTimerRef.current = window.setTimeout(() => { setJustCapturedId(null); justCapturedTimerRef.current = null; }, 2500);
        } else { playError(); alert(`⛔ Сектор #${sectorId} не граничит с вашими владениями.`); }
      }
      return;
    }

    if (sector.ownerId !== currentTribeId) {
      const activeListing = listings.find((l) => l.sectorId === sectorId && l.active);
      if (activeListing) { playClick(); setSaleModalSectorId(sectorId); }
      else {
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

    playClick();
    const hasBuilding = sector.buildingId !== null;
    const activeListing = listings.find((l) => l.sectorId === sectorId && l.active);
    const actions: string[] = [];
    if (!hasBuilding) actions.push('️ Построить здание');
    actions.push(activeListing ? '🏷️ Управление продажей' : '💰 Продать сектор');
    actions.push('🔄 Предложить обмен');
    actions.push('ℹ️ Информация');
    const choice = prompt(`Сектор #${sectorId} (${sector.type})\n\nВыберите действие (введите номер):\n` + actions.map((a, i) => `${i + 1}. ${a}`).join('\n'));
    const idx = parseInt(choice || '0') - 1;
    if (idx === 0 && !hasBuilding) setBuildMenuSectorId(sectorId);
    else if ((idx === 0 && hasBuilding) || (idx === 1 && !hasBuilding)) setSaleModalSectorId(sectorId);
    else if ((idx === 1 && hasBuilding) || (idx === 2 && !hasBuilding)) setExchangeModalSectorId(sectorId);
    else {
      const owner = tribes.find((t) => t.id === sector.ownerId);
      const building = buildings.find((b) => b.id === sector.buildingId);
      let info = `Сектор #${sectorId}\nТип: ${sector.type}\nВладелец: ${owner?.name}`;
      if (building) info += `\nЗдание: ${building.icon} ${building.name}`;
      alert(info);
    }
  };

  return (
    <div style={{ border: '2px solid #cbd5e1', borderRadius: '12px', background: '#f8fafc', marginBottom: '1rem', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${viewBoxWidth} 600`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', minWidth: '600px' }}>

        {/* Фоны базовых регионов с поднятыми названиями */}
        {Object.entries(REGION_BOUNDS).map(([key, bounds]) => (
          <g key={key}>
            {/* Фон региона */}
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

            {/* Название региона НАД регионом */}
            <g>
              {/* Белая подложка для текста */}
              <rect
                x={bounds.x + bounds.w / 2 - 75}
                y={bounds.y - 35}  // Над регионом
                width="150"
                height="30"
                rx="15"
                fill="white"
                opacity="0.9"
                stroke="#e2e8f0"
                strokeWidth="1"
                style={{ pointerEvents: 'none' }}
              />

              {/* Текст названия */}
              <text
                x={bounds.x + bounds.w / 2}
                y={bounds.y - 15}  // Центрируем по вертикали в подложке
                textAnchor="middle"
                fontSize="15"
                fontWeight="bold"
                fill="#1e293b"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {key === 'siberia' ? '🌲 СИБИРЬ' : key === 'america' ? '🌊 РУССКАЯ АМЕРИКА' : '🐫 ЗАКАВКАЗЬЕ'}
              </text>
            </g>
          </g>
        ))}
        {/* Фон расширенной области */}
        {expandedBounds && (
          <g>
            <rect x={expandedBounds.x} y={expandedBounds.y} width={expandedBounds.w} height={expandedBounds.h} rx="16" ry="16" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
            <text x={expandedBounds.x + expandedBounds.w / 2} y={expandedBounds.y + 24} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#94a3b8" opacity="0.8" style={{ pointerEvents: 'none' }}>🗺️ НОВЫЕ ЗЕМЛИ</text>
          </g>
        )}

        {/* Мосты ТОЛЬКО к/от новых земель */}
        {visibleBridges.map((line) => (
          <line
            key={line.key}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={getBridgeColor(line.fromId)}
            strokeWidth="3"
            strokeDasharray="8 4"
            opacity="0.7"
            style={{ pointerEvents: 'none' }}
          />
        ))}

        <text x="20" y="545" style={{ fontSize: '14px', fontWeight: 'bold', fill: '#1e293b' }}>🗺️ Карта Империи</text>
        <text x={viewBoxWidth - 20} y="545" textAnchor="end" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#475569' }}>Захватов: {capturesThisTurn}/2 · Свободно: {freeCount} · Целей: {targets.size}</text>

        {/* Легенда */}
        <rect x={viewBoxWidth - 180} y={540} width="170" height="65" rx="8" fill="white" stroke="#cbd5e1" strokeWidth="1" />
        <text x={viewBoxWidth - 170} y={545} fontSize="11" fontWeight="bold">Легенда мостов:</text>
        <line x1={viewBoxWidth - 170} y1={555} x2={viewBoxWidth - 150} y2={515} stroke="#22c55e" strokeWidth="3" strokeDasharray="8 4" />
        <text x={viewBoxWidth - 145} y={558} fontSize="10">🌲 Сибирь → Новые</text>
        <line x1={viewBoxWidth - 170} y1={570} x2={viewBoxWidth - 150} y2={530} stroke="#3b82f6" strokeWidth="3" strokeDasharray="8 4" />
        <text x={viewBoxWidth - 145} y={573} fontSize="10">🌊 Америка → Новые</text>
        <line x1={viewBoxWidth - 170} y1={585} x2={viewBoxWidth - 150} y2={545} stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 4" />
        <text x={viewBoxWidth - 145} y={588} fontSize="10">🐫 Закавказье → Новые</text>
        <line x1={viewBoxWidth - 170} y1={600} x2={viewBoxWidth - 150} y2={560} stroke="#8b5cf6" strokeWidth="3" strokeDasharray="8 4" />
        <text x={viewBoxWidth - 145} y={603} fontSize="10"> Внутри новых</text>

        {sectors.map((sector) => {
          const owner = tribes.find((t) => t.id === sector.ownerId);
          const building = buildings.find((b) => b.id === sector.buildingId);
          return <HexTile key={sector.id} sector={sector} tribe={owner} building={building} highlight={targets.has(sector.id)} justCaptured={justCapturedId === sector.id} onClick={() => handleSectorClick(sector.id)} />;
        })}
      </svg>
      {buildMenuSectorId !== null && <BuildMenu sectorId={buildMenuSectorId} onClose={() => setBuildMenuSectorId(null)} />}
      {saleModalSectorId !== null && <SectorSaleModal sectorId={saleModalSectorId} onClose={() => setSaleModalSectorId(null)} />}
      {exchangeModalSectorId !== null && <SectorExchangeModal mySectorId={exchangeModalSectorId} onClose={() => setExchangeModalSectorId(null)} />}
    </div>
  );
};
