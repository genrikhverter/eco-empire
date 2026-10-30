import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { takeLoan, repayLoan, makeDeposit, buyShare, LOAN_RATE, LOAN_TERM, DEPOSIT_RATE, DEPOSIT_TERM } from '../store/bank';

type Tab = 'loans' | 'deposits' | 'shares';

interface BankModalProps {
  onClose: () => void;
}

export const BankModal = ({ onClose }: BankModalProps) => {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>('loans');
  const [amount, setAmount] = useState('5');
  const [depAmount, setDepAmount] = useState('5');

  const tribes = useGameStore((s) => s.tribes);
  const sectors = useGameStore((s) => s.sectors);
  const buildings = useGameStore((s) => s.buildings);
  const loans = useGameStore((s) => s.loans);
  const deposits = useGameStore((s) => s.deposits);
  const shares = useGameStore((s) => s.shares);
  const turn = useGameStore((s) => s.turn);
  const currentTribeId = useGameStore((s) => s.currentTribeId);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  if (!currentTribe) return null;

  const myLoans = loans.filter((l) => l.tribeId === currentTribeId && !l.repaid);
  const myDeposits = deposits.filter((d) => d.tribeId === currentTribeId && !d.closed);
  const numAmount = parseInt(amount) || 0;
  const repayAmount = Math.ceil(numAmount * LOAN_RATE);
  const numDepAmount = parseInt(depAmount) || 0;
  const depReturn = Math.floor(numDepAmount * DEPOSIT_RATE);

  const handleTakeLoan = () => {
    if (takeLoan(numAmount)) {
      alert(`✅ Вексель получен: +${numAmount} 💰\nВернуть: ${Math.ceil(numAmount * LOAN_RATE)} 💰 до хода ${turn + LOAN_TERM}`);
    } else {
      alert('❌ Некорректная сумма!');
    }
  };

  const handleRepay = (loanId: string) => {
    if (repayLoan(loanId)) {
      alert('✅ Вексель погашен!');
    } else {
      alert('❌ Недостаточно денег для погашения!');
    }
  };

  const handleBuyShare = (shareId: string) => {
    if (buyShare(shareId)) {
      alert('✅ Пай куплен!');
    } else {
      alert('❌ Недостаточно денег или пай уже куплен!');
    }
  };

  const tabButton = (id: Tab, label: string, enabled: boolean) => (
    <button
      onClick={() => enabled && setTab(id)}
      style={{
        flex: 1,
        padding: '0.7rem 0.4rem',
        background: tab === id ? '#db2777' : enabled ? '#fce7f3' : '#e2e8f0',
        color: tab === id ? 'white' : enabled ? '#831843' : '#94a3b8',
        border: 'none',
        borderRadius: '8px',
        fontSize: isMobile ? '0.8rem' : '0.95rem',
        fontWeight: 'bold',
        cursor: enabled ? 'pointer' : 'not-allowed',
        minHeight: '44px'
      }}
    >
      {label}
    </button>
  );

  // Данные для вкладки паёв
  const myEmittedShares = shares.filter((s) => s.emitterId === currentTribeId && s.active);
  const myInvestedShares = shares.filter((s) => s.investorId === currentTribeId && s.active && s.emitterId !== currentTribeId);
  const availableShares = shares.filter((s) => s.active && s.investorId === s.emitterId && s.emitterId !== currentTribeId);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white',
        padding: isMobile ? '1rem' : '2rem',
        borderRadius: '12px',
        maxWidth: '650px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
            🏦 Имперский Банк
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#f87171', color: 'white', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', flexShrink: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Вкладки */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
          {tabButton('loans', '📜 Векселя', true)}
          {tabButton('deposits', '💰 Депозиты', true)}
          {tabButton('shares', '📈 Паи', true)}
        </div>

        {/* ВКЛАДКА: ВЕКСЕЛЯ */}
        {tab === 'loans' && (
          <>
            <div style={{
              background: '#f1f5f9', padding: '0.7rem', borderRadius: '8px',
              marginBottom: '1rem', fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              <strong>{currentTribe.name}</strong> | Казна: {currentTribe.resources.money} 💰 | Ход: {turn}
            </div>

            <div style={{
              border: '2px solid #db2777', borderRadius: '12px',
              padding: isMobile ? '0.9rem' : '1.2rem', marginBottom: '1rem', background: '#fdf2f8'
            }}>
              <h3 style={{ margin: '0 0 0.7rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
                📜 Взять вексель (кредит)
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 'bold' }}>
                  Сумма:
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '80px', padding: '0.5rem', border: '1px solid #cbd5e1',
                    borderRadius: '6px', textAlign: 'center', fontSize: '1rem'
                  }}
                />
                <span style={{ fontSize: '1.1rem' }}>💰</span>
              </div>

              <div style={{
                background: 'white', borderRadius: '8px', padding: '0.7rem',
                fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '0.7rem'
              }}>
                <div>Получите сейчас: <strong>+{numAmount} 💰</strong></div>
                <div>
                  Вернёте через {LOAN_TERM} хода (ход {turn + LOAN_TERM}):{' '}
                  <strong style={{ color: '#dc2626' }}>−{repayAmount} 💰</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Переплата: {repayAmount - numAmount} 💰 (ставка 60%)
                </div>
              </div>

              <button
                onClick={handleTakeLoan}
                disabled={numAmount <= 0}
                style={{
                  width: '100%', padding: '0.8rem',
                  background: numAmount > 0 ? 'linear-gradient(135deg, #f472b6, #db2777)' : '#cbd5e1',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 'bold',
                  cursor: numAmount > 0 ? 'pointer' : 'not-allowed', minHeight: '48px'
                }}
              >
                📜 Получить деньги сейчас
              </button>
            </div>

            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
              Мои активные векселя ({myLoans.length})
            </h3>

            {myLoans.length === 0 ? (
              <div style={{
                background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '8px',
                padding: '1rem', textAlign: 'center', color: '#166534',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}>
                ✅ Долгов нет — казна чиста!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myLoans.map((loan) => {
                  const turnsLeft = loan.dueTurn - turn;
                  const urgent = turnsLeft <= 1;
                  const canRepay = currentTribe.resources.money >= loan.repayAmount;
                  return (
                    <div
                      key={loan.id}
                      style={{
                        border: `2px solid ${urgent ? '#dc2626' : '#f9a8d4'}`,
                        background: urgent ? '#fee2e2' : '#fff',
                        borderRadius: '8px',
                        padding: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <strong style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                          Взято: {loan.amount} 💰 (ход {loan.takenTurn})
                        </strong>
                        <strong style={{ color: '#dc2626', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                          Вернуть: {loan.repayAmount} 💰
                        </strong>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                        color: urgent ? '#991b1b' : '#64748b',
                        margin: '0.3rem 0 0.6rem 0',
                        fontWeight: urgent ? 'bold' : 'normal'
                      }}>
                        {urgent ? '⏰ ВНИМАНИЕ: срок на исходе!' : `📅 Срок: ход ${loan.dueTurn} (осталось ${turnsLeft})`}
                      </div>
                      <button
                        onClick={() => handleRepay(loan.id)}
                        disabled={!canRepay}
                        style={{
                          width: '100%', padding: '0.6rem',
                          background: canRepay ? '#4ade80' : '#cbd5e1',
                          color: canRepay ? 'white' : '#64748b',
                          border: 'none', borderRadius: '6px', fontWeight: 'bold',
                          cursor: canRepay ? 'pointer' : 'not-allowed', minHeight: '44px'
                        }}
                      >
                        {canRepay ? `💰 Погасить ${loan.repayAmount} 💰` : '❌ Не хватает денег'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ВКЛАДКА: ДЕПОЗИТЫ */}
        {tab === 'deposits' && (
          <>
            <div style={{
              background: '#f1f5f9', padding: '0.7rem', borderRadius: '8px',
              marginBottom: '1rem', fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              <strong>{currentTribe.name}</strong> | Казна: {currentTribe.resources.money} 💰 | Ход: {turn}
            </div>

            <div style={{
              border: '2px solid #0891b2', borderRadius: '12px',
              padding: isMobile ? '0.9rem' : '1.2rem', marginBottom: '1rem', background: '#ecfeff'
            }}>
              <h3 style={{ margin: '0 0 0.7rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
                💰 Открыть депозит (3 хода, +30%)
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 'bold' }}>
                  Сумма вклада:
                </label>
                <input
                  type="number"
                  min="1"
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  style={{
                    width: '80px', padding: '0.5rem', border: '1px solid #cbd5e1',
                    borderRadius: '6px', textAlign: 'center', fontSize: '1rem'
                  }}
                />
                <span style={{ fontSize: '1.1rem' }}>💰</span>
              </div>

              <div style={{
                background: 'white', borderRadius: '8px', padding: '0.7rem',
                fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '0.7rem'
              }}>
                <div>Замораживаете сейчас: <strong style={{ color: '#dc2626' }}>−{numDepAmount} 💰</strong></div>
                <div>
                  Получите на ходе {turn + DEPOSIT_TERM}:{' '}
                  <strong style={{ color: '#16a34a' }}>+{depReturn} 💰</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Прибыль: {depReturn - numDepAmount} 💰 (ставка 30%)
                </div>
                <div style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                  ⚠️ Досрочное снятие невозможно!
                </div>
              </div>

              <button
                onClick={() => {
                  if (makeDeposit(numDepAmount)) {
                    alert(`✅ Депозит открыт: ${numDepAmount} 💰 заморожено\nПолучите ${depReturn} 💰 на ходе ${turn + DEPOSIT_TERM}`);
                  } else {
                    alert('❌ Недостаточно денег или некорректная сумма!');
                  }
                }}
                disabled={numDepAmount <= 0 || numDepAmount > currentTribe.resources.money}
                style={{
                  width: '100%', padding: '0.8rem',
                  background: (numDepAmount > 0 && numDepAmount <= currentTribe.resources.money)
                    ? 'linear-gradient(135deg, #22d3ee, #0891b2)' : '#cbd5e1',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 'bold',
                  cursor: (numDepAmount > 0 && numDepAmount <= currentTribe.resources.money) ? 'pointer' : 'not-allowed',
                  minHeight: '48px'
                }}
              >
                💰 Заморозить деньги
              </button>
            </div>

            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
              Мои активные депозиты ({myDeposits.length})
            </h3>

            {myDeposits.length === 0 ? (
              <div style={{
                background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px',
                padding: '1rem', textAlign: 'center', color: '#64748b',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}>
                Депозитов нет
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myDeposits.map((dep) => {
                  const turnsLeft = dep.endTurn - turn;
                  return (
                    <div
                      key={dep.id}
                      style={{
                        border: '2px solid #67e8f9',
                        background: turnsLeft <= 1 ? '#cffafe' : '#fff',
                        borderRadius: '8px',
                        padding: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <strong style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                          Вклад: {dep.amount} 💰 (ход {dep.startTurn})
                        </strong>
                        <strong style={{ color: '#16a34a', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                          Получите: {dep.returnAmount} 💰
                        </strong>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                        color: '#155e75', margin: '0.3rem 0 0 0'
                      }}>
                        {turnsLeft <= 1 ? '⏳ Созреет на следующем ходу!' : `📅 Созреет на ходе ${dep.endTurn} (осталось ${turnsLeft})`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ВКЛАДКА: ПАИ */}
        {tab === 'shares' && (
          <>
            <div style={{
              background: '#f1f5f9', padding: '0.7rem', borderRadius: '8px',
              marginBottom: '1rem', fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              <strong>{currentTribe.name}</strong> | Казна: {currentTribe.resources.money} 💰
            </div>

            {/* Доступные для покупки паи */}
            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
              🛒 Доступные паи ({availableShares.length})
            </h3>

            {availableShares.length === 0 ? (
              <div style={{
                background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px',
                padding: '1rem', textAlign: 'center', color: '#64748b',
                fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '1rem'
              }}>
                Нет доступных паёв для покупки
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {availableShares.map((share) => {
                  const sector = sectors.find((s) => s.id === share.sectorId);
                  const building = buildings.find((b) => b.id === sector?.buildingId);
                  const emitter = tribes.find((t) => t.id === share.emitterId);
                  const canBuy = currentTribe.resources.money >= share.price;
                  return (
                    <div
                      key={share.id}
                      style={{
                        border: '2px solid #a78bfa',
                        background: '#faf5ff',
                        borderRadius: '8px',
                        padding: '0.8rem'
                      }}
                    >
                      <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '0.4rem' }}>
                        <strong>{building?.icon} {building?.name}</strong> (сектор #{share.sectorId})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                        Эмитент: <span style={{ color: emitter?.color, fontWeight: 'bold' }}>{emitter?.name}</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '0.6rem' }}>
                        Цена: <strong>{share.price} 💰</strong> | Дивиденд: <strong style={{ color: '#16a34a' }}>+{share.dividendPerTurn} 💰/ход</strong>
                      </div>
                      <button
                        onClick={() => handleBuyShare(share.id)}
                        disabled={!canBuy}
                        style={{
                          width: '100%', padding: '0.6rem',
                          background: canBuy ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#cbd5e1',
                          color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold',
                          cursor: canBuy ? 'pointer' : 'not-allowed', minHeight: '44px',
                          fontSize: isMobile ? '0.85rem' : '0.95rem'
                        }}
                      >
                        {canBuy ? `📈 Купить за ${share.price} 💰` : '❌ Не хватает денег'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Мои инвестиции */}
            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
              💼 Мои инвестиции ({myInvestedShares.length})
            </h3>

            {myInvestedShares.length === 0 ? (
              <div style={{
                background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px',
                padding: '0.8rem', textAlign: 'center', color: '#64748b',
                fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '1rem'
              }}>
                У вас нет инвестиций
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {myInvestedShares.map((share) => {
                  const sector = sectors.find((s) => s.id === share.sectorId);
                  const building = buildings.find((b) => b.id === sector?.buildingId);
                  const emitter = tribes.find((t) => t.id === share.emitterId);
                  return (
                    <div
                      key={share.id}
                      style={{
                        border: '2px solid #86efac',
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        padding: '0.7rem'
                      }}
                    >
                      <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                        <strong>{building?.icon} {building?.name}</strong> от{' '}
                        <span style={{ color: emitter?.color, fontWeight: 'bold' }}>{emitter?.name}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.3rem' }}>
                        📈 Дивиденд: <strong>+{share.dividendPerTurn} 💰/ход</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Мои выпущенные паи */}
            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: isMobile ? '1rem' : '1.15rem' }}>
              🏛️ Мои выпущенные паи ({myEmittedShares.length})
            </h3>

            {myEmittedShares.length === 0 ? (
              <div style={{
                background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px',
                padding: '0.8rem', textAlign: 'center', color: '#64748b',
                fontSize: isMobile ? '0.85rem' : '0.95rem'
              }}>
                Вы не выпускали паи
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myEmittedShares.map((share) => {
                  const sector = sectors.find((s) => s.id === share.sectorId);
                  const building = buildings.find((b) => b.id === sector?.buildingId);
                  const investor = tribes.find((t) => t.id === share.investorId);
                  const isOwned = share.investorId === share.emitterId;
                  return (
                    <div
                      key={share.id}
                      style={{
                        border: '2px solid #fbbf24',
                        background: '#fef3c7',
                        borderRadius: '8px',
                        padding: '0.7rem'
                      }}
                    >
                      <div style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
                        <strong>{building?.icon} {building?.name}</strong> (сектор #{share.sectorId})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '0.3rem' }}>
                        {isOwned ? (
                          '🔒 Пай не продан — дивиденды не платятся'
                        ) : (
                          <>
                            Инвестор: <span style={{ color: investor?.color, fontWeight: 'bold' }}>{investor?.name}</span> | 
                            Обязательство: <strong style={{ color: '#dc2626' }}>−{share.dividendPerTurn} 💰/ход</strong>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
