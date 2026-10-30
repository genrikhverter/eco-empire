import { useEffect, useState } from 'react';
import { playDice } from '../utils/sounds';

interface DiceRollingProps {
  visible: boolean;
  onComplete: () => void;
}

// "Грани" кубика: точки как на настоящем кубике
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const DiceRolling = ({ visible, onComplete }: DiceRollingProps) => {
  const [faceIndex, setFaceIndex] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!visible) {
      setFaceIndex(0);
      setRotation(0);
      return;
    }

    playDice();

    // Быстрая смена граней каждые 100 мс
    const faceInterval = window.setInterval(() => {
      setFaceIndex((prev) => (prev + 1) % DICE_FACES.length);
    }, 100);

    // Плавное вращение кубика
    const rotateInterval = window.setInterval(() => {
      setRotation((prev) => prev + 30);
    }, 50);

    // Через 1.5 секунды завершаем анимацию
    const endTimer = window.setTimeout(() => {
      window.clearInterval(faceInterval);
      window.clearInterval(rotateInterval);
      onComplete();
    }, 1500);

    return () => {
      window.clearInterval(faceInterval);
      window.clearInterval(rotateInterval);
      window.clearTimeout(endTimer);
    };
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        animation: 'diceFadeIn 0.3s ease-out',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes diceFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes diceShake {
          0%, 100% { transform: translate(0, 0) scale(1); }
          10% { transform: translate(-8px, 4px) scale(1.05); }
          20% { transform: translate(6px, -6px) scale(1.08); }
          30% { transform: translate(-10px, 2px) scale(1.1); }
          40% { transform: translate(8px, 6px) scale(1.05); }
          50% { transform: translate(-4px, -8px) scale(1.12); }
          60% { transform: translate(6px, 4px) scale(1.05); }
          70% { transform: translate(-8px, -4px) scale(1.08); }
          80% { transform: translate(4px, 8px) scale(1.05); }
          90% { transform: translate(-6px, -2px) scale(1.1); }
        }
      `}</style>

      <div
        style={{
          fontSize: '140px',
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.05s linear',
          animation: 'diceShake 0.8s ease-in-out infinite',
          filter: 'drop-shadow(0 10px 30px rgba(251, 191, 36, 0.8))',
          userSelect: 'none'
        }}
      >
        {DICE_FACES[faceIndex]}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          letterSpacing: '0.15em',
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          textTransform: 'uppercase'
        }}
      >
        🎲 Бросок кубика...
      </div>
    </div>
  );
};
