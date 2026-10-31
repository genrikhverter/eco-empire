import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState,
  ResourceType,
  Building,
  BiomeType,
  GameEvent,
  Sector,
  Tribe,
  Monopoly,
  MonopolyKind,
  LogEntry,
  LogAction,
  SectorExchange,
} from '../types';

// Задания учителя храним как произвольные объекты, чтобы не зависеть от конкретной формы Assignment.
// Если у тебя есть export type Assignment in ../types, можно заменить на:
// type StoredAssignment = Assignment;
type StoredAssignment = any;

// === ТАБЛИЦА СВЯЗНОСТИ СЕКТОРОВ ===
export const ADJACENCY: Record<number, number[]> = {
  // СИБИРЬ
  0: [1, 4], 1: [0, 2, 4, 5], 2: [1, 3, 5, 6], 3: [2, 6, 7, 10],
  4: [0, 1, 5, 8], 5: [1, 2, 4, 6, 8, 9], 6: [2, 3, 5, 7, 9],
  7: [3, 6, 9, 12], 8: [4, 5, 9], 9: [5, 6, 7, 8, 14],
  // РУССКАЯ АМЕРИКА
  10: [3, 11, 12], 11: [10, 13, 18], 12: [7, 10, 13, 14], 13: [11, 12, 14, 15, 21],
  14: [9, 12, 15, 16], 15: [13, 14, 16, 17, 24], 16: [14, 15, 17], 17: [15, 16, 26],
  // ЗАКАВКАЗЬЕ И ТУРКЕСТАН
  18: [11, 19, 21], 19: [18, 20, 21, 22], 20: [19, 23], 21: [13, 18, 19, 22, 24],
  22: [19, 21, 23, 24, 25], 23: [20, 22, 25, 26], 24: [15, 21, 22, 25, 27],
  25: [22, 23, 24, 26, 27], 26: [17, 23, 25, 27], 27: [24, 25, 26],
};

// 🎛️ РЕГУЛЯТОР: на сколько пикселей сдвинуть ВСЮ карту вниз.
// Увеличь число — тайлы уйдут ниже заголовков. Уменьши — выше.
export const MAP_Y_SHIFT = 50;
// Снимок базовых связей ДО любых мутаций (expandMap / редактор) — для resetGame

const BASE_ADJACENCY = JSON.parse(JSON.stringify(ADJACENCY)) as Record<number, number[]>;
export const NEIGHBOR_MAX_DIST = 125;

export const isAdjacentSector = (a: Sector, b: Sector): boolean => {
  const neighbors = ADJACENCY[a.id];
  return neighbors ? neighbors.includes(b.id) : false;
};

export const getCaptureTargets = (
  sectors: Sector[],
  tribes: Tribe[],
  tribeId: string
): Set<number> => {
  void tribes;
  const ownedIds = new Set(sectors.filter((s) => s.ownerId === tribeId).map((s) => s.id));
  const result = new Set<number>();

  for (const ownedId of ownedIds) {
    const neighbors = ADJACENCY[ownedId];
    if (!neighbors) continue;
    for (const neighborId of neighbors) {
      const sector = sectors.find((s) => s.id === neighborId);
      if (sector && sector.ownerId === null) result.add(neighborId);
    }
  }
  return result;
};

export const REGION_BG_COLORS: Record<string, string> = {
  siberia: '#dcfce7',
  america: '#dbeafe',
  turkestan: '#fef3c7',
};

interface GameStore extends GameState {
  currentTribeId: string;
  lastIncome: Partial<Record<ResourceType, number>> | null;
  gameEnded: boolean;
  winnerId: string | null;
  lastSaved: number | null;
  bankToast: string | null;
  capturesThisTurn: number;
  expansionLevel: number;
  mapExpanded: boolean;
  incomeCollectedThisTurn: boolean;
  adjacencyVersion: number; // 🔄 растёт при изменении графа -> перерисовка линий


  moveSector: (id: number, x: number, y: number) => void; // 🧪 PoC: drag-координаты
  addEdge: (a: number, b: number) => boolean;    // 🔗 добавить связь
  removeEdge: (a: number, b: number) => boolean; // ✂️ удалить связь
  hasEdge: (a: number, b: number) => boolean;    // есть ли связь


  teacherAssignments: StoredAssignment[];
  setTeacherAssignments: (assignments: StoredAssignment[]) => void;
  addTeacherAssignment: (assignment: StoredAssignment) => void;
  updateTeacherAssignment: (id: string, patch: StoredAssignment) => void;
  removeTeacherAssignment: (id: string) => void;

  nextTurn: () => void;
  setCurrentTribe: (tribeId: string) => void;
  addResource: (tribeId: string, resource: ResourceType, amount: number) => void;
  captureSector: (sectorId: number) => boolean;
  buildBuilding: (sectorId: number, buildingId: string) => boolean;
  canAfford: (tribeId: string, buildingId: string) => boolean;
  collectIncome: (tribeId: string) => Partial<Record<ResourceType, number>>;
  rollDice: () => GameEvent | null;
  applyEvent: (eventId: string) => void;
  makeTrade: (fromTribeId: string, toTribeId: string, given: Partial<Record<ResourceType, number>>, received: Partial<Record<ResourceType, number>>) => boolean;
  checkGameEnd: () => boolean;
  endGame: () => void;
  refreshMonopolies: () => void;
  expandMap: () => boolean;
  addLog: (action: LogAction, details: string, tribeId?: string | null) => void;

  calculateSectorValue: (sectorId: number) => number;
  listSectorForSale: (sectorId: number, price: number) => boolean;
  cancelSectorListing: (listingId: string) => boolean;
  buySector: (listingId: string) => boolean;
  proposeSectorExchange: (sector1Id: number, sector2Id: number, additionalPayment?: { fromId: string; toId: string; amount: number }) => string | null;
  acceptSectorExchange: (exchangeId: string) => boolean;
  rejectSectorExchange: (exchangeId: string) => boolean;

