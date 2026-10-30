import { useEffect, useState } from 'react';

interface FlyingIcon {
  id: string;
  icon: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  duration: number;
  delay: number;
  size: number;
}

interface FlyingCoinsProps {
  icons: string[];             // иконки, которые должны полететь (🦊, 💰 и т.д.)
  fromRect: DOMRect | null;    // прямоугольник источника (карты)
  toRect: DOMRect | null;      // прямоугольник цели (карточки племени)
  onComplete: () => void;      // вызывается после завершения анимации
}

export const FlyingCoins = ({ icons, fromRect, toRect, onComplete }: FlyingCoinsProps) => {
  const [flying, setFlying] = useState<FlyingIcon[]>([]);

  useEffect(() => {
    if (!fromRect || !toRect || icons.length === 0) {
      return;
    }

    // Генерируем летящие иконки
    const newFlying: FlyingIcon[] = [];
    const count = Math.min(icons.length * 2, 15); // максимум 15 иконок

    for (let i = 0; i < count; i++) {
      const icon = icons[i % icons.length];
      // Случайная точка внутри области источника
      const fromX = fromRect.left + Math.random() * fromRect.width;
      const fromY = fromRect.top + Math.random() * fromRect.height;
      // Цель — центр карточки племени с небольшим разбросом
      const toX = toRect.left + toRect.width / 2 + (Math.random() - 0.5) * 30;
      const toY = toRect.top + toRect.height / 2 + (Math.random() - 0.5) * 20;

      newFlying.push({
        id: `fly_${Date.now()}_${i}`,
        icon,
        fromX,
        fromY,
        toX,
        toY,
        duration: 1200 + Math.random() * 600, // 1.2-1.8 сек
        delay: i * 50, // задержка между иконками (каскадный эффект)
        size: 20 + Math.random() * 12, // 20-32 px
      });
    }

    setFlying(newFlying);

    // Удаляем после завершения самой долгой анимации
    const maxDuration = Math.max(...newFlying.map((f) => f.duration + f.delay));
    const timer = window.setTimeout(() => {
      setFlying([]);
      onComplete();
    }, maxDuration + 100);

    return () => window.clearTimeout(timer);
  }, [icons, fromRect, toRect, onComplete]);

  if (flying.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes flyToTarget {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.5);
          }
          15% {
            opacity: 1;
            transform: translate(0, 0) scale(1.2);
          }
          85% {
            opacity: 1;
            transform: translate(var(--dx), var(--dy)) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) scale(0.3);
          }
        }
      `}</style>
      {flying.map((f) => {
        const dx = f.toX - f.fromX;
        const dy = f.toY - f.fromY;
        return (
          <div
            key={f.id}
            style={{
              position: 'fixed',
              left: f.fromX,
              top: f.fromY,
              fontSize: `${f.size}px`,
              pointerEvents: 'none',
              zIndex: 3000,
              // @ts-expect-error CSS-переменные
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: `flyToTarget ${f.duration}ms ease-in-out ${f.delay}ms forwards`,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              willChange: 'transform, opacity',
            }}
          >
            {f.icon}
          </div>
        );
      })}
    </>
  );
};
