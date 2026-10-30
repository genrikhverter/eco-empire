import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { takeLoan, repayLoan, makeDeposit, issueShare, buyShare, LOAN_RATE, DEPOSIT_RATE, LOAN_TERM, DEPOSIT_TERM, repayPledgedLoan } from '../store/bank';

interface BankModalProps {
  onClose: () => void;
}

type BankTab = 'loan' | 'deposit' | 'share' | 'pledge';

export const BankModal = ({ onClose }: BankModalProps) => {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<BankTab>('loan');
  const [loanAmount, setLoanAmount] = useState('10');
  const [depositAmount, setDepositAmount] = useState('10');
  const [pledgeAmount, setPledgeAmount] = useState('10');
  const [pledgeSectorId, setPledgeSectorId] = useState<string>('');
  const [sharePrice, setSharePrice] = useState('5');
  const [shareDividend, setShareDividend] = useState('1');
  const [selectedBuildSector, setSelectedBuildSector] = useState<string>('');

  const currentTribeId = useGameStore((s) => s.currentTribeId);
  const tribes = useGameStore((s) => s.tribes);
  const sectors = useGameStore((s) => s.sectors);
  const loans = useGameStore((s) => s.loans);
  const deposits = useGameStore((s) => s.deposits);
  const shares = useGameStore((s) => s.shares);
  const turn = useGameStore((s) => s.turn);
  const calculateSectorValue = useGameStore((s) => s.calculateSectorValue);
  const buildings = useGameStore((s) => s.buildings);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  if (!currentTribe) return null;

  const myLoans = loans.filter((l) => l.tribeId === currentTribeId && !l.repaid);
  const myDeposits = deposits.filter((d) => d.tribeId === currentTribeId && !d.closed);
  const myShares = shares.filter((s) => s.active && (s.emitterId === currentTribeId || s.investorId === currentTribeId));
  const mySectorsWithBuildings = sectors.filter((s) => s.ownerId === currentTribeId && s.buildingId);
  const myUnpledgedSectors = sectors.filter(
    (s) => s.ownerId === currentTribeId && !myLoans.some((l) => l.pledgedSectorId === s.id)
  );

  const handleTakeLoan = () => {
    const amount = parseInt(loanAmount);
    if (isNaN(amount) || amount <= 0) { alert('❌ Некорректная сумма'); return; }
    if (takeLoan(amount)) alert(`✅ Вексель на 💰${amount} получен! Вернуть 💰${Math.ceil(amount * LOAN_RATE)} через ${LOAN_TERM} хода.`);
    else alert('❌ Не удалось взять вексель');
  };

  const handleRepay = (loanId: string) => {
    if (repayLoan(loanId)) alert('✅ Вексель погашен!');
    else alert('❌ Недостаточно денег для погашения');
  };

  const handleDeposit = () => {
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) { alert('❌ Некорректная сумма'); return; }
    if (makeDeposit(amount)) alert(`✅ Депозит открыт! Через ${DEPOSIT_TERM} хода получите 💰${Math.floor(amount * DEPOSIT_RATE)}`);
    else alert('❌ Недостаточно денег для депозита');
  };

  const handleIssueShare = () => {
    const sectorId = parseInt(selectedBuildSector);
    const price = parseInt(sharePrice);
    const div = parseInt(shareDividend);
    if (isNaN(sectorId) || isNaN(price) || isNaN(div)) { alert('❌ Заполните все поля'); return; }
    if (issueShare(sectorId, price, div)) alert('✅ Пай выпущен!');
    else alert('❌ Не удалось выпустить пай');
  };

  const handleBuyShare = (shareId: string) => {
    if (buyShare(shareId)) alert('✅ Пай куплен!');
    else alert('❌ Недостаточно денег или пай уже куплен');
  };

  const handlePledgeLoan = () => {
    const amount = parseInt(pledgeAmount);
    const sectorId = parseInt(pledgeSectorId);
    if (isNaN(amount) || amount <= 0 || isNaN(sectorId)) { alert('❌ Выберите сектор и укажите сумму'); return; }
    if (takeLoan(amount, sectorId)) {
      alert(`✅ Залоговый кредит на 💰${amount} получен!\nСектор #${sectorId} передан в залог.\nВернуть 💰${Math.ceil(amount * 1.4)} через ${LOAN_TERM} хода.`);
    } else {
      alert('❌ Не удалось оформить залоговый кредит');
    }
  };

  const handleRepayPledged = (loanId: string) => {
    if (repayPledgedLoan(loanId)) alert('✅ Залоговый кредит погашен, сектор возвращён!');
    else alert('❌ Недостаточно денег');
  };

  const tabBtn = (id: BankTab, label: string) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '0.5rem 0.3rem',
      background: tab === id ? '#1e40af' : '#e2e8f0',
      color: tab === id ? 'white' : '#1e293b',
      border: 'none', borderRadius: '6px',
      fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 'bold', cursor: 'pointer', minHeight: '40px'
    }}>{label}</button>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: isMobile ? '1rem' : '1.5rem',
        maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🏦 Имперский Банк</h2>
          <button onClick={onClose} style={{
            background: '#f87171', color: 'white', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem'
          }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
          {tabBtn('loan', '📜 Вексель')}
          {tabBtn('deposit', '💰 Депозит')}
          {tabBtn('share', '📈 Паи')}
          {tabBtn('pledge', '🏛️ Залог')}
        </div>

        {/* === ВКЛАДКА: ВЕКСЕЛЬ === */}
        {tab === 'loan' && (
          <>
            <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e40af' }}>Взять вексель</h3>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.7rem' }}>
                Ставка: {Math.round((LOAN_RATE - 1) * 100)}% на {LOAN_TERM} хода. Берёте 💰X → возвращаете 💰{Math.ceil(parseInt(loanAmount || '0') * LOAN_RATE)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min="1" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
                <button onClick={handleTakeLoan} style={{
                  padding: '0.6rem 1rem', background: '#3b82f6', color: 'white',
                  border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                }}>Взять</button>
              </div>
            </div>
            {myLoans.filter((l) => !l.pledgedSectorId).map((loan) => (
              <div key={loan.id} style={{
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem', marginBottom: '0.5rem',
                background: loan.dueTurn - turn <= 1 ? '#fef2f2' : 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>💰{loan.amount} → вернуть 💰{loan.repayAmount}</span>
                  <span style={{ color: loan.dueTurn - turn <= 1 ? '#dc2626' : '#64748b' }}>до хода {loan.dueTurn}</span>
                </div>
                <button onClick={() => handleRepay(loan.id)} style={{
                  marginTop: '0.4rem', width: '100%', padding: '0.4rem', background: '#4ade80',
                  color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'
                }}>Погасить</button>
              </div>
            ))}
          </>
        )}

        {/* === ВКЛАДКА: ДЕПОЗИТ === */}
        {tab === 'deposit' && (
          <>
            <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#065f46' }}>Открыть депозит</h3>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.7rem' }}>
                Доходность: +{Math.round((DEPOSIT_RATE - 1) * 100)}% за {DEPOSIT_TERM} хода.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min="1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
                <button onClick={handleDeposit} style={{
                  padding: '0.6rem 1rem', background: '#10b981', color: 'white',
                  border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                }}>Вложить</button>
              </div>
            </div>
            {myDeposits.map((dep) => (
              <div key={dep.id} style={{
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem', marginBottom: '0.5rem', background: 'white'
              }}>
                <div style={{ fontSize: '0.85rem' }}>
                  💰{dep.amount} → получите 💰{dep.returnAmount} на ходе {dep.endTurn}
                </div>
              </div>
            ))}
          </>
        )}

        {/* === ВКЛАДКА: ПАИ === */}
        {tab === 'share' && (
          <>
            <div style={{ background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#92400e' }}>Выпустить пай</h3>
              <select value={selectedBuildSector} onChange={(e) => setSelectedBuildSector(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <option value="">Выберите здание</option>
                {mySectorsWithBuildings.map((s) => {
                      const b = buildings.find((x) => x.id === s.buildingId);
                    return <option key={s.id} value={s.id}>#{s.id} {b?.icon || ''} {b?.name || 'Здание'}</option>;
                })}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="number" min="1" placeholder="Цена" value={sharePrice} onChange={(e) => setSharePrice(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                <input type="number" min="1" placeholder="Дивиденд/ход" value={shareDividend} onChange={(e) => setShareDividend(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
              </div>
              <button onClick={handleIssueShare} style={{
                width: '100%', padding: '0.6rem', background: '#f59e0b', color: 'white',
                border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
              }}>Выпустить пай</button>
            </div>

            {/* Доступные для покупки паи */}
            {shares.filter((s) => s.active && s.investorId === s.emitterId && s.emitterId !== currentTribeId).map((share) => {
              const emitter = tribes.find((t) => t.id === share.emitterId);
              return (
                <div key={share.id} style={{
                  border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem', marginBottom: '0.5rem', background: 'white'
                }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                    📈 Пай от <strong style={{ color: emitter?.color }}>{emitter?.name}</strong>: цена 💰{share.price}, дивиденд 💰{share.dividendPerTurn}/ход
                  </div>
                  <button onClick={() => handleBuyShare(share.id)} style={{
                    width: '100%', padding: '0.4rem', background: '#a78bfa', color: 'white',
                    border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'
                  }}>Купить</button>
                </div>
              );
            })}

            {myShares.map((share) => (
              <div key={share.id} style={{
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem', marginBottom: '0.5rem',
                background: share.investorId === currentTribeId && share.emitterId !== currentTribeId ? '#f0fdf4' : '#fefce8'
              }}>
                <div style={{ fontSize: '0.85rem' }}>
                  {share.investorId === currentTribeId && share.emitterId === currentTribeId
                    ? `🏛️ Ваш пай (не продан): 💰${share.price}, дивиденд 💰${share.dividendPerTurn}/ход`
                    : share.investorId === currentTribeId
                      ? `📈 Инвестиция: дивиденд 💰${share.dividendPerTurn}/ход от ${tribes.find(t => t.id === share.emitterId)?.name}`
                      : `🏛️ Ваш пай куплен: платите 💰${share.dividendPerTurn}/ход инвестору ${tribes.find(t => t.id === share.investorId)?.name}`
                  }
                </div>
              </div>
            ))}
          </>
        )}

        {/* === ВКЛАДКА: ЗАЛОГ === */}
        {tab === 'pledge' && (
          <>
            <div style={{ background: '#fce7f3', border: '2px solid #ec4899', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#9d174d' }}>🏛️ Залоговый кредит</h3>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.7rem' }}>
                Ставка: <strong>40%</strong> (вместо 60% обычного векселя).<br/>
                Сектор передаётся банку как залог. При невозврате — конфискация!
              </div>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                Выберите сектор для залога:
              </label>
              <select value={pledgeSectorId} onChange={(e) => setPledgeSectorId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <option value="">-- Выберите сектор --</option>
                {myUnpledgedSectors.map((s) => {
                  const val = calculateSectorValue(s.id);
                  return <option key={s.id} value={s.id}>#{s.id} ({s.type}) · 💰{val}</option>;
                })}
              </select>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                Сумма кредита (💰):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min="1" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
                <button onClick={handlePledgeLoan} disabled={!pledgeSectorId} style={{
                  padding: '0.6rem 1rem',
                  background: pledgeSectorId ? '#ec4899' : '#cbd5e1',
                  color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold',
                  cursor: pledgeSectorId ? 'pointer' : 'not-allowed'
                }}>Взять</button>
              </div>
            </div>

            {/* Активные залоговые кредиты */}
            {myLoans.filter((l) => l.pledgedSectorId).map((loan) => (
              <div key={loan.id} style={{
                border: '2px solid #ec4899', borderRadius: '8px', padding: '0.7rem', marginBottom: '0.5rem',
                background: loan.dueTurn - turn <= 1 ? '#fef2f2' : '#fdf2f8'
              }}>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  🏛️ Залог: сектор #{loan.pledgedSectorId}<br/>
                  💰{loan.amount} → вернуть 💰{loan.repayAmount} до хода {loan.dueTurn}
                </div>
                <button onClick={() => handleRepayPledged(loan.id)} style={{
                  width: '100%', padding: '0.4rem', background: '#4ade80', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'
                }}>Погасить и вернуть сектор</button>
              </div>
            ))}

            {myLoans.filter((l) => l.pledgedSectorId).length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '1rem' }}>
                Нет активных залоговых кредитов
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
