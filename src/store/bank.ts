import { useGameStore } from './gameStore';
import type { Loan, Deposit } from '../types';

export const LOAN_TERM = 3;
export const LOAN_RATE = 1.6;
export const DEPOSIT_TERM = 3;
export const DEPOSIT_RATE = 1.3;

export const takeLoan = (amount: number, pledgedSectorId?: number): boolean => {
  const state = useGameStore.getState();
  if (!Number.isInteger(amount) || amount <= 0) return false;

  // Если есть залог — процент ниже (40% вместо 60%)
  const rate = pledgedSectorId ? 1.4 : LOAN_RATE;
  const repayAmount = Math.ceil(amount * rate);

  const loan: Loan = {
    id: `loan_${Date.now()}`,
    tribeId: state.currentTribeId,
    amount,
    repayAmount,
    takenTurn: state.turn,
    dueTurn: state.turn + LOAN_TERM,
    repaid: false,
    pledgedSectorId,
  };

  // Если есть залог — передаём сектор банку (ownerId = null, но помечаем в loan)
  if (pledgedSectorId) {
    const sector = state.sectors.find((s) => s.id === pledgedSectorId);
    if (!sector || sector.ownerId !== state.currentTribeId) return false;

    useGameStore.setState({
      sectors: state.sectors.map((s) =>
        s.id === pledgedSectorId ? { ...s, ownerId: null } : s
      ),
      tribes: state.tribes.map((t) =>
        t.id === state.currentTribeId
          ? {
              ...t,
              resources: { ...t.resources, money: t.resources.money + amount },
              sectors: t.sectors.filter((id) => id !== pledgedSectorId),
            }
          : t
      ),
      loans: [...state.loans, loan],
    });

    useGameStore.getState().addLog(
      'sector_pledge',
      `🏛️ Залоговый кредит: +${amount} 💰 (под залог сектора #${pledgedSectorId}), вернуть ${repayAmount} 💰`,
      state.currentTribeId
    );
  } else {
    useGameStore.setState({
      tribes: state.tribes.map((t) =>
        t.id === state.currentTribeId
          ? { ...t, resources: { ...t.resources, money: t.resources.money + amount } }
          : t
      ),
      loans: [...state.loans, loan],
    });

    useGameStore.getState().addLog(
      'loan_take',
      `📜 Вексель: +${amount} 💰, вернуть ${repayAmount} 💰 до хода ${loan.dueTurn}`,
      state.currentTribeId
    );
  }

  return true;
};
export const repayLoan = (loanId: string, silent = false): boolean => {
  const state = useGameStore.getState();
  const loan = state.loans.find((l) => l.id === loanId && !l.repaid);
  if (!loan) return false;

  const tribe = state.tribes.find((t) => t.id === loan.tribeId);
  if (!tribe || tribe.resources.money < loan.repayAmount) return false;

  useGameStore.setState({
    tribes: state.tribes.map((t) =>
      t.id === loan.tribeId
        ? { ...t, resources: { ...t.resources, money: t.resources.money - loan.repayAmount } }
        : t
    ),
    loans: state.loans.map((l) => (l.id === loanId ? { ...l, repaid: true } : l)),
  });

  if (!silent) {
    useGameStore.getState().addLog(
      'loan_repay',
      `✅ Погасил вексель: −${loan.repayAmount} 💰`,
      loan.tribeId
    );
  }
  return true;
};

export const makeDeposit = (amount: number): boolean => {
  const state = useGameStore.getState();
  if (!Number.isInteger(amount) || amount <= 0) return false;

  const tribe = state.tribes.find((t) => t.id === state.currentTribeId);
  if (!tribe || tribe.resources.money < amount) return false;

  const deposit: Deposit = {
    id: `dep_${Date.now()}`,
    tribeId: state.currentTribeId,
    amount,
    returnAmount: Math.floor(amount * DEPOSIT_RATE),
    startTurn: state.turn,
    endTurn: state.turn + DEPOSIT_TERM,
    closed: false,
  };

  useGameStore.setState({
    tribes: state.tribes.map((t) =>
      t.id === state.currentTribeId
        ? { ...t, resources: { ...t.resources, money: t.resources.money - amount } }
        : t
    ),
    deposits: [...state.deposits, deposit],
  });

  useGameStore.getState().addLog(
    'deposit',
    `💰 Депозит: −${amount} 💰, получу ${deposit.returnAmount} 💰 на ходе ${deposit.endTurn}`,
    state.currentTribeId
  );
  return true;
};