  saveGame: () => void;
  loadGame: () => boolean;
  resetGame: () => void;
  exportToJSON: () => void;
  importFromJSON: (file: File) => Promise<boolean>;
}

const BIOME_BASE_INCOME: Record<BiomeType, Partial<Record<ResourceType, number>>> = {
  forest: { fur: 1 }, mountain: { ore: 1 }, coast: { food: 1 }, plain: { food: 1 }, silk_road: { money: 1 },
};

const buildingsCatalog: Building[] = [
  { id: 'fort', type: 'fort', name: 'Острог', icon: '', cost: { fur: 3, ore: 2 }, income: { fur: 2, food: 1 }, score: 2, allowedBiomes: null, description: 'Базовое поселение.' },
  { id: 'factory', type: 'factory', name: 'Фактория', icon: '🏪', cost: { fabric: 4, ore: 2 }, income: { money: 3 }, score: 3, allowedBiomes: ['forest', 'coast'], description: 'Торговый пост.' },
  { id: 'mission', type: 'mission', name: 'Миссия', icon: '⛪', cost: { fabric: 3, food: 3 }, income: {}, score: 2, allowedBiomes: null, description: 'Религиозный центр.' },
  { id: 'shipyard', type: 'shipyard', name: 'Верфь', icon: '🚢', cost: { ore: 5, fur: 3 }, income: { money: 2 }, score: 4, allowedBiomes: ['coast'], description: 'Строительство кораблей.' },
  { id: 'stable', type: 'stable', name: 'Конный двор', icon: '🐎', cost: { food: 4, fabric: 2 }, income: { fur: 2 }, score: 2, allowedBiomes: ['plain'], description: 'Разведение лошадей.' },
  { id: 'customs', type: 'customs', name: 'Таможня', icon: '🏛️', cost: { money: 5, ore: 3, fabric: 2 }, income: { money: 3 }, score: 5, allowedBiomes: ['silk_road'], description: 'Сбор пошлин.' },
  { id: 'caravanserai', type: 'caravanserai', name: 'Караван-сарай', icon: '', cost: { fabric: 4, food: 3 }, income: { money: 2 }, score: 4, allowedBiomes: ['plain', 'silk_road'], description: 'Гостиница для купцов.' },
];

const eventsCatalog: GameEvent[] = [
  { id: 'good_hunt', name: 'Удачная охота', description: 'Ваши охотники вернулись с богатой добычей!', icon: '', type: 'positive', effect: { fur: 3 } },
  { id: 'ore_discovery', name: 'Открытие месторождения', description: 'На ваших землях найдена руда!', icon: '⚒️', type: 'positive', effect: { ore: 3 } },
  { id: 'trade_caravan', name: 'Торговый караван', description: 'К вам прибыл торговый караван.', icon: '🐫', type: 'positive', effect: { fabric: 2, money: 2 } },
  { id: 'good_harvest', name: 'Богатый урожай', description: 'Урожай был особенно хорошим.', icon: '🌾', type: 'positive', effect: { food: 4 } },
  { id: 'imperial_grant', name: 'Императорская награда', description: 'Император отметил ваши заслуги.', icon: '💰', type: 'positive', effect: { money: 5 } },
  { id: 'harsh_winter', name: 'Суровая зима', description: 'Запасы провизии истощились.', icon: '❄️', type: 'negative', effect: { food: -3 } },
  { id: 'fur_price_drop', name: 'Падение цен на пушнину', description: 'Цены на пушнину упали.', icon: '📉', type: 'negative', effect: { money: -3 } },
  { id: 'bandit_raid', name: 'Набег разбойников', description: 'Разбойники украли ткани.', icon: '🏴‍☠️', type: 'negative', effect: { fabric: -2 } },
  { id: 'mine_collapse', name: 'Обвал в шахте', description: 'Произошёл обвал в шахте.', icon: '⚠️', type: 'negative', effect: { ore: -2 } },
  { id: 'epidemic', name: 'Эпидемия', description: 'Эпидемия распространилась среди работников.', icon: '🦠', type: 'negative', effect: { food: -2, fur: -1 } },
  { id: 'tax_audit', name: 'Налоговая ревизия', description: 'Чиновники наложили штраф.', icon: '📜', type: 'negative', effect: { money: -4 } },
  { id: 'neutral_weather', name: 'Обычная погода', description: 'Ничего особенного.', icon: '☀️', type: 'neutral', effect: {} },
];

const MAX_TURNS = 10;
const MAX_CAPTURES_PER_TURN = 2;
const MIN_FREE_SECTORS = 8;

