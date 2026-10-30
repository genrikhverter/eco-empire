import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState,
  ResourceType,
  Building,
  BiomeType,
  GameEvent,
  Trade,
  Sector,
  Tribe,
  Monopoly,
  MonopolyKind,
  LogEntry,
  LogAction,
} from '../types';

export const NEIGHBOR_MAX_DIST = 90;

export const isAdjacentSector = (a: Sector, b: Sector): boolean => {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d > 0 && d <= NEIGHBOR_MAX_DIST;
};

export const getCaptureTargets = (
  sectors: Sector[],
  tribes: Tribe[],
  tribeId: string
): Set<number> => {
  void tribes;
  const owned = sectors.filter((s) => s.ownerId === tribeId);
  const result = new Set<number>();
  for (const s of sectors) {
    if (s.ownerId !== null) continue;
    if (owned.some((o) => isAdjacentSector(o, s))) result.add(s.id);
  }
  return result;
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
  nextTurn: () => void;
  setCurrentTribe: (tribeId: string) => void;
  addResource: (tribeId: string, resource: ResourceType, amount: number) => void;
  captureSector: (sectorId: number) => boolean;
  buildBuilding: (sectorId: number, buildingId: string) => boolean;
  canAfford: (tribeId: string, buildingId: string) => boolean;
  collectIncome: (tribeId: string) => Partial<Record<ResourceType, number>>;
  rollDice: () => GameEvent | null;
  applyEvent: (eventId: string) => void;
  makeTrade: (
    fromTribeId: string,
    toTribeId: string,
    given: Partial<Record<ResourceType, number>>,
    received: Partial<Record<ResourceType, number>>
  ) => boolean;
  checkGameEnd: () => boolean;
  endGame: () => void;
  refreshMonopolies: () => void;
  expandMap: () => boolean;
  addLog: (action: LogAction, details: string, tribeId?: string | null) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  resetGame: () => void;
  exportToJSON: () => void;
  importFromJSON: (file: File) => Promise<boolean>;
}

const BIOME_BASE_INCOME: Record<BiomeType, Partial<Record<ResourceType, number>>> = {
  forest: { fur: 1 },
  mountain: { ore: 1 },
  coast: { food: 1 },
  plain: { food: 1 },
  silk_road: { money: 1 },
};

const buildingsCatalog: Building[] = [
  {
    id: 'fort', type: 'fort', name: 'Острог', icon: '🏰',
    cost: { fur: 3, ore: 2 }, income: { fur: 2, food: 1 }, score: 2,
    allowedBiomes: null,
    description: 'Базовое поселение. Можно строить где угодно.'
  },
  {
    id: 'factory', type: 'factory', name: 'Фактория', icon: '🏪',
    cost: { fabric: 4, ore: 2 }, income: { money: 3 }, score: 3,
    allowedBiomes: ['forest', 'coast'],
    description: 'Торговый пост. Только в Тайге или на Побережье.'
  },
  {
    id: 'mission', type: 'mission', name: 'Миссия', icon: '⛪',
    cost: { fabric: 3, food: 3 }, income: {}, score: 2,
    allowedBiomes: null,
    description: 'Даёт +1 ОИ за каждое соседнее здание.'
  },
  {
    id: 'shipyard', type: 'shipyard', name: 'Верфь', icon: '🚢',
    cost: { ore: 5, fur: 3 }, income: { money: 2 }, score: 4,
    allowedBiomes: ['coast'],
    description: 'Строительство кораблей. Только на Побережье.'
  },
  {
    id: 'stable', type: 'stable', name: 'Конный двор', icon: '🐎',
    cost: { food: 4, fabric: 2 }, income: { fur: 2 }, score: 2,
    allowedBiomes: ['plain'],
    description: 'Разведение лошадей. Только в Степи.'
  },
  {
    id: 'customs', type: 'customs', name: 'Таможня', icon: '🏛️',
    cost: { money: 5, ore: 3, fabric: 2 }, income: { money: 3 }, score: 5,
    allowedBiomes: ['silk_road'],
    description: 'Сбор пошлин. Только на Шёлковом пути.'
  },
  {
    id: 'caravanserai', type: 'caravanserai', name: 'Караван-сарай', icon: '🐫',
    cost: { fabric: 4, food: 3 }, income: { money: 2 }, score: 4,
    allowedBiomes: ['plain', 'silk_road'],
    description: 'Гостиница для купцов. В Степи или на Шёлковом пути.'
  },
];

