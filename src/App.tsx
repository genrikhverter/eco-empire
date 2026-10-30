import { useEffect, useState, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { GameMap } from './components/GameMap';
import { EventModal } from './components/EventModal';
import { TradeModal } from './components/TradeModal';
import { GameEndModal } from './components/GameEndModal';
import { BankModal } from './components/BankModal';
import { TeacherPanel } from './components/TeacherPanel';
import { FlyingCoins } from './components/FlyingCoins';
import { DiceRolling } from './components/DiceRolling';
import { Tutorial } from './components/Tutorial';
import { RulesModal } from './components/RulesModal';
import { processBankPhase } from './store/bank';
import { isSoundEnabled, toggleSound, playClick, playCoins, unlockAudio } from './utils/sounds';
import type { ResourceType, GameEvent } from './types';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  fur: '🦊',
  ore: '⚒️',
  fabric: '🧵',
  food: '🍞',
  money: '💰',
};

function App() {
  const turn = useGameStore((state) => state.turn);
  const tribes = useGameStore((state) => state.tribes);
  const sectors = useGameStore((state) => state.sectors);
  const buildings = useGameStore((state) => state.buildings);
  const currentTribeId = useGameStore((state) => state.currentTribeId);
  const lastIncome = useGameStore((state) => state.lastIncome);
  const gameEnded = useGameStore((state) => state.gameEnded);
  const lastSaved = useGameStore((state) => state.lastSaved);
  const loans = useGameStore((state) => state.loans);
  const deposits = useGameStore((state) => state.deposits);
  const shares = useGameStore((state) => state.shares);
  const monopolies = useGameStore((state) => state.monopolies ?? []);
  const capturesThisTurn = useGameStore((state) => state.capturesThisTurn);
  const bankToast = useGameStore((state) => state.bankToast);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const setCurrentTribe = useGameStore((state) => state.setCurrentTribe);
  const collectIncome = useGameStore((state) => state.collectIncome);
  const rollDice = useGameStore((state) => state.rollDice);
  const applyEvent = useGameStore((state) => state.applyEvent);
  const saveGame = useGameStore((state) => state.saveGame);
  const loadGame = useGameStore((state) => state.loadGame);
  const resetGame = useGameStore((state) => state.resetGame);

  const currentTribe = tribes.find((t) => t.id === currentTribeId);
  const [showIncome, setShowIncome] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [showBankToast, setShowBankToast] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());
  const [rollingDice, setRollingDice] = useState(false);

  const [flyingIcons, setFlyingIcons] = useState<string[]>([]);
  const [flyingFrom, setFlyingFrom] = useState<DOMRect | null>(null);
  const [flyingTo, setFlyingTo] = useState<DOMRect | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eco-empire-tutorial-completed') !== 'true';
  });
  const [restartTutorial, setRestartTutorial] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const income = collectIncome(currentTribeId);
    if (Object.keys(income).length > 0) {
      setShowIncome(true);
      const timer = setTimeout(() => setShowIncome(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentTribeId, turn]);

  useEffect(() => {
    if (!lastIncome || Object.keys(lastIncome).length === 0) return;
    if (!mapRef.current) return;

    const tribeCard = document.querySelector(`[data-tribe-id="${currentTribeId}"]`);
    if (!tribeCard) return;

    const fromRect = mapRef.current.getBoundingClientRect();
    const toRect = tribeCard.getBoundingClientRect();

    const icons: string[] = [];
    for (const [resource, amount] of Object.entries(lastIncome)) {
      const count = Math.min(Math.max(Math.floor((amount || 0) / 1), 1), 3);
      for (let i = 0; i < count; i++) {
        icons.push(RESOURCE_ICONS[resource as ResourceType]);
      }
    }

    if (icons.length > 0) {
      setFlyingIcons(icons);
      setFlyingFrom(fromRect);
      setFlyingTo(toRect);
      playCoins();
    }
  }, [lastIncome, currentTribeId]);

  useEffect(() => {
    if (gameEnded) {
      setShowGameEndModal(true);
    }
  }, [gameEnded]);

  useEffect(() => {
    if (lastSaved) {
      setShowSaveIndicator(true);
      const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  useEffect(() => {
    if (bankToast) {
      setShowBankToast(true);
      const timer = setTimeout(() => {
        setShowBankToast(false);
        useGameStore.setState({ bankToast: null });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [bankToast]);

  const handleNextTurn = () => {
    nextTurn();
    processBankPhase();
  };

  const handleRollDice = () => {
    if (rollingDice) return;
    setRollingDice(true);
  };

  const handleDiceComplete = () => {
    setRollingDice(false);
    const event = rollDice();
    if (event) {
      applyEvent(event.id);
      setCurrentEvent(event);
    } else {
      alert('🎲 Выпало 1-3. Ничего не произошло.');
    }
  };

  const handleSave = () => {
    saveGame();
    alert('💾 Игра сохранена!');
  };

  const handleLoad = () => {
    if (confirm('📂 Загрузить сохранённую игру? Текущий прогресс будет потерян!')) {
      const success = loadGame();
      if (success) {
        alert('✅ Игра успешно загружена!');
      } else {
        alert('❌ Сохранённая игра не найдена.');
      }
    }
  };
  const handleExport = () => {
    saveGame(); // Сначала сохраняем в localStorage
    const state = useGameStore.getState();
    state.exportToJSON();
    alert('⬇️ Игра сохранена в JSON файл!\n\nФайл скачается автоматически.');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('❌ Пожалуйста, выберите JSON файл!');
      e.target.value = '';
      return;
    }

    if (confirm(`⬆️ Загрузить игру из файла "${file.name}"?\n\nТекущий прогресс будет заменён!`)) {
      const state = useGameStore.getState();
      const success = await state.importFromJSON(file);

      if (success) {
        alert('✅ Игра успешно загружена из файла!');
      } else {
        alert('❌ Ошибка загрузки файла. Проверьте формат JSON.');
      }
    }

    // Сбрасываем input, чтобы можно было загрузить тот же файл снова
    e.target.value = '';
  };

  const isMobileLike = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="app-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        gap: '0.5rem'
      }}>
        <h1 style={{ margin: 0, fontSize: isMobileLike ? '1.4rem' : '1.8rem', flex: 1 }}>
          🏰 Экономическая Империя
        </h1>
        <button
          onClick={() => setShowRules(true)}
          title="Правила игры"
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.8rem',
            fontSize: '1.1rem',
            cursor: 'pointer',
            minWidth: '48px',
            minHeight: '44px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontWeight: 'bold'
          }}
        >
          📖
        </button>
        <button
          onClick={() => setRestartTutorial(true)}
          title="Как играть"
          style={{
            background: '#fbbf24',
            color: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.8rem',
            fontSize: '1.1rem',
            cursor: 'pointer',
            minWidth: '48px',
            minHeight: '44px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontWeight: 'bold'
          }}
        >
          ❓
        </button>
        <button
          onClick={() => {
            unlockAudio();
            const newState = toggleSound();
            setSoundEnabled(newState);
            if (newState) playClick();
          }}
          title={soundEnabled ? 'Выключить звуки' : 'Включить звуки'}
          style={{
            background: soundEnabled ? '#10b981' : '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.8rem',
            fontSize: '1.3rem',
            cursor: 'pointer',
            minWidth: '48px',
            minHeight: '44px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="stats-bar" style={{
        background: '#fbbf24',
        padding: '0.8rem 1rem',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <span>Ход: {turn}/10</span>
        <span>Свободных: {sectors.filter(s => s.ownerId === null).length}</span>
      </div>

      {showSaveIndicator && (
        <div className="notification notification-top-left animate-slide-left" style={{
          background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
          color: 'white'
        }}>
          💾 Сохранено
        </div>
      )}

      {showIncome && lastIncome && Object.keys(lastIncome).length > 0 && (
        <div className="notification notification-top-right animate-slide-right" style={{
          background: 'linear-gradient(135deg, #4ade80, #22c55e)',
          color: 'white'
        }}>
          💰 Доход для {currentTribe?.name}:
          <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
            {Object.entries(lastIncome).map(([resource, amount]) => (
              <span key={resource} style={{ marginRight: '0.6rem' }}>
                {RESOURCE_ICONS[resource as ResourceType]} +{amount}
              </span>
            ))}
          </div>
        </div>
      )}

      {showBankToast && bankToast && (
        <div className="notification" style={{
          top: '10px',
          left: '50%',
          marginLeft: '-45vw',
          width: '90vw',
          background: 'linear-gradient(135deg, #f472b6, #db2777)',
          color: 'white',
          textAlign: 'center',
          whiteSpace: 'pre-line'
        }}>
          {bankToast}
        </div>
      )}

      {currentTribe && (
        <div className="current-tribe-banner" style={{
          background: currentTribe.color,
          color: 'white',
          padding: '0.8rem',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          🎯 Сейчас ходит: {currentTribe.name}
          <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '0.2rem', opacity: 0.95 }}>
            ⚔️ Захватов за ход: {capturesThisTurn}/2 · 🟦 Свободных секторов: {sectors.filter(s => s.ownerId === null).length} (мин. 8)
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem',
        marginBottom: '1rem',
        width: '100%'
      }}>
        <button
          onClick={handleNextTurn}
          disabled={gameEnded}
          data-tutorial="next-turn"
          style={{
            padding: '0.8rem 0.5rem',
            background: gameEnded ? '#94a3b8' : '#4ade80',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: gameEnded ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          ⏭️ Ход
        </button>

        <button
          onClick={handleRollDice}
          disabled={gameEnded || rollingDice}
          data-tutorial="dice"
          style={{
            padding: '0.8rem 0.5rem',
            background: gameEnded || rollingDice ? '#94a3b8' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: gameEnded || rollingDice ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          🎲 Кубик
        </button>

        <button
          onClick={() => setShowTradeModal(true)}
          disabled={gameEnded}
          data-tutorial="trade"
          style={{
            padding: '0.8rem 0.5rem',
            background: gameEnded ? '#94a3b8' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: gameEnded ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          🤝 Торговля
        </button>

        <button
          onClick={handleSave}
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          💾 Сохранить
        </button>

        <button
          onClick={handleLoad}
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          📂 Загрузить
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          ⬇️ Экспорт
        </button>

        <button
          onClick={handleImport}
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          ⬆️ Импорт
        </button>

        <button
          onClick={() => setShowBankModal(true)}
          data-tutorial="bank"
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #f472b6, #db2777)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          🏦 Банк
        </button>

        <button
          onClick={() => setShowTeacherPanel(true)}
          data-tutorial="teacher"
          style={{
            padding: '0.8rem 0.5rem',
            background: 'linear-gradient(135deg, #64748b, #475569)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          ⚙️ Учитель
        </button>

        <button
          onClick={() => {
            if (confirm('Сбросить игру? Весь прогресс будет потерян!')) {
              resetGame();
            }
          }}
          style={{
            padding: '0.8rem 0.5rem',
            background: '#f87171',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '48px',
            width: '100%'
          }}
        >
          🔄 Сброс
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        {tribes.map((tribe) => (
          <button
            key={tribe.id}
            onClick={() => setCurrentTribe(tribe.id)}
            disabled={gameEnded}
            style={{
              padding: '0.7rem 0.5rem',
              background: tribe.id === currentTribeId ? tribe.color : '#e2e8f0',
              color: tribe.id === currentTribeId ? 'white' : '#1e293b',
              border: `2px solid ${tribe.color}`,
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: gameEnded ? 'not-allowed' : 'pointer',
              fontWeight: tribe.id === currentTribeId ? 'bold' : 'normal',
              opacity: gameEnded ? 0.5 : 1,
              minHeight: '44px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {tribe.name}
          </button>
        ))}
      </div>

      <div ref={mapRef} data-tutorial="map">
        <GameMap />
      </div>

      <div className="tribes-grid" data-tutorial="tribes">
        {tribes.map((tribe) => {
          const tribeLoans = loans.filter((l) => l.tribeId === tribe.id && !l.repaid);
          const tribeDeposits = deposits.filter((d) => d.tribeId === tribe.id && !d.closed);
          const tribeShares = shares.filter((s) => s.active && (s.investorId === tribe.id || s.emitterId === tribe.id));
          const tribeMonopolies = monopolies.filter((m) => m.tribeId === tribe.id && m.active);

          return (
            <div
              key={tribe.id}
              data-tribe-id={tribe.id}
              style={{
                borderLeft: `6px solid ${tribe.color}`,
                background: tribe.id === currentTribeId ? '#fef3c7' : 'white',
                padding: '0.8rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                opacity: tribe.id === currentTribeId ? 1 : 0.7,
                transition: 'all 0.3s'
              }}
            >
              <h3 style={{ margin: '0 0 0.4rem 0', color: tribe.color, fontSize: '0.95rem' }}>
                {tribe.name} {tribe.id === currentTribeId && '👑'}
              </h3>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {Object.entries(tribe.resources).map(([key, value]) => (
                  <span key={key}>
                    {RESOURCE_ICONS[key as ResourceType]} {value}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.3rem' }}>
                🗺️ Секторов: {tribe.sectors.length} | 🏆 ОИ: {tribe.score}
              </div>

              {tribeMonopolies.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {tribeMonopolies.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: '#fef9c3',
                        border: '1px solid #facc15',
                        borderRadius: '6px',
                        padding: '0.25rem 0.45rem',
                        fontSize: '0.7rem',
                        color: '#713f12',
                        fontWeight: 'bold',
                        lineHeight: 1.3
                      }}
                    >
                      {m.icon} {m.title}
                      <div style={{ fontWeight: 'normal', color: '#15803d', marginTop: '0.1rem' }}>
                        +{m.moneyIncome} 💰/ход
                        {m.resourceIncome && Object.entries(m.resourceIncome).map(([r, a]) => (
                          <span key={r}> +{a} {RESOURCE_ICONS[r as ResourceType]}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tribeLoans.map((loan) => {
                const turnsLeft = loan.dueTurn - turn;
                const urgent = turnsLeft <= 1;
                return (
                  <div
                    key={loan.id}
                    style={{
                      background: urgent ? '#fee2e2' : '#fdf2f8',
                      border: `1px solid ${urgent ? '#dc2626' : '#f9a8d4'}`,
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.72rem',
                      color: urgent ? '#991b1b' : '#831843',
                      fontWeight: urgent ? 'bold' : 'normal',
                      lineHeight: 1.4,
                      marginTop: '0.3rem'
                    }}
                  >
                    📜 Вексель: взял {loan.amount} 💰 → вернуть{' '}
                    <strong>{loan.repayAmount} 💰</strong> до хода {loan.dueTurn}
                    {urgent ? ' ⏰ СРОК!' : ` (осталось ${turnsLeft})`}
                  </div>
                );
              })}

              {tribeDeposits.map((dep) => (
                <div
                  key={dep.id}
                  style={{
                    background: '#ecfeff',
                    border: '1px solid #67e8f9',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.72rem',
                    color: '#155e75',
                    lineHeight: 1.4,
                    marginTop: '0.3rem'
                  }}
                >
                  💰 Депозит: {dep.amount} 💰 заморожено → {dep.returnAmount} 💰 на ходе {dep.endTurn}
                </div>
              ))}

              {tribeShares.map((share) => {
                const isInvestor = share.investorId === tribe.id && share.emitterId !== tribe.id;
                const isOwned = share.investorId === share.emitterId;
                const sector = sectors.find((s) => s.id === share.sectorId);
                const building = buildings.find((b) => b.id === sector?.buildingId);
                const otherTribe = tribes.find((t) => t.id === (isInvestor ? share.emitterId : share.investorId));

                return (
                  <div
                    key={share.id}
                    style={{
                      background: isInvestor ? '#f0fdf4' : '#fef3c7',
                      border: `1px solid ${isInvestor ? '#86efac' : '#fbbf24'}`,
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.72rem',
                      color: isInvestor ? '#166534' : '#92400e',
                      lineHeight: 1.4,
                      marginTop: '0.3rem'
                    }}
                  >
                    {isInvestor ? (
                      <>
                        📈 Инвестиция: {building?.icon} {building?.name} от {otherTribe?.name} → <strong>+{share.dividendPerTurn} 💰/ход</strong>
                      </>
                    ) : (
                      <>
                        🏛️ Пай: {building?.icon} {building?.name} {isOwned ? '(не продан)' : `→ ${otherTribe?.name} платит ${share.dividendPerTurn} 💰/ход`}
                      </>
                    )}
                  </div>
                );
              })}

              {tribeLoans.length === 0 && tribeDeposits.length === 0 && tribeShares.length === 0 && tribeMonopolies.length === 0 && (
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.7rem',
                  color: '#16a34a',
                  fontWeight: 'bold'
                }}>
                  ✅ Нет банковских операций
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentEvent && (
        <EventModal event={currentEvent} onClose={() => setCurrentEvent(null)} />
      )}

      {showTradeModal && (
        <TradeModal onClose={() => setShowTradeModal(false)} />
      )}

      {showGameEndModal && (
        <GameEndModal onClose={() => setShowGameEndModal(false)} />
      )}

      {showBankModal && (
        <BankModal onClose={() => setShowBankModal(false)} />
      )}

      {showTeacherPanel && (
        <TeacherPanel onClose={() => setShowTeacherPanel(false)} />
      )}

      {/* Летящие монеты при доходе */}
      <FlyingCoins
        icons={flyingIcons}
        fromRect={flyingFrom}
        toRect={flyingTo}
        onComplete={() => {
          setFlyingIcons([]);
          setFlyingFrom(null);
          setFlyingTo(null);
        }}
      />

      {/* Анимация броска кубика */}
      <DiceRolling visible={rollingDice} onComplete={handleDiceComplete} />

      {/* Режим обучения */}
      {(showTutorial || restartTutorial) && (
        <Tutorial
          onComplete={() => {
            setShowTutorial(false);
            setRestartTutorial(false);
          }}
        />
      )}
      {/* Скрытый input для загрузки файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Правила игры */}
      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}
    </div>
  );
}

export default App;
