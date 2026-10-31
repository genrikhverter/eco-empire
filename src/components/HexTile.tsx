import { memo } from 'react';
import { Group, RegularPolygon, Text } from 'react-konva';

import type { KonvaEventObject } from 'konva/lib/Node';
import type { Sector, Tribe, Building, BiomeType } from '../types';

// 🎛️ Геометрия гексагона. RADIUS = расстояние центр→вершина (как в SVG-версии ~50).
// Если ориентация не совпадёт с оригиналом — подбери HEX_ROTATION (0 / 30 / 60).
const RADIUS = 50;
const HEX_ROTATION = 0; // degrees; 0 = Konva default, 30 = flat-top, 60 = pointy-top

// Заливка ничейных тайлов по биому (совпадает со скриншотами)
const BIOME_FILL: Record<BiomeType, string> = {
  forest: '#4ade80',
  mountain: '#9ca3af',
  coast: '#60a5fa',
  plain: '#fbbf24',
  silk_road: '#fb923c',
};

// Иконка биома (эмодзи рендерится через canvas fillText — цветной в современных браузерах)
const BIOME_EMOJI: Record<BiomeType, string> = {
  forest: '🌲',
  mountain: '⛰️',
  coast: '🌊',
  plain: '🌾',
  silk_road: '🐫',
};

interface HexTileProps {
  sector: Sector;
  tribe: Tribe | undefined;
  building: Building | undefined;
  highlight: boolean;
  justCaptured: boolean;
  editable: boolean;
  onClick: (sectorId: number) => void;
  onMove: (sectorId: number, x: number, y: number) => void;
}

export const HexTile = memo(({
  sector, tribe, building, highlight, justCaptured, editable, onClick, onMove,
}: HexTileProps) => {
  // Цвет: владелец → цвет племени, иначе → цвет биома
  const fill = tribe ? tribe.color : BIOME_FILL[sector.type];
  const emoji = building ? building.icon : BIOME_EMOJI[sector.type];

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onMove(sector.id, node.x(), node.y());
  };

  return (
    <Group
      x={sector.x}
      y={sector.y}
      draggable={editable}
      onClick={() => onClick(sector.id)}
      onTap={() => onClick(sector.id)}
      onDragEnd={handleDragEnd}
      // при перетаскивании поднимаем тайл поверх соседей внутри своего слоя
      onDragStart={(e) => e.target.moveToTop()}
    >
      {/* Подсветка доступной цели захвата — жёлтый пунктирный контур снаружи */}
      {highlight && (
        <RegularPolygon
          sides={6}
          radius={RADIUS + 5}
          rotation={HEX_ROTATION}
          stroke="#facc15"
          strokeWidth={3}
          dash={[9, 6]}
          fill="transparent"
          listening={false}
        />
      )}

      {/* Основной гексагон */}
      <RegularPolygon
        sides={6}
        radius={RADIUS}
        rotation={HEX_ROTATION}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={3}
        shadowColor={justCaptured ? (tribe?.color ?? '#facc15') : 'transparent'}
        shadowBlur={justCaptured ? 24 : 0}
        shadowEnabled={justCaptured}
      />

      {/* Иконка биома / здания */}
      <Text
        text={emoji}
        fontSize={26}
        width={80}
        align="center"
        x={-40}
        y={-22}
        listening={false}
      />

      {/* Номер сектора */}
      <Text
        text={`#${sector.id}`}
        fontSize={12}
        fontStyle="bold"
        fill="#ffffff"
        width={80}
        align="center"
        x={-40}
        y={22}
        listening={false}
      />
    </Group>
  );
});

HexTile.displayName = 'HexTile';
