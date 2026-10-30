import { useState, useEffect, useRef } from 'react';
import { useGameStore, getCaptureTargets } from '../store/gameStore';
import { HexTile } from './HexTile';
import { BuildMenu } from './BuildMenu';
import { playClick, playCapture, playError } from '../utils/sounds';

export const GameMap = () => {
  const sectors = useGameStore((state) => state.sectors);
  const tribes = useGameStore((state) => state.tribes);
  const buildings = useGameStore((state) => state.buildings);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const capturesThisTurn = useGameStore((state) => state.capturesThisTurn);
  const captureSector = useGameStore((state) => state.captureSector);

  const [buildMenuSectorId, setBuildMenuSectorId] = useState<number | null>(null);
  const [justCapturedId, setJustCapturedId] = useState<number | null>(null);
  const justCapturedTimerRef = useRef<number | null>(null);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  const freeCount = sectors.filter((s) => s.ownerId === null).length;

  // Очищаем таймер при размонтировании компонента
  useEffect(() => {
    return () => {
      if (justCapturedTimerRef.current !== null) {
        window.clearTimeout(justCapturedTimerRef.current);
      }
    };
  }, []);

  const targets = getCaptureTargets(sectors, tribes, currentTribeId);

  const handleSectorClick = (sectorId: number) => {
    const sector = sectors.find((s) => s.id === sectorId);
    if (!sector) return;

    if (sector.ownerId === null) {
      // 1. Связность территорий
      if (!targets.has(sectorId)) {
        playError();
        alert(`⛔ Сектор #${sectorId} не граничит с вашими владениями.\nЗахватывайте только соседние территории!`);
        return;
      }
      // 2. Лимит захватов за ход
      if (capturesThisTurn >= 2) {
        playError();
        alert('⛔ Лимит исчерпан: не более 2 секторов за ход! Дождитесь следующего хода.');
        return;
      }
      // 3. Инвариант «минимум 8 свободных»
      if (freeCount - 1 < 8) {
        playError();
        alert(`⛔ Нельзя захватывать: на карте должно остаться минимум 8 свободных секторов (сейчас ${freeCount}).`);
        return;
      }
      if (confirm(`Захватить сектор #${sectorId} для ${currentTribe?.name}?\n(захватов за ход: ${capturesThisTurn}/2)`)) {
        const success = captureSector(sectorId);
        if (success) {
          playCapture();
          // Запускаем анимацию пульсации
          setJustCapturedId(sectorId);
          console.log('🎯 Захват прошёл, запускаем пульсацию для сектора:', sectorId);
          if (justCapturedTimerRef.current !== null) {
            window.clearTimeout(justCapturedTimerRef.current);
          }
          justCapturedTimerRef.current = window.setTimeout(() => {
            setJustCapturedId(null);
            justCapturedTimerRef.current = null;
          }, 2500); // 2.5 секунды пульсации (3 цикла по 0.8 сек)
        }
      }
    } else if (sector.ownerId === currentTribeId && sector.buildingId === null) {
      playClick();
      setBuildMenuSectorId(sectorId);
    } else {
      playClick();
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
      background: '#e0f2fe',
      marginBottom: '1rem',
      maxWidth: '100%',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <svg
        viewBox="0 0 1200 650"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          minWidth: '560px'
        }}
      >
        <text x="20" y="30" style={{ fontSize: '18px', fontWeight: 'bold', fill: '#1e293b' }}>
          🗺️ Карта Империи
        </text>
        <text x="1180" y="30" textAnchor="end" style={{ fontSize: '14px', fontWeight: 'bold', fill: '#475569' }}>
          Захватов: {capturesThisTurn}/2 · Свободно: {freeCount} · Целей: {targets.size}
        </text>

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
        <BuildMenu
          sectorId={buildMenuSectorId}
          onClose={() => setBuildMenuSectorId(null)}
        />
      )}
    </div>
  );
};