export const buyShare = (shareId: string): boolean => {
  const state = useGameStore.getState();
  const share = state.shares.find((s) => s.id === shareId && s.active);
  if (!share) return false;
  if (share.investorId !== share.emitterId) return false;

  const investor = state.tribes.find((t) => t.id === state.currentTribeId);
  if (!investor || investor.resources.money < share.price) return false;

  const emitter = state.tribes.find((t) => t.id === share.emitterId);
  if (!emitter) return false;

  useGameStore.setState({
    tribes: state.tribes.map((t) => {
      if (t.id === state.currentTribeId) {
        return { ...t, resources: { ...t.resources, money: t.resources.money - share.price } };
      }
      if (t.id === share.emitterId) {
        return { ...t, resources: { ...t.resources, money: t.resources.money + share.price } };
      }
      return t;
    }),
    shares: state.shares.map((s) =>
      s.id === shareId ? { ...s, investorId: state.currentTribeId } : s
    ),
  });

  useGameStore.getState().addLog(
    'share_buy',
    `📈 Купил пай у ${emitter.name}: −${share.price} 💰, дивиденд +${share.dividendPerTurn} 💰/ход`,
    state.currentTribeId
  );
  return true;
};

export const issueShare = (sectorId: number, price: number, dividendPerTurn: number): boolean => {
  const state = useGameStore.getState();
  const sector = state.sectors.find((s) => s.id === sectorId);
  if (!sector || sector.ownerId !== state.currentTribeId || !sector.buildingId) return false;

  const existingShare = state.shares.find((s) => s.sectorId === sectorId && s.active);
  if (existingShare) return false;

  const share = {
    id: `share_${Date.now()}`,
    sectorId,
    emitterId: state.currentTribeId,
    investorId: state.currentTribeId,
    price,
    dividendPerTurn,
    active: true,
  };

  useGameStore.setState({
    shares: [...state.shares, share],
  });

  const building = state.buildings.find((b) => b.id === sector.buildingId);
  useGameStore.getState().addLog(
    'share_issue',
    `📈 Выпустил пай на ${building?.name || 'здание'}: цена ${price} 💰, дивиденд ${dividendPerTurn} 💰/ход`,
    state.currentTribeId
  );
  return true;
};

const defaultLoan = (loan: Loan): number => {
  const state = useGameStore.getState();

  // Если это залоговый кредит — сектор уже у банка, просто помечаем как невозврат
  if (loan.pledgedSectorId) {
    useGameStore.setState({
      loans: state.loans.map((l) => (l.id === loan.id ? { ...l, repaid: true } : l)),
    });

    useGameStore.getState().addLog(
      'default',
      `⚠️ ДЕФОЛТ по залоговому кредиту! Сектор #${loan.pledgedSectorId} конфискован банком`,
      loan.tribeId
    );

    // Выставляем сектор на аукцион (продаём первому покупателю за 50% стоимости)
    const sectorValue = useGameStore.getState().calculateSectorValue(loan.pledgedSectorId);
    const auctionPrice = Math.round(sectorValue * 0.5);

    useGameStore.getState().listSectorForSale(loan.pledgedSectorId, auctionPrice);
    // Временно делаем банк "владельцем" для продажи
    useGameStore.setState({
      sectors: state.sectors.map((s) =>
        s.id === loan.pledgedSectorId ? { ...s, ownerId: loan.tribeId } : s
      ),
    });

    return loan.pledgedSectorId;
  }

  // Обычный дефолт (без залога)
  const tribeSectors = state.sectors.filter((s) => s.ownerId === loan.tribeId);
  const target = tribeSectors.find((s) => s.buildingId === null) ?? tribeSectors[0];
  if (!target) return -1;

  useGameStore.setState({
    sectors: state.sectors.map((s) =>
      s.id === target.id ? { ...s, ownerId: null, buildingId: null } : s
    ),
    tribes: state.tribes.map((t) => {
      if (t.id !== loan.tribeId) return t;
      return {
        ...t,
        sectors: t.sectors.filter((id) => id !== target.id),
        buildings: target.buildingId
          ? t.buildings.filter((b) => b !== target.buildingId)
          : t.buildings,
        score: Math.max(0, t.score - 2),
      };
    }),
    loans: state.loans.map((l) => (l.id === loan.id ? { ...l, repaid: true } : l)),
    shares: state.shares.map((s) =>
      s.sectorId === target.id ? { ...s, active: false } : s
    ),
  });

  useGameStore.getState().addLog(
    'default',
    `⚠️ ДЕФОЛТ! Банк изъял сектор #${target.id}, штраф −2 ОИ`,
    loan.tribeId
  );

  useGameStore.getState().refreshMonopolies();
  return target.id;
};