// === КООРДИНАТЫ СЕКТОРОВ (Сдвинуты вниз: +40px по Y) ===
const initialGameState: GameState = {
  turn: 1,
  tribes: [
    { id: 't1', name: 'Артель Строгановых', color: '#4ade80', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [0], buildings: [], score: 0 },
    { id: 't2', name: 'Компания Шелихова', color: '#60a5fa', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [14], buildings: [], score: 0 },
    { id: 't3', name: 'Карабахские купцы', color: '#fbbf24', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [21], buildings: [], score: 0 },
    { id: 't4', name: 'Артель Демидовых', color: '#f87171', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [6], buildings: [], score: 0 },
  ],
  sectors: [
    // СИБИРЬ (y сдвинуты на +40)
    { id: 0, type: 'forest', ownerId: 't1', buildingId: null, x: 80, y: 120 },
    { id: 1, type: 'mountain', ownerId: null, buildingId: null, x: 190, y: 120 },
    { id: 2, type: 'mountain', ownerId: null, buildingId: null, x: 300, y: 120 },
    { id: 3, type: 'mountain', ownerId: null, buildingId: null, x: 410, y: 120 },
    { id: 4, type: 'forest', ownerId: null, buildingId: null, x: 135, y: 225 },
    { id: 5, type: 'plain', ownerId: null, buildingId: null, x: 245, y: 225 },
    { id: 6, type: 'mountain', ownerId: 't4', buildingId: null, x: 355, y: 225 },
    { id: 7, type: 'forest', ownerId: null, buildingId: null, x: 465, y: 225 },
    { id: 8, type: 'forest', ownerId: null, buildingId: null, x: 80, y: 330 },
    { id: 9, type: 'mountain', ownerId: null, buildingId: null, x: 190, y: 330 },

    // РУССКАЯ АМЕРИКА (y сдвинуты на +40)
    { id: 10, type: 'coast', ownerId: null, buildingId: null, x: 580, y: 120 },
    { id: 11, type: 'coast', ownerId: null, buildingId: null, x: 690, y: 120 },
    { id: 12, type: 'forest', ownerId: null, buildingId: null, x: 580, y: 225 },
    { id: 13, type: 'mountain', ownerId: null, buildingId: null, x: 690, y: 225 },
    { id: 14, type: 'coast', ownerId: 't2', buildingId: null, x: 580, y: 330 },
    { id: 15, type: 'forest', ownerId: null, buildingId: null, x: 690, y: 330 },
    { id: 16, type: 'coast', ownerId: null, buildingId: null, x: 580, y: 435 },
    { id: 17, type: 'mountain', ownerId: null, buildingId: null, x: 690, y: 435 },

    // ЗАКАВКАЗЬЕ И ТУРКЕСТАН (y сдвинуты на +40)
    { id: 18, type: 'silk_road', ownerId: null, buildingId: null, x: 860, y: 120 },
    { id: 19, type: 'plain', ownerId: null, buildingId: null, x: 970, y: 120 },
    { id: 20, type: 'mountain', ownerId: null, buildingId: null, x: 1080, y: 120 },
    { id: 21, type: 'silk_road', ownerId: 't3', buildingId: null, x: 860, y: 225 },
    { id: 22, type: 'plain', ownerId: null, buildingId: null, x: 970, y: 225 },
    { id: 23, type: 'forest', ownerId: null, buildingId: null, x: 1080, y: 225 },
    { id: 24, type: 'mountain', ownerId: null, buildingId: null, x: 860, y: 330 },
    { id: 25, type: 'silk_road', ownerId: null, buildingId: null, x: 970, y: 330 },
    { id: 26, type: 'coast', ownerId: null, buildingId: null, x: 1080, y: 330 },
    { id: 27, type: 'forest', ownerId: null, buildingId: null, x: 970, y: 435 },
  ],
  buildings: buildingsCatalog,
  events: eventsCatalog,
  trades: [],
  loans: [],
  deposits: [],
  shares: [],
  monopolies: [],
  awardedMonopolyKeys: [],
  lastEvent: null,
  expansionLevel: 0,
  logs: [],
  sectorListings: [],
  sectorExchanges: [],
  incomeCollectedThisTurn: false,
};

// Сдвигаем все стартовые тайлы вниз на MAP_Y_SHIFT
for (const s of initialGameState.sectors) {
  s.y += MAP_Y_SHIFT;
}

const REGION_DEFS = [
  { key: 'siberia', title: 'Сибирь', icon: '🌲', sectors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], scoreBonus: 8, moneyIncome: 3 },
  { key: 'america', title: 'Русская Америка', icon: '🌊', sectors: [10, 11, 12, 13, 14, 15, 16, 17], scoreBonus: 7, moneyIncome: 3 },
  { key: 'turkestan', title: 'Закавказье и Туркестан', icon: '🐫', sectors: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27], scoreBonus: 8, moneyIncome: 3 },
];

const BIOME_MONOPOLY_DEFS: Record<BiomeType, { title: string; icon: string; scoreBonus: number; moneyIncome: number; resourceIncome: Partial<Record<ResourceType, number>> }> = {
  forest: { title: 'Лесная монополия', icon: '🌲', scoreBonus: 4, moneyIncome: 1, resourceIncome: { fur: 1 } },
  mountain: { title: 'Рудная монополия', icon: '⛰️', scoreBonus: 4, moneyIncome: 1, resourceIncome: { ore: 1 } },
  coast: { title: 'Морская монополия', icon: '🌊', scoreBonus: 5, moneyIncome: 2, resourceIncome: { food: 1 } },
  plain: { title: 'Степная монополия', icon: '🌾', scoreBonus: 5, moneyIncome: 2, resourceIncome: { food: 1 } },
  silk_road: { title: 'Шёлковая монополия', icon: '🐫', scoreBonus: 6, moneyIncome: 2, resourceIncome: { money: 1 } },
};

const REGION_SECTOR_IDS: Record<string, number[]> = {};
for (const r of REGION_DEFS) REGION_SECTOR_IDS[r.key] = r.sectors;

const BIOME_SECTOR_IDS = {} as Record<BiomeType, number[]>;
for (const s of initialGameState.sectors) {
  if (!BIOME_SECTOR_IDS[s.type]) BIOME_SECTOR_IDS[s.type] = [];
  BIOME_SECTOR_IDS[s.type].push(s.id);
}



