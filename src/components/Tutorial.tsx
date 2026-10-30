import { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface TutorialStep {
  title: string;
  description: string;
  target?: string;
  icon: string;
  highlight?: 'top' | 'bottom' | 'center';
}

const STEPS: TutorialStep[] = [
  {
    icon: '🏰',
    title: 'Добро пожаловать в Экономическую Империю!',
    description: 'Вы — глава торговой артели Российской Империи. Ваша цель — за 10 ходов набрать больше всех Очков Империи (ОИ). Захватывайте земли, стройте здания, торгуйте и используйте банк.',
    highlight: 'center',
  },
  {
    icon: '🗺️',
    title: 'Карта и биомы',
    description: 'Перед вами карта из трёх регионов: Сибирь 🌲, Русская Америка 🌊 и Закавказье 🐫. Каждый биом даёт свой базовый ресурс (🦊 🍞 ⚒️ 🧵 💰). Ваша столица уже отмечена цветом племени.',
    target: '[data-tutorial="map"]',
  },
  {
    icon: '⚔️',
    title: 'Захват территорий',
    description: 'Кликайте по подсвеченным ⚔️ секторам, чтобы захватить их. За ход можно захватить не более 2 секторов, и только те, что граничат с вашими владениями.',
    target: '[data-tutorial="map"]',
  },
  {
    icon: '🏗️',
    title: 'Постройка зданий',
    description: 'Кликните по своему сектору (без здания), чтобы открыть меню постройки. У каждого здания есть ограничения по биомам: Верфь только на побережье, Таможня — на Шёлковом пути.',
    target: '[data-tutorial="map"]',
  },
  {
    icon: '💰',
    title: 'Доход от территорий',
    description: 'В начале хода вы получаете доход со всех своих секторов и зданий. При этом летят монеты от карты к карточке вашего племени!',
    target: '[data-tutorial="next-turn"]',
  },
  {
    icon: '🎲',
    title: 'Случайные события',
    description: 'Бросайте кубик: на 4-6 выпадает событие — от "Удачной охоты" до "Суровой зимы". События дают или отнимают ресурсы.',
    target: '[data-tutorial="dice"]',
  },
  {
    icon: '🤝',
    title: 'Торговля с другими артелями',
    description: 'Обменивайтесь ресурсами напрямую. Это полезно, когда не хватает чего-то для постройки или возврата векселя.',
    target: '[data-tutorial="trade"]',
  },
  {
    icon: '🏦',
    title: 'Имперский Банк',
    description: 'В банке можно: 📜 Взять вексель (кредит на 3 хода под 60%), 💰 Открыть депозит (+30% за 3 хода), 📈 Выпустить пай (акцию здания, чтобы привлечь инвестора).',
    target: '[data-tutorial="bank"]',
  },
  {
    icon: '🏆',
    title: 'Монополии',
    description: 'Захватите все секторы биома или региона — получите монополию! Это +4…+8 ОИ разово и пассивный доход каждый ход. Монополии — самый быстрый путь к победе.',
    target: '[data-tutorial="tribes"]',
  },
  {
    icon: '⚙️',
    title: 'Панель учителя',
    description: 'В панели учителя можно расширить карту (добавить тайлов для большой группы), посмотреть журнал действий и статистику по каждой артели. Удачи!',
    target: '[data-tutorial="teacher"]',
  },
];

interface TutorialProps {
  onComplete: () => void;
}

export const Tutorial = ({ onComplete }: TutorialProps) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  useEffect(() => {
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }
    const element = document.querySelector(currentStep.target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }, 400);
    } else {
      setTargetRect(null);
    }
  }, [step, currentStep.target]);

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('eco-empire-tutorial-completed', 'true');
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep(step - 1);
  };

  const handleSkip = () => {
    localStorage.setItem('eco-empire-tutorial-completed', 'true');
    onComplete();
  };

  const maskStyle = targetRect
    ? {
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%,
          0% ${targetRect.top}px,
          ${targetRect.left}px ${targetRect.top}px,
          ${targetRect.left}px ${targetRect.bottom}px,
          ${targetRect.right}px ${targetRect.bottom}px,
          ${targetRect.right}px ${targetRect.top}px,
          0% ${targetRect.top}px
        )`,
      }
    : {};

  const getPositionStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.highlight === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '500px',
        width: '90%',
      };
    }

    const padding = 16;
    const windowHeight = 250;
    const viewportHeight = window.innerHeight;

    if (targetRect.bottom + windowHeight + padding < viewportHeight) {
      return {
        top: `${targetRect.bottom + padding}px`,
        left: `${Math.max(padding, targetRect.left)}px`,
        maxWidth: `${Math.min(500, window.innerWidth - 2 * padding)}px`,
        width: 'auto',
      };
    }
    return {
      bottom: `${viewportHeight - targetRect.top + padding}px`,
      left: `${Math.max(padding, targetRect.left)}px`,
      maxWidth: `${Math.min(500, window.innerWidth - 2 * padding)}px`,
      width: 'auto',
    };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      pointerEvents: 'auto',
    }}>
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50% { box-shadow: 0 0 0 20px rgba(251, 191, 36, 0); }
        }
        @keyframes tutorialFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          ...maskStyle,
        }}
        onClick={handleSkip}
      />

      {targetRect && (
        <div
          style={{
            position: 'absolute',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            border: '3px solid #fbbf24',
            borderRadius: '12px',
            pointerEvents: 'none',
            animation: 'tutorialPulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '1.2rem' : '1.5rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'tutorialFadeIn 0.3s ease-out',
          ...getPositionStyle(),
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
          marginBottom: '0.8rem'
        }}>
          <div style={{ fontSize: '2.5rem' }}>{currentStep.icon}</div>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? '1.1rem' : '1.3rem',
            color: '#1e293b',
            flex: 1,
          }}>
            {currentStep.title}
          </h2>
        </div>

        <p style={{
          margin: '0 0 1.2rem 0',
          fontSize: isMobile ? '0.9rem' : '1rem',
          color: '#475569',
          lineHeight: 1.5,
        }}>
          {currentStep.description}
        </p>

        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '1rem',
        }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= step ? '#fbbf24' : '#e2e8f0',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              padding: '0.5rem 0.8rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textDecoration: 'underline',
            }}
          >
            Пропустить
          </button>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {!isFirst && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '0.6rem 1rem',
                  background: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minHeight: '44px'
                }}
              >
                ← Назад
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                minHeight: '44px',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
              }}
            >
              {isLast ? 'Начать игру 🚀' : 'Далее →'}
            </button>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '0.8rem',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          Шаг {step + 1} из {STEPS.length}
        </div>
      </div>
    </div>
  );
};
