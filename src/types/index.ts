export type ResourceType = 'fur' | 'ore' | 'fabric' | 'food' | 'money';

export type BiomeType = 'forest' | 'mountain' | 'coast' | 'plain' | 'silk_road';

export type BuildingType = 'fort' | 'factory' | 'mission' | 'shipyard' | 'stable' | 'customs' | 'caravanserai';

export type EventType = 'positive' | 'negative' | 'neutral';

export type MonopolyKind = 'region' | 'biome';

export type LogAction =
  | 'capture'
  | 'build'
  | 'trade'
  | 'loan_take'
  | 'loan_repay'
  | 'deposit'
  | 'share_buy'
  | 'share_issue'
  | 'event'
  | 'monopoly'
  | 'default'
  | 'turn_start'
  | 'sector_sale'
  | 'sector_exchange'
  | 'sector_pledge';

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  icon: string;
  cost: Partial<Record<ResourceType, number>>;
  income: Partial<Record<ResourceType, number>>;
  score: number;
  allowedBiomes: BiomeType[] | null;
  description: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: EventType;
  effect: Partial<Record<ResourceType, number>>;
}

export interface Trade {
  id: string;
  turn: number;
  fromTribeId: string;
  toTribeId: string;
  given: Partial<Record<ResourceType, number>>;
  received: Partial<Record<ResourceType, number>>;
}

export interface Loan {
  id: string;
  tribeId: string;
  amount: number;
  repayAmount: number;
  takenTurn: number;
  dueTurn: number;
  repaid: boolean;
  pledgedSectorId?: number; // Для залоговых кредитов
}

export interface Deposit {
  id: string;
  tribeId: string;
  amount: number;
  returnAmount: number;
  startTurn: number;
  endTurn: number;
  closed: boolean;
}

export interface Share {
  id: string;
  sectorId: number;
  emitterId: string;
  investorId: string;
  price: number;
  dividendPerTurn: number;
  active: boolean;
}

export interface Monopoly {
  id: string;
  tribeId: string;
  kind: MonopolyKind;
  key: string;
  title: string;
  icon: string;
  scoreBonus: number;
  moneyIncome: number;
  resourceIncome?: Partial<Record<ResourceType, number>>;
  awardedTurn: number;
  active: boolean;
}

// НОВОЕ: Объявление о продаже сектора
export interface SectorListing {
  id: string;
  sectorId: number;
  sellerId: string;
  price: number;
  listedTurn: number;
  active: boolean;
}

// НОВОЕ: Предложение обмена секторами
export interface SectorExchange {
  id: string;
  sector1Id: number;
  sector2Id: number;
  owner1Id: string;
  owner2Id: string;
  additionalPayment?: {
    fromId: string;
    toId: string;
    amount: number;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdTurn: number;
}

export interface LogEntry {
  id: string;
  turn: number;
  tribeId: string | null;
  tribeName: string | null;
  action: LogAction;
  details: string;
  timestamp: number;
}

export interface Tribe {
  id: string;
  name: string;
  color: string;
  resources: Record<ResourceType, number>;
  sectors: number[];
  buildings: string[];
  score: number;
}

export interface Sector {
  id: number;
  type: BiomeType;
  ownerId: string | null;
  buildingId: string | null;
  x: number;
  y: number;
}

export interface GameState {
  turn: number;
  tribes: Tribe[];
  sectors: Sector[];
  buildings: Building[];
  events: GameEvent[];
  trades: Trade[];
  loans: Loan[];
  deposits: Deposit[];
  shares: Share[];
  monopolies: Monopoly[];
  awardedMonopolyKeys: string[];
  lastEvent: GameEvent | null;
  expansionLevel: number;
  logs: LogEntry[];
  sectorListings: SectorListing[];
  sectorExchanges: SectorExchange[];
  incomeCollectedThisTurn: boolean; // 🛡️ ДОБАВЬТЕ ЭТУ СТРОКУ
}