export const repayPledgedLoan = (loanId: string): boolean => {
  const state = useGameStore.getState();
  const loan = state.loans.find((l) => l.id === loanId && !l.repaid && l.pledgedSectorId);
  if (!loan) return false;

  const tribe = state.tribes.find((t) => t.id === loan.tribeId);
  if (!tribe || tribe.resources.money < loan.repayAmount) return false;

  // Возвращаем сектор владельцу
  useGameStore.setState({
    tribes: state.tribes.map((t) =>
      t.id === loan.tribeId
        ? {
            ...t,
            resources: { ...t.resources, money: t.resources.money - loan.repayAmount },
            sectors: [...t.sectors, loan.pledgedSectorId!],
          }
        : t
    ),
    sectors: state.sectors.map((s) =>
      s.id === loan.pledgedSectorId ? { ...s, ownerId: loan.tribeId } : s
    ),
    loans: state.loans.map((l) => (l.id === loanId ? { ...l, repaid: true } : l)),
    sectorListings: state.sectorListings.filter((l) => l.sectorId !== loan.pledgedSectorId),
  });

  useGameStore.getState().addLog(
    'loan_repay',
    `✅ Залоговый кредит погашен: −${loan.repayAmount} 💰, сектор #${loan.pledgedSectorId} возвращён`,
    loan.tribeId
  );

  useGameStore.getState().refreshMonopolies();
  return true;
};
export const processBankPhase = () => {
  const state = useGameStore.getState();
  const messages: string[] = [];

  const dueLoans = state.loans.filter((l) => !l.repaid && l.dueTurn <= state.turn);
  for (const loan of dueLoans) {
    const tribe = useGameStore.getState().tribes.find((t) => t.id === loan.tribeId);
    const name = tribe?.name ?? '?';

    if (tribe && tribe.resources.money >= loan.repayAmount) {
      repayLoan(loan.id, true);
      useGameStore.getState().addLog(
        'loan_repay',
        `✅ Вексель погашен автоматически: −${loan.repayAmount} 💰`,
        loan.tribeId
      );
      messages.push(`🏦 ${name}: вексель погашен автоматически (−${loan.repayAmount} 💰)`);
    } else {
      const sectorId = defaultLoan(loan);
      messages.push(`⚠️ ${name}: ДЕФОЛТ! Банк изъял сектор #${sectorId}, штраф −2 ОИ`);
    }
  }

  const matured = useGameStore.getState().deposits.filter((d) => !d.closed && d.endTurn <= state.turn);
  for (const dep of matured) {
    const cur = useGameStore.getState();
    useGameStore.setState({
      tribes: cur.tribes.map((t) =>
        t.id === dep.tribeId
          ? { ...t, resources: { ...t.resources, money: t.resources.money + dep.returnAmount } }
          : t
      ),
      deposits: cur.deposits.map((d) => (d.id === dep.id ? { ...d, closed: true } : d)),
    });
    const name = cur.tribes.find((t) => t.id === dep.tribeId)?.name ?? '?';
    useGameStore.getState().addLog(
      'deposit',
      `✅ Депозит созрел: +${dep.returnAmount} 💰`,
      dep.tribeId
    );
    messages.push(`💰 ${name}: депозит созрел, зачислено +${dep.returnAmount} 💰`);
  }

  const activeShares = useGameStore.getState().shares.filter((s) => s.active && s.investorId !== s.emitterId);
  for (const share of activeShares) {
    const cur = useGameStore.getState();
    const investor = cur.tribes.find((t) => t.id === share.investorId);
    const emitter = cur.tribes.find((t) => t.id === share.emitterId);
    if (!investor || !emitter) continue;

    if (emitter.resources.money >= share.dividendPerTurn) {
      useGameStore.setState({
        tribes: cur.tribes.map((t) => {
          if (t.id === share.investorId) {
            return { ...t, resources: { ...t.resources, money: t.resources.money + share.dividendPerTurn } };
          }
          if (t.id === share.emitterId) {
            return { ...t, resources: { ...t.resources, money: t.resources.money - share.dividendPerTurn } };
          }
          return t;
        }),
      });
      useGameStore.getState().addLog(
        'share_buy',
        `📈 Дивиденд от ${emitter.name}: +${share.dividendPerTurn} 💰`,
        share.investorId
      );
      messages.push(`📈 ${investor.name}: получен дивиденд +${share.dividendPerTurn} 💰 от ${emitter.name}`);
    } else {
      messages.push(`⚠️ ${emitter.name}: не хватает денег на дивиденд ${share.dividendPerTurn} 💰 для ${investor.name}`);
    }
  }

  if (messages.length > 0) {
    useGameStore.setState({ bankToast: messages.join('\n') });
  }
};
