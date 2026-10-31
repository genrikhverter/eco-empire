import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore, getCaptureTargets, REGION_BG_COLORS, ADJACENCY, MAP_Y_SHIFT } from '../store/gameStore';
import { HexTile } from './HexTile';
import { BuildMenu } from './BuildMenu';
import { SectorSaleModal } from './SectorSaleModal';
import { SectorExchangeModal } from './SectorExchangeModal';
import { playClick, playCapture, playError } from '../utils/sounds';

// 🎯 Верх фона = 20 + сдвиг. Это ГАРАНТИРУЕТ, что фон накрывает тайлы сверху
// (верх тайла = 30 + сдвиг, фон на 10px выше — тайл внутри подложки).
const REGION_TOP = 40 + MAP_Y_SHIFT;
const REGION_HEIGHT = 480;
// 🎛️ Насколько ВЫШЕ верха фона стоит плашка заголовка региона.
// Больше число = название выше. 35 = текущее положение.
// ⚠️ Если при большом значении заголовок обрезался сверху —
//    увеличь MAP_Y_SHIFT в gameStore.ts (он тянет REGION_TOP вниз).
const TITLE_LIFT = 55;   // ← было эквивалентно 35, теперь поднято на 20px


const REGION_BOUNDS = {
  siberia:   { x: 20,  y: REGION_TOP, w: 510, h: REGION_HEIGHT },
  america:   { x: 520, y: REGION_TOP, w: 240, h: REGION_HEIGHT },
  turkestan: { x: 800, y: REGION_TOP, w: 350, h: REGION_HEIGHT },
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

  // Высота SVG растёт вместе со сдвигом, чтобы легенда/статистика не обрезались
  const viewBoxHeight = 600 + MAP_Y_SHIFT;

  const expandedBounds = useMemo(() => {
    const expandedSectors = sectors.filter((s) => s.id >= 28);
    if (expandedSectors.length === 0) return null;
    const minX = Math.min(...expandedSectors.map((s) => s.x)) - 60;
    const maxX = Math.max(...expandedSectors.map((s) => s.x)) + 60;
    return { x: minX, y: REGION_TOP, w: maxX - minX, h: REGION_HEIGHT };
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
    if (!hasBuilding) actions.push('🏗️ Построить здание');
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
      <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', minWidth: '600px' }}>

        {/* 1. ЗАГОЛОВКИ — плашка сидит ВЫШЕ верха тайлов (bounds.y-35), текст в ней */}
        {Object.entries(REGION_BOUNDS).map(([key, bounds]) => (
          <g key={`title-${key}`}>
            <rect
              x={bounds.x + bounds.w / 2 - 85}
              y={bounds.y -  TITLE_LIFT}
              width="200"
              height="38"
              rx="19"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={5+bounds.x + bounds.w / 2}
              y={bounds.y -  TITLE_LIFT+24}
              textAnchor="middle"
              fontSize="15"
              fontWeight="bold"
              fill="#0f172a"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {key === 'siberia' ? '🌲 СИБИРЬ' : key === 'america' ? '🌊 РУССКАЯ АМЕРИКА' : '🐫 ЗАКАВКАЗЬЕ'}
            </text>
          </g>
        ))}

        {/* 2. ФОНЫ РЕГИОНОВ — накрывают тайлы сверху и снизу */}
        {Object.entries(REGION_BOUNDS).map(([key, bounds]) => (
          <rect
            key={`bg-${key}`}
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
        ))}

        {/* 3. ФОН + ЗАГОЛОВОК НОВЫХ ЗЕМЕЛЬ */}
        {expandedBounds && (
          <g>
            <rect x={expandedBounds.x + expandedBounds.w / 2 - 75} y={expandedBounds.y - 35} width="150" height="38" rx="19" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" style={{ pointerEvents: 'none' }} />
            <text x={expandedBounds.x + expandedBounds.w / 2} y={expandedBounds.y - 10} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#64748b" style={{ pointerEvents: 'none' }}>🗺️ НОВЫЕ ЗЕМЛИ</text>
            <rect x={expandedBounds.x} y={expandedBounds.y} width={expandedBounds.w} height={expandedBounds.h} rx="16" ry="16" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
          </g>
        )}

        {/* 4. МОСТЫ */}
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

        {/* 5. СТАТИСТИКА И ЛЕГЕНДА — сдвинуты вниз на MAP_Y_SHIFT */}
        <text x="20" y={585 + MAP_Y_SHIFT} style={{ fontSize: '14px', fontWeight: 'bold', fill: '#1e293b' }}>🗺️ Карта Империи</text>
        <text x="20" y={598 + MAP_Y_SHIFT} style={{ fontSize: '12px', fill: '#475569' }}>Захватов: {capturesThisTurn}/2 · Свободно: {freeCount} · Целей: {targets.size}</text>

        <g transform={`translate(${viewBoxWidth - 220}, ${520 + MAP_Y_SHIFT})`}>
          <rect x="0" y="0" width="210" height="75" rx="8" fill="white" stroke="#cbd5e1" strokeWidth="2" />
          <text x="10" y="20" fontSize="13" fontWeight="bold" fill="#1e293b">🌉 Легенда связей:</text>
          <line x1="10" y1="35" x2="40" y2="35" stroke="#22c55e" strokeWidth="4" strokeDasharray="8 4" />
          <text x="50" y="39" fontSize="12" fill="#334155">🌲 Сибирь → Новые</text>
          <line x1="10" y1="50" x2="40" y2="50" stroke="#3b82f6" strokeWidth="4" strokeDasharray="8 4" />
          <text x="50" y="54" fontSize="12" fill="#334155">🌊 Америка → Новые</text>
          <line x1="10" y1="65" x2="40" y2="65" stroke="#f59e0b" strokeWidth="4" strokeDasharray="8 4" />
          <text x="50" y="69" fontSize="12" fill="#334155">🐫 Закавказье → Новые</text>
        </g>

        {/* 6. ТАЙЛЫ — поверх фона */}
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