const eventsCatalog: GameEvent[] = [
  { id: 'good_hunt', name: 'Удачная охота', description: 'Ваши охотники вернулись с богатой добычей!', icon: '🦊', type: 'positive', effect: { fur: 3 } },
  { id: 'ore_discovery', name: 'Открытие месторождения', description: 'На ваших землях найдена руда!', icon: '⚒️', type: 'positive', effect: { ore: 3 } },
  { id: 'trade_caravan', name: 'Торговый караван', description: 'К вам прибыл торговый караван из далёких земель.', icon: '🐫', type: 'positive', effect: { fabric: 2, money: 2 } },
  { id: 'good_harvest', name: 'Богатый урожай', description: 'В этом году урожай был особенно хорошим.', icon: '🌾', type: 'positive', effect: { food: 4 } },
  { id: 'imperial_grant', name: 'Императорская награда', description: 'Император отметил ваши заслуги денежной наградой.', icon: '💰', type: 'positive', effect: { money: 5 } },
  { id: 'harsh_winter', name: 'Суровая зима', description: 'Зима была суровой, запасы провизии истощились.', icon: '❄️', type: 'negative', effect: { food: -3 } },
  { id: 'fur_price_drop', name: 'Падение цен на пушнину', description: 'На европейских рынках упали цены на пушнину.', icon: '📉', type: 'negative', effect: { money: -3 } },
  { id: 'bandit_raid', name: 'Набег разбойников', description: 'Разбойники атаковали ваши караваны и украли ткани.', icon: '🏴‍☠️', type: 'negative', effect: { fabric: -2 } },
  { id: 'mine_collapse', name: 'Обвал в шахте', description: 'В одной из ваших шахт произошёл обвал.', icon: '⚠️', type: 'negative', effect: { ore: -2 } },
  { id: 'epidemic', name: 'Эпидемия', description: 'Эпидемия распространилась среди ваших работников.', icon: '🦠', type: 'negative', effect: { food: -2, fur: -1 } },
  { id: 'tax_audit', name: 'Налоговая ревизия', description: 'Имперские чиновники наложили штраф.', icon: '📜', type: 'negative', effect: { money: -4 } },
  { id: 'neutral_weather', name: 'Обычная погода', description: 'Ничего особенного не произошло.', icon: '☀️', type: 'neutral', effect: {} },
];

const MAX_TURNS = 10;
const MAX_CAPTURES_PER_TURN = 2;
const MIN_FREE_SECTORS = 8;