export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      currentTribeId: 't1',
      lastIncome: null,
      gameEnded: false,
      winnerId: null,
      lastSaved: null,
      bankToast: null,
      capturesThisTurn: 0,
      expansionLevel: 0,
      mapExpanded: false,
      incomeCollectedThisTurn: false,
      adjacencyVersion: 0,
      teacherAssignments: [],


      addLog: (action, details, tribeId = null) => {
        const state = get();
        const tribe = tribeId ? state.tribes.find((t) => t.id === tribeId) : null;
        const entry: LogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          turn: state.turn,
          tribeId,
          tribeName: tribe?.name || null,
          action,
          details,
          timestamp: Date.now(),
        };
        set((s) => ({ logs: [entry, ...s.logs].slice(0, 500) }));
      },

      collectIncome: (tribeId) => {
        const state = get();
        if (state.incomeCollectedThisTurn) return state.lastIncome || {};

        const tribe = state.tribes.find((t) => t.id === tribeId);
        if (!tribe) return {};
        const income: Partial<Record<ResourceType, number>> = {};

        for (const sectorId of tribe.sectors) {
          const sector = state.sectors.find((s) => s.id === sectorId);
          if (!sector) continue;
          const baseIncome = BIOME_BASE_INCOME[sector.type];
          for (const [resource, amount] of Object.entries(baseIncome)) {
            income[resource as ResourceType] = (income[resource as ResourceType] || 0) + (amount || 0);
          }
          if (sector.buildingId) {
            const building = state.buildings.find((b) => b.id === sector.buildingId);
            if (building) {
              for (const [resource, amount] of Object.entries(building.income)) {
                income[resource as ResourceType] = (income[resource as ResourceType] || 0) + (amount || 0);
              }
            }
          }
        }

        const monopolies = (state.monopolies || []).filter((m) => m.active && m.tribeId === tribeId);
        for (const m of monopolies) {
          income.money = (income.money || 0) + m.moneyIncome;
          if (m.resourceIncome) {
            for (const [resource, amount] of Object.entries(m.resourceIncome)) {
              income[resource as ResourceType] = (income[resource as ResourceType] || 0) + (amount || 0);
            }
          }
        }

        set((s) => ({
          tribes: s.tribes.map((t) => {
            if (t.id !== tribeId) return t;
            const newResources = { ...t.resources };
            for (const [resource, amount] of Object.entries(income)) {
              newResources[resource as ResourceType] += amount || 0;
            }
            return { ...t, resources: newResources };
          }),
          lastIncome: income,
          incomeCollectedThisTurn: true,
        }));
        get().saveGame();
        return income;
      },

      rollDice: () => {
        const state = get();
        if (Math.floor(Math.random() * 6) + 1 <= 3) return null;
        return state.events[Math.floor(Math.random() * state.events.length)];
      },

      applyEvent: (eventId) => {
        const state = get();
        const event = state.events.find((e) => e.id === eventId);
        if (!event) return;
        const targetTribe = state.tribes.find((t) => t.id === state.currentTribeId);
        if (!targetTribe) return;

        const newResources = { ...targetTribe.resources };
        for (const [resource, amount] of Object.entries(event.effect)) {
          newResources[resource as ResourceType] = Math.max(0, newResources[resource as ResourceType] + (amount || 0));
        }

        set({
          tribes: state.tribes.map((t) => t.id === state.currentTribeId ? { ...t, resources: newResources } : t),
          lastEvent: event,
        });

        const RESOURCE_NAMES: Record<string, string> = { fur: '🦊', ore: '⚒️', fabric: '🧵', food: '🍞', money: '💰' };
        const effectStr = Object.entries(event.effect).map(([r, a]) => `${RESOURCE_NAMES[r]}${(a || 0) > 0 ? '+' : ''}${a}`).join(' ') || '—';
        get().addLog('event', `${event.icon} ${event.name}: ${effectStr}`, state.currentTribeId);
        get().saveGame();
      },

      makeTrade: (fromTribeId, toTribeId, given, received) => {
        const state = get();
        const fromTribe = state.tribes.find((t) => t.id === fromTribeId);
        const toTribe = state.tribes.find((t) => t.id === toTribeId);
        if (!fromTribe || !toTribe) return false;

        for (const [r, a] of Object.entries(given)) if (fromTribe.resources[r as ResourceType] < (a || 0)) return false;
        for (const [r, a] of Object.entries(received)) if (toTribe.resources[r as ResourceType] < (a || 0)) return false;

        const newFrom = { ...fromTribe.resources };
        const newTo = { ...toTribe.resources };
        for (const [r, a] of Object.entries(given)) { newFrom[r as ResourceType] -= (a || 0); newTo[r as ResourceType] += (a || 0); }
        for (const [r, a] of Object.entries(received)) { newTo[r as ResourceType] -= (a || 0); newFrom[r as ResourceType] += (a || 0); }

        set({
          tribes: state.tribes.map((t) => {
            if (t.id === fromTribeId) return { ...t, resources: newFrom };
            if (t.id === toTribeId) return { ...t, resources: newTo };
            return t;
          }),
          trades: [...state.trades, { id: `trade_${Date.now()}`, turn: state.turn, fromTribeId, toTribeId, given, received }],
        });

        const RESOURCE_NAMES: Record<string, string> = { fur: '🦊', ore: '⚒️', fabric: '', food: '🍞', money: '💰' };
        const gStr = Object.entries(given).map(([r, a]) => `${RESOURCE_NAMES[r]}${a}`).join(' ');
        const rStr = Object.entries(received).map(([r, a]) => `${RESOURCE_NAMES[r]}${a}`).join(' ');
        get().addLog('trade', `↔ ${toTribe.name}: отдал ${gStr}, получил ${rStr}`, fromTribeId);
        get().saveGame();
        return true;
      },

      nextTurn: () => {
        const state = get();
        if (state.gameEnded) return;
        if (state.turn >= MAX_TURNS) { get().endGame(); return; }

        const tribeIds = state.tribes.map((t) => t.id);
        const nextIndex = (tribeIds.indexOf(state.currentTribeId) + 1) % tribeIds.length;
        const nextTribeId = tribeIds[nextIndex];
        const newTurn = nextTribeId === 't1' ? state.turn + 1 : state.turn;

        set({
          turn: newTurn,
          currentTribeId: nextTribeId,
          capturesThisTurn: 0,
          incomeCollectedThisTurn: false,
        });
        get().addLog('turn_start', `Ход ${newTurn}: начинает ${state.tribes.find(t => t.id === nextTribeId)?.name}`, nextTribeId);
        if (get().checkGameEnd()) get().endGame();
        get().saveGame();
      },

      checkGameEnd: () => {
        const state = get();
        if (state.turn >= MAX_TURNS) return true;
        if (state.sectors.every((s) => s.ownerId !== null)) return true;
        return false;
      },

      endGame: () => {
        const state = get();
        const winner = state.tribes.reduce((max, t) => t.score > max.score ? t : max);
        set({ gameEnded: true, winnerId: winner.id });
        get().saveGame();
      },
      moveSector: (id, x, y) => {
        set((s) => ({
          sectors: s.sectors.map((sec) =>
            sec.id === id ? { ...sec, x: Math.round(x), y: Math.round(y) } : sec
          ),
        }));
        get().saveGame();
      },

      hasEdge: (a, b) => {
        const na = ADJACENCY[a];
        return !!na && na.includes(b);
      },

      addEdge: (a, b) => {
        if (a === b) return false;
        const sa = get().sectors.find((s) => s.id === a);
        const sb = get().sectors.find((s) => s.id === b);
        if (!sa || !sb) return false;
        if (!ADJACENCY[a]) (ADJACENCY as Record<number, number[]>)[a] = [];
        if (!ADJACENCY[b]) (ADJACENCY as Record<number, number[]>)[b] = [];
        if (ADJACENCY[a].includes(b)) return false;
        ADJACENCY[a].push(b);
        ADJACENCY[b].push(a);
        set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));
        get().saveGame();
        return true;
      },

      removeEdge: (a, b) => {
        const na = ADJACENCY[a];
        if (!na || !na.includes(b)) return false;
        (ADJACENCY as Record<number, number[]>)[a] = na.filter((x) => x !== b);
        const nb = ADJACENCY[b];
        if (nb) (ADJACENCY as Record<number, number[]>)[b] = nb.filter((x) => x !== a);
        set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));
        get().saveGame();
        return true;
      },

      setTeacherAssignments: (assignments) => {
        set({ teacherAssignments: Array.isArray(assignments) ? assignments : [] });
        get().saveGame();
      },

      addTeacherAssignment: (assignment) => {
        set((s) => ({
          teacherAssignments: [...s.teacherAssignments, assignment],
        }));
        get().saveGame();
      },

      updateTeacherAssignment: (id, patch) => {
        set((s) => ({
          teacherAssignments: s.teacherAssignments.map((a) =>
            a && a.id === id ? { ...a, ...patch } : a
          ),
        }));
        get().saveGame();
      },

      removeTeacherAssignment: (id) => {
        set((s) => ({
          teacherAssignments: s.teacherAssignments.filter((a) => !a || a.id !== id),
        }));
        get().saveGame();
      },


      setCurrentTribe: (tribeId) => { set({ currentTribeId: tribeId, capturesThisTurn: 0 }); get().saveGame(); },
      addResource: (tribeId, resource, amount) => {
        set((s) => ({ tribes: s.tribes.map((t) => t.id === tribeId ? { ...t, resources: { ...t.resources, [resource]: t.resources[resource] + amount } } : t) }));
        get().saveGame();
      },

      captureSector: (sectorId) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        if (!sector || sector.ownerId !== null) return false;

        const validTargets = getCaptureTargets(state.sectors, state.tribes, state.currentTribeId);
        if (!validTargets.has(sectorId)) return false;

        if (state.capturesThisTurn >= MAX_CAPTURES_PER_TURN) return false;
        if (state.sectors.filter((s) => s.ownerId === null).length - 1 < MIN_FREE_SECTORS) return false;

        set({
          sectors: state.sectors.map((s) => s.id === sectorId ? { ...s, ownerId: state.currentTribeId } : s),
          tribes: state.tribes.map((t) => t.id === state.currentTribeId ? { ...t, sectors: [...t.sectors, sectorId] } : t),
          capturesThisTurn: state.capturesThisTurn + 1,
        });
        get().addLog('capture', `️ Захватил сектор #${sectorId} (${sector.type})`, state.currentTribeId);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      canAfford: (tribeId, buildingId) => {
        const state = get();
        const tribe = state.tribes.find((t) => t.id === tribeId);
        const building = state.buildings.find((b) => b.id === buildingId);
        if (!tribe || !building) return false;
        for (const [r, a] of Object.entries(building.cost)) if (tribe.resources[r as ResourceType] < (a || 0)) return false;
        return true;
      },

      buildBuilding: (sectorId, buildingId) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        const building = state.buildings.find((b) => b.id === buildingId);
        if (!sector || !building || sector.ownerId !== state.currentTribeId || sector.buildingId) return false;
        if (building.allowedBiomes && !building.allowedBiomes.includes(sector.type)) return false;

        const tribe = state.tribes.find((t) => t.id === state.currentTribeId);
        if (!tribe) return false;
        for (const [r, a] of Object.entries(building.cost)) if (tribe.resources[r as ResourceType] < (a || 0)) return false;

        const newRes = { ...tribe.resources };
        for (const [r, a] of Object.entries(building.cost)) newRes[r as ResourceType] -= (a || 0);

        set({
          sectors: state.sectors.map((s) => s.id === sectorId ? { ...s, buildingId } : s),
          tribes: state.tribes.map((t) => t.id === state.currentTribeId ? { ...t, resources: newRes, buildings: [...t.buildings, buildingId], score: t.score + building.score } : t),
        });
        get().addLog('build', `🏗️ Построил ${building.icon} ${building.name} в секторе #${sectorId} (+${building.score} ОИ)`, state.currentTribeId);
        get().saveGame();
        return true;
      },

      refreshMonopolies: () => {
        const state = get();
        const oldMonopolies = state.monopolies || [];
        const awarded = new Set(state.awardedMonopolyKeys || []);
        const records: Monopoly[] = oldMonopolies.map((m) => ({ ...m }));
        const messages: string[] = [];
        const scoreByTribe: Record<string, number> = {};
        const logMessages: { tribeId: string; title: string; icon: string; score: number }[] = [];

        const ownerOfAll = (ids: number[]): string | null => {
          if (!ids.length) return null;
          const first = state.sectors.find((s) => s.id === ids[0]);
          if (!first || !first.ownerId) return null;
          return ids.every((id) => state.sectors.find((s) => s.id === id)?.ownerId === first.ownerId) ? first.ownerId : null;
        };

        for (const rec of records) {
          const ids = rec.kind === 'region' ? REGION_SECTOR_IDS[rec.key] : BIOME_SECTOR_IDS[rec.key as BiomeType];
          rec.active = !!ids && ownerOfAll(ids) === rec.tribeId;
        }

        const tryAward = (kind: MonopolyKind, key: string, ids: number[], title: string, icon: string, scoreBonus: number, moneyIncome: number, resourceIncome?: Partial<Record<ResourceType, number>>) => {
          const monoKey = `${kind}:${key}`;
          if (awarded.has(monoKey)) return;
          const owner = ownerOfAll(ids);
          if (!owner) return;
          records.push({ id: `mono_${monoKey}_${Date.now()}`, tribeId: owner, kind, key, title, icon, scoreBonus, moneyIncome, resourceIncome, awardedTurn: state.turn, active: true });
          awarded.add(monoKey);
          scoreByTribe[owner] = (scoreByTribe[owner] || 0) + scoreBonus;
          logMessages.push({ tribeId: owner, title, icon, score: scoreBonus });
          messages.push(`🏆 ${state.tribes.find(t => t.id === owner)?.name}: монополия «${title}»! +${scoreBonus} ОИ`);
        };

        for (const def of REGION_DEFS) tryAward('region', def.key, def.sectors, def.title, def.icon, def.scoreBonus, def.moneyIncome);
        for (const biome of Object.keys(BIOME_SECTOR_IDS) as BiomeType[]) {
          const def = BIOME_MONOPOLY_DEFS[biome];
          tryAward('biome', biome, BIOME_SECTOR_IDS[biome], def.title, def.icon, def.scoreBonus, def.moneyIncome, def.resourceIncome);
        }

        if (messages.length > 0 || records.some((r, i) => r.active !== oldMonopolies[i]?.active)) {
          set({
            tribes: state.tribes.map((t) => scoreByTribe[t.id] ? { ...t, score: t.score + scoreByTribe[t.id] } : t),
            monopolies: records,
            awardedMonopolyKeys: Array.from(awarded),
            ...(messages.length > 0 ? { bankToast: messages.join('\n') } : {}),
          });
        }
        for (const m of logMessages) get().addLog('monopoly', `${m.icon} Монополия «${m.title}» (+${m.score} ОИ)`, m.tribeId);
      },

      expandMap: () => {
        const state = get();
        const level = state.expansionLevel;
        const startId = state.sectors.length;
        const baseX = 1200 + level * 280;

        // Координаты новых тайлов также сдвинуты вниз (согласованы с основной картой)


        const extra: Sector[] = [
          { id: startId,     type: 'forest',    ownerId: null, buildingId: null, x: baseX,       y: 60  + MAP_Y_SHIFT },
          { id: startId + 1, type: 'mountain',  ownerId: null, buildingId: null, x: baseX + 110, y: 60  + MAP_Y_SHIFT },
          { id: startId + 2, type: 'coast',     ownerId: null, buildingId: null, x: baseX,       y: 185 + MAP_Y_SHIFT },
          { id: startId + 3, type: 'forest',    ownerId: null, buildingId: null, x: baseX + 110, y: 185 + MAP_Y_SHIFT },
          { id: startId + 4, type: 'silk_road', ownerId: null, buildingId: null, x: baseX,       y: 310 + MAP_Y_SHIFT },
          { id: startId + 5, type: 'plain',     ownerId: null, buildingId: null, x: baseX + 110, y: 310 + MAP_Y_SHIFT },
          { id: startId + 6, type: 'mountain',  ownerId: null, buildingId: null, x: baseX + 55,  y: 122 + MAP_Y_SHIFT },
          { id: startId + 7, type: 'coast',     ownerId: null, buildingId: null, x: baseX + 55,  y: 248 + MAP_Y_SHIFT },
        ];

        const newAdj: Record<number, number[]> = {};
        newAdj[startId] = [startId + 1, startId + 6];
        newAdj[startId + 1] = [startId, startId + 6];
        newAdj[startId + 2] = [startId + 3, startId + 6, startId + 7];
        newAdj[startId + 3] = [startId + 2, startId + 6, startId + 7];
        newAdj[startId + 4] = [startId + 5, startId + 7];
        newAdj[startId + 5] = [startId + 4, startId + 7];
        newAdj[startId + 6] = [startId, startId + 1, startId + 2, startId + 3, startId + 7];
        newAdj[startId + 7] = [startId + 2, startId + 3, startId + 4, startId + 5, startId + 6];

        if (level === 0) {
          newAdj[startId].push(3); newAdj[startId + 1].push(7);
          newAdj[startId + 2].push(11); newAdj[startId + 3].push(15);
          newAdj[startId + 4].push(20); newAdj[startId + 5].push(23);
        } else {
          const prev = startId - 8;
          newAdj[startId].push(prev + 1); newAdj[startId + 2].push(prev + 3);
          newAdj[startId + 4].push(prev + 5); newAdj[startId + 6].push(prev + 6);
          newAdj[startId + 7].push(prev + 7);
        }

        for (const [id, neighbors] of Object.entries(newAdj)) {
          const numId = Number(id);
          (ADJACENCY as Record<number, number[]>)[numId] = neighbors;
          for (const nId of neighbors) {
            if (!ADJACENCY[nId]) (ADJACENCY as Record<number, number[]>)[nId] = [];
            if (!ADJACENCY[nId].includes(numId)) ADJACENCY[nId].push(numId);
          }
        }

        set({ sectors: [...state.sectors, ...extra], expansionLevel: level + 1 });
        get().addLog('capture', `🗺️ Карта расширена! +8 тайлов (всего: ${state.sectors.length + 8}). Уровень: ${level + 1}`, null);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      calculateSectorValue: (sectorId) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        if (!sector) return 0;
        const BIOME_VALUES: Record<BiomeType, number> = { forest: 5, mountain: 5, coast: 7, plain: 5, silk_road: 8 };
        let value = BIOME_VALUES[sector.type];
        if (sector.buildingId) {
          const b = state.buildings.find((x) => x.id === sector.buildingId);
          if (b) value += b.score * 2;
        }
        if (state.monopolies.some((m) => m.tribeId === sector.ownerId && m.active)) value += 3;
        return Math.round(value);
      },

      listSectorForSale: (sectorId, price) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        if (!sector || sector.ownerId !== state.currentTribeId || price <= 0) return false;
        if (state.sectorListings.some((l) => l.sectorId === sectorId && l.active)) return false;
        set({ sectorListings: [...state.sectorListings, { id: `listing_${Date.now()}`, sectorId, sellerId: state.currentTribeId, price, listedTurn: state.turn, active: true }] });
        get().addLog('sector_sale', `🏷️ Выставил сектор #${sectorId} на продажу за 💰${price}`, state.currentTribeId);
        get().saveGame();
        return true;
      },

      cancelSectorListing: (listingId) => {
        const state = get();
        const listing = state.sectorListings.find((l) => l.id === listingId);
        if (!listing || listing.sellerId !== state.currentTribeId) return false;
        set({ sectorListings: state.sectorListings.map((l) => l.id === listingId ? { ...l, active: false } : l) });
        get().addLog('sector_sale', `❌ Снял с продажи сектор #${listing.sectorId}`, state.currentTribeId);
        get().saveGame();
        return true;
      },

      buySector: (listingId) => {
        const state = get();
        const listing = state.sectorListings.find((l) => l.id === listingId && l.active);
        if (!listing) return false;
        const buyer = state.tribes.find((t) => t.id === state.currentTribeId);
        const seller = state.tribes.find((t) => t.id === listing.sellerId);
        if (!buyer || !seller || buyer.resources.money < listing.price) return false;

        set({
          tribes: state.tribes.map((t) => {
            if (t.id === buyer.id) return { ...t, resources: { ...t.resources, money: t.resources.money - listing.price }, sectors: [...t.sectors, listing.sectorId] };
            if (t.id === seller.id) return { ...t, resources: { ...t.resources, money: t.resources.money + listing.price }, sectors: t.sectors.filter((id) => id !== listing.sectorId) };
            return t;
          }),
          sectors: state.sectors.map((s) => s.id === listing.sectorId ? { ...s, ownerId: buyer.id } : s),
          sectorListings: state.sectorListings.map((l) => l.id === listingId ? { ...l, active: false } : l),
        });
        get().addLog('sector_sale', `💰 Купил сектор #${listing.sectorId} у ${seller.name} за 💰${listing.price}`, buyer.id);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      proposeSectorExchange: (sector1Id, sector2Id, additionalPayment) => {
        const state = get();
        const s1 = state.sectors.find((s) => s.id === sector1Id);
        const s2 = state.sectors.find((s) => s.id === sector2Id);
        if (!s1 || !s2 || s1.ownerId !== state.currentTribeId || !s2.ownerId) return null;
        const exchange: SectorExchange = {
          id: `exchange_${Date.now()}`, sector1Id, sector2Id,
          owner1Id: s1.ownerId!, owner2Id: s2.ownerId,
          additionalPayment, status: 'pending', createdTurn: state.turn,
        };
        set({ sectorExchanges: [...state.sectorExchanges, exchange] });
        get().addLog('sector_exchange', `🔄 Предложил обмен: #${sector1Id} ↔ #${sector2Id}`, state.currentTribeId);
        get().saveGame();
        return exchange.id;
      },

      acceptSectorExchange: (exchangeId) => {
        const state = get();
        const ex = state.sectorExchanges.find((e) => e.id === exchangeId);
        if (!ex || ex.status !== 'pending' || ex.owner2Id !== state.currentTribeId) return false;
        if (ex.additionalPayment) {
          const payer = state.tribes.find((t) => t.id === ex.additionalPayment!.fromId);
          if (!payer || payer.resources.money < ex.additionalPayment.amount) return false;
        }
        set({
          sectors: state.sectors.map((s) => {
            if (s.id === ex.sector1Id) return { ...s, ownerId: ex.owner2Id };
            if (s.id === ex.sector2Id) return { ...s, ownerId: ex.owner1Id };
            return s;
          }),
          tribes: state.tribes.map((t) => {
            if (t.id === ex.owner1Id) return { ...t, sectors: [...t.sectors.filter((id) => id !== ex.sector1Id), ex.sector2Id] };
            if (t.id === ex.owner2Id) return { ...t, sectors: [...t.sectors.filter((id) => id !== ex.sector2Id), ex.sector1Id] };
            return t;
          }),
          sectorExchanges: state.sectorExchanges.map((e) => e.id === exchangeId ? { ...e, status: 'accepted' } : e),
        });
        if (ex.additionalPayment) {
          set((s) => ({
            tribes: s.tribes.map((t) => {
              if (t.id === ex.additionalPayment!.fromId) return { ...t, resources: { ...t.resources, money: t.resources.money - ex.additionalPayment!.amount } };
              if (t.id === ex.additionalPayment!.toId) return { ...t, resources: { ...t.resources, money: t.resources.money + ex.additionalPayment!.amount } };
              return t;
            }),
          }));
        }
        get().addLog('sector_exchange', `✅ Обмен: #${ex.sector1Id} ↔ #${ex.sector2Id}`, ex.owner1Id);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      rejectSectorExchange: (exchangeId) => {
        const state = get();
        const ex = state.sectorExchanges.find((e) => e.id === exchangeId);
        if (!ex || ex.status !== 'pending' || ex.owner2Id !== state.currentTribeId) return false;
        set({ sectorExchanges: state.sectorExchanges.map((e) => e.id === exchangeId ? { ...e, status: 'rejected' } : e) });
        get().addLog('sector_exchange', `❌ Отклонил обмен #${ex.sector1Id} ↔ #${ex.sector2Id}`, state.currentTribeId);
        get().saveGame();
        return true;
      },

      saveGame: () => {
        const state = get();

        const savePayload = {
          turn: state.turn,
          tribes: state.tribes,
          sectors: state.sectors,
          trades: state.trades,
          loans: state.loans,
          deposits: state.deposits,
          shares: state.shares,
          monopolies: state.monopolies,
          awardedMonopolyKeys: state.awardedMonopolyKeys,
          currentTribeId: state.currentTribeId,
          gameEnded: state.gameEnded,
          winnerId: state.winnerId,
          capturesThisTurn: state.capturesThisTurn,
          expansionLevel: state.expansionLevel,
          logs: state.logs,
          sectorListings: state.sectorListings,
          sectorExchanges: state.sectorExchanges,
          incomeCollectedThisTurn: state.incomeCollectedThisTurn,

          // 💾 Сохраняем граф связей: базовые соседи, мосты, связи созданные учителем
          adjacency: JSON.parse(JSON.stringify(ADJACENCY)),

          // 💾 Сохраняем задания, сделанные учителем
          teacherAssignments: state.teacherAssignments || [],

          savedAt: new Date().toLocaleString('ru-RU'),
        };

        localStorage.setItem('eco-empire-save', JSON.stringify(savePayload));

        // Для совместимости со старыми версиями TeacherPanel, если он читает отдельный ключ
        try {
          localStorage.setItem(
            'eco-empire-assignments',
            JSON.stringify(state.teacherAssignments || [])
          );
        } catch {
          // ignore
        }

        set({ lastSaved: Date.now() });
      },
      loadGame: () => {
        const saved = localStorage.getItem('eco-empire-save');
        if (!saved) return false;

        try {
          const data = JSON.parse(saved);

          // Загружаем задания учителя из основного сейва
          let assignments: StoredAssignment[] = Array.isArray(data.teacherAssignments)
            ? data.teacherAssignments
            : [];

          // Если в основном сейве заданий нет, пробуем мигрировать из старого отдельного ключа
          if (assignments.length === 0) {
            try {
              const legacy = localStorage.getItem('eco-empire-assignments');
              if (legacy) {
                const parsedLegacy = JSON.parse(legacy);
                if (Array.isArray(parsedLegacy)) {
                  assignments = parsedLegacy;
                }
              }
            } catch {
              // ignore
            }
          }

          set({
            turn: data.turn,
            tribes: data.tribes,
            sectors: data.sectors,
            trades: data.trades || [],
            loans: data.loans || [],
            deposits: data.deposits || [],
            shares: data.shares || [],
            monopolies: data.monopolies || [],
            awardedMonopolyKeys: data.awardedMonopolyKeys || [],
            currentTribeId: data.currentTribeId,
            gameEnded: data.gameEnded || false,
            winnerId: data.winnerId || null,
            capturesThisTurn: data.capturesThisTurn || 0,
            expansionLevel: data.expansionLevel || 0,
            logs: data.logs || [],
            sectorListings: data.sectorListings || [],
            sectorExchanges: data.sectorExchanges || [],
            incomeCollectedThisTurn: data.incomeCollectedThisTurn || false,
            teacherAssignments: assignments,
            lastSaved: Date.now(),
          });

          // Восстанавливаем граф связей
          if (data.adjacency) {
            for (const k of Object.keys(ADJACENCY)) {
              delete (ADJACENCY as Record<number, number[]>)[Number(k)];
            }

            for (const [k, v] of Object.entries(data.adjacency as Record<number, number[]>)) {
              (ADJACENCY as Record<number, number[]>)[Number(k)] = Array.isArray(v) ? [...v] : [];
            }

            set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));
          } else {
            // Старый сейв без adjacency — возвращаем базовые связи, чтобы не осталось мусора из памяти
            for (const k of Object.keys(ADJACENCY)) {
              delete (ADJACENCY as Record<number, number[]>)[Number(k)];
            }

            for (const [k, v] of Object.entries(BASE_ADJACENCY)) {
              (ADJACENCY as Record<number, number[]>)[Number(k)] = [...v];
            }

            set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));
          }

          get().refreshMonopolies();
          return true;
        } catch {
          return false;
        }
      },

      resetGame: () => {
        const preservedAssignments = get().teacherAssignments || [];

        set({
          ...initialGameState,
          currentTribeId: 't1',
          lastIncome: null,
          gameEnded: false,
          winnerId: null,
          bankToast: null,
          capturesThisTurn: 0,
          expansionLevel: 0,
          logs: [],
          sectorListings: [],
          sectorExchanges: [],
          incomeCollectedThisTurn: false,

          // Задания учителя переживают сброс партии
          teacherAssignments: preservedAssignments,
        });

        // Сбрасываем граф связей к базовому эталону
        for (const k of Object.keys(ADJACENCY)) {
          delete (ADJACENCY as Record<number, number[]>)[Number(k)];
        }

        for (const [k, v] of Object.entries(BASE_ADJACENCY)) {
          (ADJACENCY as Record<number, number[]>)[Number(k)] = [...v];
        }

        set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));

        get().saveGame();
      },

      exportToJSON: () => {
        const state = get();

        const payload = {
          version: '1.1',
          exportedAt: new Date().toISOString(),
          ...state,

          // Явно добавляем граф связей, потому что ADJACENCY живёт вне state
          adjacency: JSON.parse(JSON.stringify(ADJACENCY)),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eco-empire-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      importFromJSON: async (file) => {
        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (!data.tribes || !data.sectors) return false;

          // Убираем adjacency из stateData, потому что это не поле стора, а внешний граф
          const { adjacency, ...stateData } = data;

          set({
            ...stateData,
            lastSaved: Date.now(),
          });

          // Восстанавливаем граф связей
          if (adjacency) {
            for (const k of Object.keys(ADJACENCY)) {
              delete (ADJACENCY as Record<number, number[]>)[Number(k)];
            }

            for (const [k, v] of Object.entries(adjacency as Record<number, number[]>)) {
              (ADJACENCY as Record<number, number[]>)[Number(k)] = Array.isArray(v) ? [...v] : [];
            }

            set((s) => ({ adjacencyVersion: s.adjacencyVersion + 1 }));
          }

          // Если в импорте есть задания учителя — они уже попадут в set через stateData.
          // На всякий случай нормализуем:
          if (Array.isArray(data.teacherAssignments)) {
            set({ teacherAssignments: data.teacherAssignments });
          }

          get().refreshMonopolies();
          get().saveGame();
          return true;
        } catch {
          return false;
        }
      },


    }),
    { name: 'eco-empire-storage' }
  )
);

if (typeof window !== 'undefined') {
  (window as any).useGameStore = useGameStore;
}
