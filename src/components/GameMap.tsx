import { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';
import {
  useGameStore, getCaptureTargets, ADJACENCY, MAP_Y_SHIFT,
} from '../store/gameStore';
import { HexTile } from './HexTile';
import { BuildMenu } from './BuildMenu';
import { SectorSaleModal } from './SectorSaleModal';
import { SectorExchangeModal } from './SectorExchangeModal';
import { playClick, playCapture, playError } from '../utils/sounds';

const WORLD_HEIGHT = 680;

export const GameMap = () => {
  const sectors = useGameStore((state) => state.sectors);
  const tribes = useGameStore((state) => state.tribes);
  const buildings = useGameStore((state) => state.buildings);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const capturesThisTurn = useGameStore((state) => state.capturesThisTurn);
  const captureSector = useGameStore((state) => state.captureSector);
  const listings = useGameStore((state) => state.sectorListings);
  const moveSector = useGameStore((state) => state.moveSector);
  const addEdge = useGameStore((state) => state.addEdge);
  const removeEdge = useGameStore((state) => state.removeEdge);
  const hasEdge = useGameStore((state) => state.hasEdge);
  const adjacencyVersion = useGameStore((state) => state.adjacencyVersion);

  const [editable, setEditable] = useState(false);

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

  const worldWidth = useMemo(() => {
    if (sectors.length === 0) return 1200;
    const maxX = Math.max(...sectors.map((s) => s.x));
    return Math.max(1200, maxX + 160);
  }, [sectors]);

  // 🔗 ВСЕ рёбра графа ADJACENCY (зависит от adjacencyVersion -> мгновенная перерисовка)
  const bridgeLines = useMemo(() => {
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number; fromId: number; toId: number }[] = [];
    for (const sector of sectors) {
      const neighbors = ADJACENCY[sector.id];
      if (!neighbors) continue;
      for (const neighborId of neighbors) {
        if (neighborId <= sector.id) continue; // ребро рисуем один раз
        const neighbor = sectors.find((s) => s.id === neighborId);
        if (!neighbor) continue;
        lines.push({
          key: `edge-${sector.id}-${neighborId}`,
          x1: sector.x, y1: sector.y, x2: neighbor.x, y2: neighbor.y,
          fromId: sector.id, toId: neighborId,
        });
      }
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectors, adjacencyVersion]);

  const getEdgeColor = (fromId: number): string => {
    if (fromId < 10) return '#22c55e';   // Сибирь
    if (fromId < 18) return '#3b82f6';   // Америка
    if (fromId < 28) return '#f59e0b';   // Закавказье
    return '#8b5cf6';                     // Новые земли
  };

  useEffect(() => {
    return () => {
      if (justCapturedTimerRef.current !== null) window.clearTimeout(justCapturedTimerRef.current);
    };
  }, []);

  // Общий парсер двух номеров тайлов из prompt-строки (используется и в связывании, и в разрыве)
  const parseTwoIds = (raw: string): { ok: true; a: number; b: number } | { ok: false; msg: string } => {
    const nums = raw.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (nums.length < 2) return { ok: false, msg: '⛔ Введите два номера тайлов, например: 3 10' };
    const a = nums[0];
    const b = nums[1];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0)
      return { ok: false, msg: '⛔ Номера должны быть целыми неотрицательными числами.' };
    if (a === b) return { ok: false, msg: '⛔ Нельзя указать один и тот же тайл дважды.' };
    const sa = sectors.find((s) => s.id === a);
    const sb = sectors.find((s) => s.id === b);
    if (!sa || !sb) {
      const ids = sectors.map((s) => s.id).sort((x, y) => x - y).join(', ');
      return { ok: false, msg: `⛔ Один из тайлов не найден.\nСуществующие id: ${ids}` };
    }
    return { ok: true, a, b };
  };

  // 🔗 Диалог СОЗДАНИЯ связи по двум номерам
  const handleLinkEdges = () => {
    playClick();
    const raw = prompt(
      '🔗 Укажите два номера тайлов через пробел или запятую, напр: 3 10\n\n' +
      'Создаст связь #a ↔ #b (захват между ними станет возможен).'
    );
    if (raw === null) return; // отмена

    const parsed = parseTwoIds(raw);
    if (!parsed.ok) { playError(); alert(parsed.msg); return; }
    const { a, b } = parsed;

    if (hasEdge(a, b)) {
      playError();
      alert(`ℹ️ Связь #${a} ↔ #${b} уже существует.\nЧтобы удалить — нажмите «✂️ Разорвать».`);
      return;
    }
    if (addEdge(a, b)) {
      playCapture();
      alert(`✅ Связь #${a} ↔ #${b} создана.`);
    } else {
      playError();
      alert('⛔ Не удалось создать связь.');
    }
  };

  // ✂️ Диалог УДАЛЕНИЯ связи по двум номерам (зеркальный алгоритм)
  const handleUnlinkEdges = () => {
    playClick();
    const raw = prompt(
      '✂️ Укажите два номера тайлов через пробел или запятую, напр: 3 10\n\n' +
      'Удалит связь #a ↔ #b (захват между ними станет невозможен).'
    );
    if (raw === null) return; // отмена

    const parsed = parseTwoIds(raw);
    if (!parsed.ok) { playError(); alert(parsed.msg); return; }
    const { a, b } = parsed;

    if (!hasEdge(a, b)) {
      playError();
      alert(`⛔ Связи #${a} ↔ #${b} не существует — удалять нечего.`);
      return;
    }
    if (removeEdge(a, b)) {
      playClick();
      alert(`✂️ Связь #${a} ↔ #${b} удалена.`);
    } else {
      playError();
      alert('⛔ Не удалось удалить связь.');
    }
  };

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
    <div style={{ position: 'relative', border: '2px solid #cbd5e1', borderRadius: '12px', background: '#f8fafc', marginBottom: '1rem', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>

      {/* Оверлей управления режимом раскладки (HTML поверх Stage) */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {editable && (
          <>
            <button
              onClick={handleLinkEdges}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                border: '2px solid #0ea5e9', background: '#e0f2fe', color: '#075985', fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              🔗 Связать
            </button>
            <button
              onClick={handleUnlinkEdges}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                border: '2px solid #ef4444', background: '#fee2e2', color: '#991b1b', fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              ✂️ Разорвать
            </button>
          </>
        )}
        <button
          onClick={() => { playClick(); setEditable((v) => !v); }}
          style={{
            padding: '0.5rem 0.9rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
            border: '2px solid ' + (editable ? '#7c3aed' : '#cbd5e1'),
            background: editable ? '#ede9fe' : 'white',
            color: editable ? '#5b21b6' : '#334155', fontSize: '0.85rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          {editable ? '✏️ Раскладка: ВКЛ' : '🖐️ Раскладка: выкл'}
        </button>
      </div>

      {/* Подсказка режима редактирования */}
      {editable && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: 'rgba(124,58,237,0.92)', color: 'white',
          padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.78rem', maxWidth: '340px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>
          Тяни тайлы мышью/пальцем · «🔗 Связать» и «✂️ Разорвать» — введи два номера (#a #b).
        </div>
      )}

      <Stage width={worldWidth} height={WORLD_HEIGHT}>

        {/* СЛОЙ 1 — ВСЕ связи секторов (тянутся за тайлами при drag) */}
        <Layer listening={false}>
          {bridgeLines.map((line) => (
            <Line
              key={line.key}
              points={[line.x1, line.y1, line.x2, line.y2]}
              stroke={getEdgeColor(line.fromId)}
              strokeWidth={2.5}
              opacity={0.55}
            />
          ))}
        </Layer>

        {/* СЛОЙ 2 — тайлы (поверх связей) */}
        <Layer>
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
                editable={editable}
                onClick={handleSectorClick}
                onMove={moveSector}
              />
            );
          })}
        </Layer>

        {/* СЛОЙ 3 — футер: статистика + легенда цвета рёбер */}
        <Layer listening={false}>
          <Text x={20} y={585 + MAP_Y_SHIFT} fontSize={14} fontStyle="bold" fill="#1e293b" text="🗺️ Карта Империи" />
          <Text x={20} y={600 + MAP_Y_SHIFT} fontSize={12} fill="#475569"
            text={`Захватов: ${capturesThisTurn}/2 · Свободно: ${freeCount} · Целей: ${targets.size} · Рёбер: ${bridgeLines.length}`} />

          <Group x={worldWidth - 220} y={520 + MAP_Y_SHIFT}>
            <Rect width={210} height={88} cornerRadius={8} fill="white" stroke="#cbd5e1" strokeWidth={2} />
            <Text x={10} y={8} fontSize={13} fontStyle="bold" fill="#1e293b" text="🔗 Цвет ребра = регион:" />
            <Line points={[10, 32, 40, 32]} stroke="#22c55e" strokeWidth={4} />
            <Text x={50} y={26} fontSize={12} fill="#334155" text="🌲 Сибирь" />
            <Line points={[10, 47, 40, 47]} stroke="#3b82f6" strokeWidth={4} />
            <Text x={50} y={41} fontSize={12} fill="#334155" text="🌊 Америка" />
            <Line points={[10, 62, 40, 62]} stroke="#f59e0b" strokeWidth={4} />
            <Text x={50} y={56} fontSize={12} fill="#334155" text="🐫 Закавказье" />
            <Line points={[10, 77, 40, 77]} stroke="#8b5cf6" strokeWidth={4} />
            <Text x={50} y={71} fontSize={12} fill="#334155" text="🗺️ Новые земли" />
          </Group>
        </Layer>
      </Stage>

      {buildMenuSectorId !== null && <BuildMenu sectorId={buildMenuSectorId} onClose={() => setBuildMenuSectorId(null)} />}
      {saleModalSectorId !== null && <SectorSaleModal sectorId={saleModalSectorId} onClose={() => setSaleModalSectorId(null)} />}
      {exchangeModalSectorId !== null && <SectorExchangeModal mySectorId={exchangeModalSectorId} onClose={() => setExchangeModalSectorId(null)} />}
    </div>
  );
};