const initialGameState: GameState = {
  turn: 1,
  tribes: [
    { id: 't1', name: 'Артель Строгановых', color: '#4ade80', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [0], buildings: [], score: 0 },
    { id: 't2', name: 'Компания Шелихова', color: '#60a5fa', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [14], buildings: [], score: 0 },
    { id: 't3', name: 'Карабахские купцы', color: '#fbbf24', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [21], buildings: [], score: 0 },
    { id: 't4', name: 'Артель Демидовых', color: '#f87171', resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 }, sectors: [6], buildings: [], score: 0 },
  ],
  sectors: [
    { id: 0, type: 'forest', ownerId: 't1', buildingId: null, x: 100, y: 100 },
    { id: 1, type: 'mountain', ownerId: null, buildingId: null, x: 187, y: 100 },
    { id: 2, type: 'mountain', ownerId: null, buildingId: null, x: 274, y: 100 },
    { id: 3, type: 'mountain', ownerId: null, buildingId: null, x: 361, y: 100 },
    { id: 4, type: 'forest', ownerId: null, buildingId: null, x: 143, y: 175 },
    { id: 5, type: 'plain', ownerId: null, buildingId: null, x: 230, y: 175 },
    { id: 6, type: 'mountain', ownerId: 't4', buildingId: null, x: 317, y: 175 },
    { id: 7, type: 'forest', ownerId: null, buildingId: null, x: 404, y: 175 },
    { id: 8, type: 'forest', ownerId: null, buildingId: null, x: 448, y: 100 },
    { id: 9, type: 'mountain', ownerId: null, buildingId: null, x: 491, y: 175 },
    { id: 10, type: 'coast', ownerId: null, buildingId: null, x: 100, y: 275 },
    { id: 11, type: 'coast', ownerId: null, buildingId: null, x: 187, y: 275 },
    { id: 12, type: 'forest', ownerId: null, buildingId: null, x: 274, y: 275 },
    { id: 13, type: 'mountain', ownerId: null, buildingId: null, x: 361, y: 275 },
    { id: 14, type: 'coast', ownerId: 't2', buildingId: null, x: 143, y: 350 },
    { id: 15, type: 'forest', ownerId: null, buildingId: null, x: 230, y: 350 },
    { id: 16, type: 'coast', ownerId: null, buildingId: null, x: 317, y: 350 },
    { id: 17, type: 'mountain', ownerId: null, buildingId: null, x: 404, y: 350 },
    { id: 18, type: 'silk_road', ownerId: null, buildingId: null, x: 100, y: 425 },
    { id: 19, type: 'plain', ownerId: null, buildingId: null, x: 187, y: 425 },
    { id: 20, type: 'mountain', ownerId: null, buildingId: null, x: 274, y: 425 },
    { id: 21, type: 'silk_road', ownerId: 't3', buildingId: null, x: 361, y: 425 },
    { id: 22, type: 'plain', ownerId: null, buildingId: null, x: 143, y: 500 },
    { id: 23, type: 'forest', ownerId: null, buildingId: null, x: 230, y: 500 },
    { id: 24, type: 'mountain', ownerId: null, buildingId: null, x: 317, y: 500 },
    { id: 25, type: 'silk_road', ownerId: null, buildingId: null, x: 404, y: 500 },
    { id: 26, type: 'coast', ownerId: null, buildingId: null, x: 448, y: 425 },
    { id: 27, type: 'forest', ownerId: null, buildingId: null, x: 491, y: 500 },
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
};

const REGION_DEFS: {
  key: string;
  title: string;
  icon: string;
  sectors: number[];
  scoreBonus: number;
  moneyIncome: number;
}[] = [
  {
    key: 'siberia',
    title: 'Сибирь',
    icon: '🌲',
    sectors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    scoreBonus: 8,
    moneyIncome: 3,
  },
  {
    key: 'america',
    title: 'Русская Америка',
    icon: '🌊',
    sectors: [10, 11, 12, 13, 14, 15, 16, 17],
    scoreBonus: 7,
    moneyIncome: 3,
  },
  {
    key: 'turkestan',
    title: 'Закавказье и Туркестан',
    icon: '🐫',
    sectors: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    scoreBonus: 8,
    moneyIncome: 3,
  },
];

const BIOME_MONOPOLY_DEFS: Record<BiomeType, {
  title: string;
  icon: string;
  scoreBonus: number;
  moneyIncome: number;
  resourceIncome: Partial<Record<ResourceType, number>>;
}> = {
  forest: {
    title: 'Лесная монополия',
    icon: '🌲',
    scoreBonus: 4,
    moneyIncome: 1,
    resourceIncome: { fur: 1 },
  },
  mountain: {
    title: 'Рудная монополия',
    icon: '⛰️',
    scoreBonus: 4,
    moneyIncome: 1,
    resourceIncome: { ore: 1 },
  },
  coast: {
    title: 'Морская монополия',
    icon: '🌊',
    scoreBonus: 5,
    moneyIncome: 2,
    resourceIncome: { food: 1 },
  },
  plain: {
    title: 'Степная монополия',
    icon: '🌾',
    scoreBonus: 5,
    moneyIncome: 2,
    resourceIncome: { food: 1 },
  },
  silk_road: {
    title: 'Шёлковая монополия',
    icon: '🐫',
    scoreBonus: 6,
    moneyIncome: 2,
    resourceIncome: { money: 1 },
  },
};

const REGION_SECTOR_IDS: Record<string, number[]> = {};
for (const r of REGION_DEFS) REGION_SECTOR_IDS[r.key] = r.sectors;

