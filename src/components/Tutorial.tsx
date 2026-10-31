import { useState } from 'react';

interface TutorialProps {
  onClose: () => void;
}

export const Tutorial = ({ onClose }: TutorialProps) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: '👋 Добро пожаловать в Экономическую Империю!',
      text: 'Вы управляете торговой артелью. Ваша цель — заработать больше всего Очков Империи (ОИ) за 10 ходов.',
    },
    {
      title: '🗺️ Захват территорий',
      text: 'Нажимайте на свободные сектора, граничащие с вашими владениями. За ход можно захватить не более 2 секторов.',
    },
    {
      title: '🏗️ Строительство',
      text: 'Нажмите на свой сектор, чтобы построить здание. Разные здания требуют разных ресурсов и дают разный доход.',
    },
    {
      title: '🏦 Банк и Торговля',
      text: 'Используйте кнопку «Банк» для получения векселей или открытия депозитов. Торгуйте ресурсами с другими артелями.',
    },
    {
      title: '🏆 Монополии',
      text: 'Захватите все сектора одного биома или исторического региона, чтобы получить мощную монополию и бонусные ОИ!',
    }
  ];

  const current = steps[step - 1];
  const isLast = step === steps.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 5000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '2rem',
        maxWidth: '500px', width: '100%', textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>{current.title}</h2>
        <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
          {current.text}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {steps.map((_, i) => (
            <div 
              key={i} 
              style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                background: i + 1 === step ? '#3b82f6' : '#cbd5e1' 
              }} 
            />
          ))}
        </div>

        <button 
          onClick={() => isLast ? onClose() : setStep(step + 1)}
          style={{
            width: '100%', padding: '0.8rem',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          {isLast ? '🚀 Начать игру!' : 'Далее →'}
        </button>
      </div>
    </div>
  );
};
