import type { Sector, Tribe, Building } from '../types';

interface HexTileProps {
  sector: Sector;
  tribe?: Tribe;
  building?: Building;
  highlight?: boolean;
  justCaptured?: boolean;
  onClick: () => void;
}

const BIOME_COLORS: Record<string, string> = {
  forest: '#22c55e',
  mountain: '#78716c',
  coast: '#0ea5e9',
  plain: '#eab308',
  silk_road: '#ff8c00',
};

const BIOME_ICONS: Record<string, string> = {
  forest: '🌲',
  mountain: '⛰️',
  coast: '🌊',
  plain: '🌾',
  silk_road: '🐫',
};

const getHexPoints = (cx: number, cy: number, size: number): string => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = cx + size * Math.cos(angleRad);
    const y = cy + size * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

export const HexTile = ({ sector, tribe, building, highlight, justCaptured, onClick }: HexTileProps) => {
  const size = 50;
  const fillColor = tribe ? tribe.color : BIOME_COLORS[sector.type];
  const points = getHexPoints(sector.x, sector.y, size);

  const innerSize = size - 8;
  const innerPoints = getHexPoints(sector.x, sector.y, innerSize);

  const strokeColor = tribe ? tribe.color : '#ffffff';
  const strokeWidth = tribe ? 8 : 5;

  const glowSize = size + 6;
  const glowPoints = getHexPoints(sector.x, sector.y, glowSize);

  const pulseSize = size + 18;
  const pulsePoints = getHexPoints(sector.x, sector.y, pulseSize);

  // Диагностика: логируем запуск пульсации
  if (justCaptured) {
    console.log(`✨ ПУЛЬСАЦИЯ: сектор #${sector.id}, племя: ${tribe?.name}, цвет: ${tribe?.color}`);
  }

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* CSS-анимация пульсации через <style> */}
      {justCaptured && tribe && (
        <>
          <style>{`
            @keyframes pulseRing-${sector.id} {
              0%   { stroke-width: 4; opacity: 0.9; }
              50%  { stroke-width: 14; opacity: 0.4; }
              100% { stroke-width: 4; opacity: 0.9; }
            }
            @keyframes pulseFlash-${sector.id} {
              0%   { opacity: 0; }
              50%  { opacity: 0.7; }
              100% { opacity: 0; }
            }
          `}</style>
          {/* Внешнее пульсирующее кольцо */}
          <polygon
            points={pulsePoints}
            fill="none"
            stroke={tribe.color}
            strokeWidth="4"
            style={{
              pointerEvents: 'none',
              animation: `pulseRing-${sector.id} 0.8s ease-in-out 3`
            }}
          />
          {/* Внутренняя вспышка */}
          <polygon
            points={points}
            fill={tribe.color}
            style={{
              pointerEvents: 'none',
              animation: `pulseFlash-${sector.id} 0.8s ease-in-out 3`
            }}
          />
        </>
      )}

      {/* Подсветка доступной цели захвата */}
      {highlight && !justCaptured && (
        <polygon
          points={glowPoints}
          fill="none"
          stroke="#fde047"
          strokeWidth="4"
          strokeDasharray="8 5"
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-26"
            dur="1s"
            repeatCount="indefinite"
          />
        </polygon>
      )}

      {/* Тень */}
      <polygon
        points={points}
        fill="rgba(0,0,0,0.2)"
        transform="translate(3, 3)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Основной шестиугольник */}
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity="0.9"
      />

      {/* Внутренняя рамка */}
      <polygon
        points={innerPoints}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
        style={{ pointerEvents: 'none' }}
      />

      {/* Значок меча */}
      {highlight && !justCaptured && (
        <text
          x={sector.x + 30}
          y={sector.y - 30}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '16px', pointerEvents: 'none' }}
        >
          ⚔️
        </text>
      )}

      {/* Иконка биома */}
      {!building && (
        <text
          x={sector.x}
          y={sector.y - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '24px', pointerEvents: 'none' }}
        >
          {BIOME_ICONS[sector.type]}
        </text>
      )}

      {/* Иконка здания */}
      {building && (
        <text
          x={sector.x}
          y={sector.y - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '28px', pointerEvents: 'none' }}
        >
          {building.icon}
        </text>
      )}

      {/* Номер */}
      <text
        x={sector.x}
        y={sector.y + 22}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: '11px',
          fill: 'white',
          fontWeight: 'bold',
          pointerEvents: 'none',
          textShadow: '1px 1px 2px black'
        }}
      >
        #{sector.id}
      </text>
    </g>
  );
};