const BIOME_SECTOR_IDS = {} as Record<BiomeType, number[]>;
for (const s of initialGameState.sectors) {
  if (!BIOME_SECTOR_IDS[s.type]) BIOME_SECTOR_IDS[s.type] = [];
  BIOME_SECTOR_IDS[s.type].push(s.id);
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  fur: '🦊',
  ore: '⚒️',
  fabric: '🧵',
  food: '🍞',
  money: '💰',
};

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
        const tribe = state.tribes.find((t) => t.id === tribeId);
        if (!tribe) return {};

        const income: Partial<Record<ResourceType, number>> = {};

        for (const sectorId of tribe.sectors) {
          const sector = state.sectors.find((s) => s.id === sectorId);
          if (!sector) continue;

          const baseIncome = BIOME_BASE_INCOME[sector.type];
          for (const [resource, amount] of Object.entries(baseIncome)) {
            const res = resource as ResourceType;
            income[res] = (income[res] || 0) + (amount || 0);
          }

          if (sector.buildingId) {
            const building = state.buildings.find((b) => b.id === sector.buildingId);
            if (building) {
              for (const [resource, amount] of Object.entries(building.income)) {
                const res = resource as ResourceType;
                income[res] = (income[res] || 0) + (amount || 0);
              }
            }
          }
        }

        const monopolies = (state.monopolies || []).filter((m) => m.active && m.tribeId === tribeId);
        for (const m of monopolies) {
          income.money = (income.money || 0) + m.moneyIncome;
          if (m.resourceIncome) {
            for (const [resource, amount] of Object.entries(m.resourceIncome)) {
              const res = resource as ResourceType;
              income[res] = (income[res] || 0) + (amount || 0);
            }
          }
        }

        set((state) => ({
          tribes: state.tribes.map((t) => {
            if (t.id !== tribeId) return t;
            const newResources = { ...t.resources };
            for (const [resource, amount] of Object.entries(income)) {
              const res = resource as ResourceType;
              newResources[res] += amount || 0;
            }
            return { ...t, resources: newResources };
          }),
          lastIncome: income,
        }));

        get().saveGame();
        return income;
      },

      rollDice: () => {
        const state = get();
        const diceRoll = Math.floor(Math.random() * 6) + 1;
        if (diceRoll <= 3) return null;
        const randomIndex = Math.floor(Math.random() * state.events.length);
        return state.events[randomIndex];
      },

      applyEvent: (eventId) => {
        const state = get();
        const event = state.events.find((e) => e.id === eventId);
        if (!event) return;

        const targetTribeId = state.currentTribeId;
        const targetTribe = state.tribes.find((t) => t.id === targetTribeId);
        if (!targetTribe) return;

        const newResources = { ...targetTribe.resources };
        for (const [resource, amount] of Object.entries(event.effect)) {
          const res = resource as ResourceType;
          newResources[res] = Math.max(0, newResources[res] + (amount || 0));
        }

        set({
          tribes: state.tribes.map((t) =>
            t.id === targetTribeId ? { ...t, resources: newResources } : t
          ),
          lastEvent: event,
        });

        const effectStr = Object.entries(event.effect)
          .map(([r, a]) => `${RESOURCE_NAMES[r as ResourceType]}${(a || 0) > 0 ? '+' : ''}${a}`)
          .join(' ') || '—';
        get().addLog('event', `${event.icon} ${event.name}: ${effectStr}`, targetTribeId);

        get().saveGame();
      },

      makeTrade: (fromTribeId, toTribeId, given, received) => {
        const state = get();
        const fromTribe = state.tribes.find((t) => t.id === fromTribeId);
        const toTribe = state.tribes.find((t) => t.id === toTribeId);
        if (!fromTribe || !toTribe) return false;

        for (const [resource, amount] of Object.entries(given)) {
          if (fromTribe.resources[resource as ResourceType] < (amount || 0)) return false;
        }
        for (const [resource, amount] of Object.entries(received)) {
          if (toTribe.resources[resource as ResourceType] < (amount || 0)) return false;
        }

        const newFromResources = { ...fromTribe.resources };
        for (const [resource, amount] of Object.entries(given)) {
          newFromResources[resource as ResourceType] -= amount || 0;
        }
        for (const [resource, amount] of Object.entries(received)) {
          newFromResources[resource as ResourceType] += amount || 0;
        }

        const newToResources = { ...toTribe.resources };
        for (const [resource, amount] of Object.entries(received)) {
          newToResources[resource as ResourceType] -= amount || 0;
        }
        for (const [resource, amount] of Object.entries(given)) {
          newToResources[resource as ResourceType] += amount || 0;
        }

        const newTrade: Trade = {
          id: `trade_${Date.now()}`,
          turn: state.turn,
          fromTribeId,
          toTribeId,
          given,
          received,
        };

        set({
          tribes: state.tribes.map((t) => {
            if (t.id === fromTribeId) return { ...t, resources: newFromResources };
            if (t.id === toTribeId) return { ...t, resources: newToResources };
            return t;
          }),
          trades: [...state.trades, newTrade],
        });

        const givenStr = Object.entries(given).map(([r, a]) => `${RESOURCE_NAMES[r as ResourceType]}${a}`).join(' ') || '—';
        const receivedStr = Object.entries(received).map(([r, a]) => `${RESOURCE_NAMES[r as ResourceType]}${a}`).join(' ') || '—';
        get().addLog('trade', `↔ ${toTribe.name}: отдал ${givenStr}, получил ${receivedStr}`, fromTribeId);
        get().addLog('trade', `↔ ${fromTribe.name}: отдал ${receivedStr}, получил ${givenStr}`, toTribeId);

        get().saveGame();
        return true;
      },

      nextTurn: () => {
        const state = get();
        if (state.gameEnded) return;

        if (state.turn >= MAX_TURNS) {
          get().endGame();
          return;
        }

        const tribeIds = state.tribes.map((t) => t.id);
        const currentIndex = tribeIds.indexOf(state.currentTribeId);
        const nextIndex = (currentIndex + 1) % tribeIds.length;
        const nextTribeId = tribeIds[nextIndex];
        const newTurn = nextTribeId === 't1' ? state.turn + 1 : state.turn;

        set({ turn: newTurn, currentTribeId: nextTribeId, capturesThisTurn: 0 });

        const nextTribe = state.tribes.find((t) => t.id === nextTribeId);
        get().addLog('turn_start', `Ход ${newTurn}: начинает ${nextTribe?.name}`, nextTribeId);

        if (get().checkGameEnd()) {
          get().endGame();
        }

        get().saveGame();
      },

      checkGameEnd: () => {
        const state = get();
        if (state.turn >= MAX_TURNS) return true;
        const allSectorsCaptured = state.sectors.every((s) => s.ownerId !== null);
        if (allSectorsCaptured) return true;
        return false;
      },

      endGame: () => {
        const state = get();
        const winner = state.tribes.reduce((max, tribe) =>
          tribe.score > max.score ? tribe : max
        );
        set({ gameEnded: true, winnerId: winner.id });
        get().saveGame();
      },

      setCurrentTribe: (tribeId) => {
        set({ currentTribeId: tribeId, capturesThisTurn: 0 });
        get().saveGame();
      },

      addResource: (tribeId, resource, amount) => {
        set((state) => ({
          tribes: state.tribes.map((t) =>
            t.id === tribeId
              ? { ...t, resources: { ...t.resources, [resource]: t.resources[resource] + amount } }
              : t
          ),
        }));
        get().saveGame();
      },

      captureSector: (sectorId) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        if (!sector || sector.ownerId !== null) return false;

        if (state.capturesThisTurn >= MAX_CAPTURES_PER_TURN) return false;

        const freeCount = state.sectors.filter((s) => s.ownerId === null).length;
        if (freeCount - 1 < MIN_FREE_SECTORS) return false;

        const owned = state.sectors.filter((s) => s.ownerId === state.currentTribeId);
        const adjacent = owned.some((o) => isAdjacentSector(o, sector));
        if (!adjacent) return false;

        set({
          sectors: state.sectors.map((s) =>
            s.id === sectorId ? { ...s, ownerId: state.currentTribeId } : s
          ),
          tribes: state.tribes.map((t) =>
            t.id === state.currentTribeId
              ? { ...t, sectors: [...t.sectors, sectorId] }
              : t
          ),
          capturesThisTurn: state.capturesThisTurn + 1,
        });

        get().addLog('capture', `⚔️ Захватил сектор #${sectorId} (${sector.type})`, state.currentTribeId);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      canAfford: (tribeId, buildingId) => {
        const state = get();
        const tribe = state.tribes.find((t) => t.id === tribeId);
        const building = state.buildings.find((b) => b.id === buildingId);
        if (!tribe || !building) return false;
        for (const [resource, amount] of Object.entries(building.cost)) {
          if (tribe.resources[resource as ResourceType] < (amount || 0)) return false;
        }
        return true;
      },

      buildBuilding: (sectorId, buildingId) => {
        const state = get();
        const sector = state.sectors.find((s) => s.id === sectorId);
        const building = state.buildings.find((b) => b.id === buildingId);
        if (!sector || !building) return false;
        if (sector.ownerId !== state.currentTribeId) return false;
        if (sector.buildingId !== null) return false;

        if (building.allowedBiomes && !building.allowedBiomes.includes(sector.type)) {
          return false;
        }

        const tribe = state.tribes.find((t) => t.id === state.currentTribeId);
        if (!tribe) return false;

        for (const [resource, amount] of Object.entries(building.cost)) {
          if (tribe.resources[resource as ResourceType] < (amount || 0)) return false;
        }

        const newResources = { ...tribe.resources };
        for (const [resource, amount] of Object.entries(building.cost)) {
          newResources[resource as ResourceType] -= amount || 0;
        }

        set({
          sectors: state.sectors.map((s) =>
            s.id === sectorId ? { ...s, buildingId: buildingId } : s
          ),
          tribes: state.tribes.map((t) =>
            t.id === state.currentTribeId
              ? { ...t, resources: newResources, buildings: [...t.buildings, buildingId], score: t.score + building.score }
              : t
          ),
        });

        get().addLog('build', `🏗️ Построил ${building.icon} ${building.name} в секторе #${sectorId} (+${building.score} ОИ)`, state.currentTribeId);
        get().saveGame();
        return true;
      },

      refreshMonopolies: () => {
        const state = get();
        const sectors = state.sectors;
        const oldMonopolies = state.monopolies || [];
        const awarded = new Set(state.awardedMonopolyKeys || []);
        const records: Monopoly[] = oldMonopolies.map((m) => ({ ...m }));
        const messages: string[] = [];
        const scoreByTribe: Record<string, number> = {};
        const logMessages: { tribeId: string; title: string; icon: string; score: number }[] = [];

        const ownerOfAll = (ids: number[]): string | null => {
          if (ids.length === 0) return null;
          const first = sectors.find((s) => s.id === ids[0]);
          if (!first || first.ownerId === null) return null;
          const owner = first.ownerId;
          return ids.every((id) => sectors.find((s) => s.id === id)?.ownerId === owner)
            ? owner
            : null;
        };

        for (const rec of records) {
          const ids = rec.kind === 'region'
            ? REGION_SECTOR_IDS[rec.key]
            : BIOME_SECTOR_IDS[rec.key as BiomeType];
          rec.active = !!ids && ownerOfAll(ids) === rec.tribeId;
        }

        const tryAward = (
          kind: MonopolyKind,
          key: string,
          ids: number[],
          title: string,
          icon: string,
          scoreBonus: number,
          moneyIncome: number,
          resourceIncome?: Partial<Record<ResourceType, number>>
        ) => {
          const monoKey = `${kind}:${key}`;
          if (awarded.has(monoKey)) return;

          const owner = ownerOfAll(ids);
          if (!owner) return;

          const rec: Monopoly = {
            id: `mono_${monoKey}_${Date.now()}`,
            tribeId: owner,
            kind,
            key,
            title,
            icon,
            scoreBonus,
            moneyIncome,
            resourceIncome,
            awardedTurn: state.turn,
            active: true,
          };

          records.push(rec);
          awarded.add(monoKey);
          scoreByTribe[owner] = (scoreByTribe[owner] || 0) + scoreBonus;
          logMessages.push({ tribeId: owner, title, icon, score: scoreBonus });

          const tribeName = state.tribes.find((t) => t.id === owner)?.name || owner;
          messages.push(`🏆 ${tribeName}: монополия «${title}»! +${scoreBonus} ОИ`);
        };

        for (const def of REGION_DEFS) {
          tryAward('region', def.key, def.sectors, def.title, def.icon, def.scoreBonus, def.moneyIncome);
        }

        for (const biome of Object.keys(BIOME_SECTOR_IDS) as BiomeType[]) {
          const def = BIOME_MONOPOLY_DEFS[biome];
          tryAward('biome', biome, BIOME_SECTOR_IDS[biome], def.title, def.icon, def.scoreBonus, def.moneyIncome, def.resourceIncome);
        }

        const activeChanged =
          records.length !== oldMonopolies.length ||
          records.some((rec, idx) => rec.active !== oldMonopolies[idx]?.active);

        if (messages.length > 0 || activeChanged) {
          set({
            tribes: state.tribes.map((t) =>
              scoreByTribe[t.id] ? { ...t, score: t.score + scoreByTribe[t.id] } : t
            ),
            monopolies: records,
            awardedMonopolyKeys: Array.from(awarded),
            ...(messages.length > 0 ? { bankToast: messages.join('\n') } : {}),
          });
        }

        for (const m of logMessages) {
          get().addLog('monopoly', `${m.icon} Монополия «${m.title}» (+${m.score} ОИ)`, m.tribeId);
        }
      },

      expandMap: () => {
        const state = get();
        const level = state.expansionLevel;
        const baseX = 535 + level * 130;
        const startId = 28 + level * 8;

        const extra: Sector[] = [
          { id: startId, type: 'forest', ownerId: null, buildingId: null, x: baseX, y: 100 },
          { id: startId + 1, type: 'mountain', ownerId: null, buildingId: null, x: baseX + 44, y: 175 },
          { id: startId + 2, type: 'coast', ownerId: null, buildingId: null, x: baseX, y: 275 },
          { id: startId + 3, type: 'forest', ownerId: null, buildingId: null, x: baseX + 87, y: 275 },
          { id: startId + 4, type: 'mountain', ownerId: null, buildingId: null, x: baseX + 44, y: 350 },
          { id: startId + 5, type: 'silk_road', ownerId: null, buildingId: null, x: baseX, y: 425 },
          { id: startId + 6, type: 'plain', ownerId: null, buildingId: null, x: baseX + 87, y: 425 },
          { id: startId + 7, type: 'forest', ownerId: null, buildingId: null, x: baseX + 44, y: 500 },
        ];

        set({
          sectors: [...state.sectors, ...extra],
          expansionLevel: level + 1,
        });

        get().addLog('capture', `🗺️ Учитель расширил карту до ${state.sectors.length + 8} тайлов`, null);
        get().refreshMonopolies();
        get().saveGame();
        return true;
      },

      // ЭКСПОРТ В JSON ФАЙЛ
      exportToJSON: () => {
        const state = get();
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
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
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `eco-empire-save-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('⬇️ Игра экспортирована в JSON файл');
      },

      // ИМПОРТ ИЗ JSON ФАЙЛА
      importFromJSON: (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
          const reader = new FileReader();

          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string);

              // Валидация структуры
              if (!data.turn || !data.tribes || !data.sectors) {
                console.error('❌ Неверный формат файла');
                resolve(false);
                return;
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
                currentTribeId: data.currentTribeId || 't1',
                gameEnded: data.gameEnded || false,
                winnerId: data.winnerId || null,
                capturesThisTurn: data.capturesThisTurn || 0,
                expansionLevel: data.expansionLevel || 0,
                logs: data.logs || [],
                lastSaved: Date.now(),
              });

              get().refreshMonopolies();
              get().saveGame(); // Сохраняем в localStorage после импорта
              console.log('⬆️ Игра импортирована из JSON файла');
              resolve(true);
            } catch (error) {
              console.error('❌ Ошибка парсинга JSON:', error);
              resolve(false);
            }
          };

          reader.onerror = () => {
            console.error('❌ Ошибка чтения файла');
            resolve(false);
          };

          reader.readAsText(file);
        });
      },

      saveGame: () => {
        const state = get();
        const saveData = {
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
          savedAt: new Date().toLocaleString('ru-RU'),
        };
        localStorage.setItem('eco-empire-save', JSON.stringify(saveData));
        set({ lastSaved: Date.now() });
      },

      loadGame: () => {
        const saved = localStorage.getItem('eco-empire-save');
        if (!saved) {
          console.log('❌ Сохранённая игра не найдена');
          return false;
        }
        try {
          const data = JSON.parse(saved);
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
            lastSaved: Date.now(),
          });
          get().refreshMonopolies();
          console.log('📂 Игра загружена из eco-empire-save');
          return true;
        } catch (e) {
          console.error('Ошибка загрузки:', e);
          return false;
        }
      },

      resetGame: () => {
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
        });
        console.log('🔄 Игра сброшена полностью');
      },
    }),
    {
      name: 'eco-empire-storage',
    }
  )
);

if (typeof window !== 'undefined') {
  (window as unknown as { useGameStore?: typeof useGameStore }).useGameStore = useGameStore;
}
