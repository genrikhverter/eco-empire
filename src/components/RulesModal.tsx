import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface RulesModalProps {
  onClose: () => void;
}

type Section = 'goal' | 'turn' | 'map' | 'capture' | 'buildings' | 'income' | 'trade' | 'bank' | 'monopolies' | 'events' | 'victory';

const SECTIONS: { id: Section; title: string; icon: string }[] = [
  { id: 'goal', title: 'Цель игры', icon: '🎯' },
  { id: 'turn', title: 'Ход игры', icon: '⏭️' },
  { id: 'map', title: 'Карта и биомы', icon: '🗺️' },
  { id: 'capture', title: 'Захват территорий', icon: '⚔️' },
  { id: 'buildings', title: 'Здания', icon: '🏗️' },
  { id: 'income', title: 'Доход', icon: '💰' },
  { id: 'trade', title: 'Торговля', icon: '🤝' },
  { id: 'bank', title: 'Банк', icon: '🏦' },
  { id: 'monopolies', title: 'Монополии', icon: '🏆' },
  { id: 'events', title: 'События', icon: '🎲' },
  { id: 'victory', title: 'Победа', icon: '👑' },
];

export const RulesModal = ({ onClose }: RulesModalProps) => {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<Section>('goal');

  const renderContent = () => {
    switch (activeSection) {
      case 'goal':
        return (
          <>
            <h3>🎯 Цель игры</h3>
            <p>
              Вы — глава торговой артели Российской Империи XVIII века. Ваша задача — за <strong>10 ходов</strong> набрать
              больше всех <strong>Очков Империи (ОИ)</strong> и стать самой могущественной артелью.
            </p>
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Как набирать ОИ:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Строить здания (+2…+5 ОИ за каждое)</li>
                <li>Захватывать монополии (+4…+8 ОИ)</li>
                <li>Развивать свою территорию</li>
              </ul>
            </div>
            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример:</strong> Если у вас 3 здания (по 3 ОИ каждое) и монополия «Сибирь» (+8 ОИ),
              ваш итоговый счёт: 3×3 + 8 = <strong>17 ОИ</strong>.
            </div>
          </>
        );

      case 'turn':
        return (
          <>
            <h3>⏭️ Ход игры</h3>
            <p>Игра идёт по <strong>10 ходов</strong>. Каждый ход состоит из действий всех четырёх артелей по очереди.</p>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Что можно сделать за ход:</strong>
              <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li><strong>Захватить до 2 секторов</strong> (соседних с вашими владениями)</li>
                <li><strong>Построить здания</strong> на своих секторах</li>
                <li><strong>Бросить кубик</strong> — может выпасть событие</li>
                <li><strong>Торговать</strong> с другими артелями</li>
                <li><strong>Использовать банк</strong> — взять кредит, открыть вклад</li>
              </ol>
            </div>
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Важно:</strong> В начале каждого хода вы автоматически получаете <strong>доход</strong> со всех
              своих секторов и зданий. Монеты летят от карты к вашей карточке!
            </div>
          </>
        );

      case 'map':
        return (
          <>
            <h3>🗺️ Карта и биомы</h3>
            <p>Карта состоит из <strong>28+ секторов</strong>, разделённых на три региона и пять типов биомов.</p>
            
            <h4>🌍 Регионы:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Регион</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Секторов</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Особенность</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌲 Сибирь</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>10</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Пушнина и руда</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌊 Русская Америка</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>8</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Морские пути</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫 Закавказье</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>10</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Шёлковый путь</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ marginTop: '1.5rem' }}>🌿 Биомы и их ресурсы:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Биом</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Иконка</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Базовый доход</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Тайга</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌲</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🦊 +1 пушнина</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Горы</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>⛰️</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>⚒️ +1 руда</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Побережье</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌊</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🍞 +1 провизия</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Степь</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌾</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🍞 +1 провизия</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Шёлковый путь</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰 +1 рубль</td>
                </tr>
              </tbody>
            </table>
          </>
        );

      case 'capture':
        return (
          <>
            <h3>⚔️ Захват территорий</h3>
            <p>Чтобы захватить сектор, он должен быть <strong>свободным</strong> и <strong>соседним</strong> с вашими владениями.</p>
            
            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>⛔ Ограничения:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Не более <strong>2 захватов за ход</strong></li>
                <li>Только <strong>соседние сектора</strong> (граничащие с вашими)</li>
                <li>На карте всегда должно оставаться минимум <strong>8 свободных секторов</strong></li>
              </ul>
            </div>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример:</strong> У вас есть сектор #0. Вы можете захватить сектора #1 и #4 (они соседние).
              Но не можете захватить сектор #21 — он далеко и не граничит с вашими владениями.
            </div>

            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Совет:</strong> Подсвеченные ⚔️ секторы — это те, которые вы можете захватить прямо сейчас.
              Кликните по ним, подтвердите захват — и они станут вашими!
            </div>
          </>
        );

      case 'buildings':
        return (
          <>
            <h3>🏗️ Здания</h3>
            <p>Здания строятся на ваших секторах и дают <strong>доход</strong> и <strong>ОИ</strong>. У каждого здания есть ограничения по биомам.</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Здание</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Стоимость</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Доход</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>ОИ</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Где строить</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🏰 Острог</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🦊3 ⚒️2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🦊2 🍞1</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Везде</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🏪 Фактория</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🧵4 ⚒️2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌲🌊</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>⛪ Миссия</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🧵3 🍞3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>—</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Везде</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🚢 Верфь</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>⚒️5 🦊3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+4</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌊</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐎 Конный двор</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🍞4 🧵2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🦊2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌾</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🏛️ Таможня</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰5 ⚒️3 🧵2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+5</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫 Караван-сарай</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🧵4 🍞3</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰2</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+4</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌾🐫</td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример:</strong> У вас есть сектор на побережье (🌊). Вы можете построить там Верфь (🚢) за ⚒️5 и 🦊3.
              Каждый ход она будет приносить 💰2. Если у вас 3 Верфи, доход: 3×💰2 = 💰6 за ход.
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Совет:</strong> Стройте здания, которые дают много ОИ (Таможня +5, Верфь +4). Это быстрый путь к победе!
            </div>
          </>
        );

      case 'income':
        return (
          <>
            <h3>💰 Доход</h3>
            <p>В начале каждого хода вы получаете доход со всех своих секторов и зданий.</p>
            
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Что приносит доход:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li><strong>Секторы:</strong> каждый биом даёт свой базовый ресурс (🌲→🦊, ⛰️→⚒️, 🌊→🍞, 🌾→🍞, 🐫→💰)</li>
                <li><strong>Здания:</strong> каждое здание даёт свой доход (см. таблицу зданий)</li>
                <li><strong>Монополии:</strong> дают дополнительные ресурсы каждый ход</li>
              </ul>
            </div>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример расчёта дохода:</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                У вас 3 сектора: 🌲 (🦊1), 🌊 (🍞1), 🐫 (💰1).<br/>
                И 2 здания: 🏰 Острог (🦊2 🍞1), 🏛️ Таможня (💰3).<br/>
                <strong>Итого за ход:</strong> 🦊3 🍞2 💰4
              </p>
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Важно:</strong> Доход начисляется <strong>автоматически</strong> в начале хода.
              Вы увидите летящие монеты от карты к вашей карточке племени!
            </div>
          </>
        );

      case 'trade':
        return (
          <>
            <h3>🤝 Торговля</h3>
            <p>Вы можете обмениваться ресурсами с другими артелями напрямую.</p>
            
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Как торговать:</strong>
              <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Нажмите кнопку <strong>«🤝 Торговля»</strong></li>
                <li>Выберите партнёра (другую артель)</li>
                <li>Укажите, что вы отдаёте и что хотите получить</li>
                <li>Нажмите <strong>«✅ Совершить сделку»</strong></li>
              </ol>
            </div>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример:</strong> Вам нужна 🧵3 для постройки Фактории, но у вас её нет.
              Вы предлагаете Строгановым: «Отдам 🦊5, дайте 🧵3». Если они согласны — сделка совершена!
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Совет:</strong> Торговля полезна, когда не хватает ресурсов для постройки или возврата векселя.
              Договаривайтесь с другими игроками!
            </div>
          </>
        );

      case 'bank':
        return (
          <>
            <h3>🏦 Имперский Банк</h3>
            <p>Банк предоставляет три финансовые инструмента: векселя, депозиты и паи.</p>
            
            <h4>📜 Вексель (кредит)</h4>
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
              <p style={{ margin: 0 }}>
                Вы берёте деньги сейчас, но возвращаете <strong>больше через 3 хода</strong>.<br/>
                <strong>Пример:</strong> Взяли 💰5 → через 3 хода вернёте 💰8 (переплата 60%).<br/>
                <strong>Опасно:</strong> Если не вернёте — <strong>ДЕФОЛТ</strong>! Банк изымает сектор и штраф −2 ОИ.
              </p>
            </div>

            <h4 style={{ marginTop: '1.5rem' }}>💰 Депозит (вклад)</h4>
            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
              <p style={{ margin: 0 }}>
                Вы замораживаете деньги на 3 хода и получаете <strong>прибыль 30%</strong>.<br/>
                <strong>Пример:</strong> Положили 💰10 → через 3 хода получите 💰13.<br/>
                <strong>Ограничение:</strong> Досрочное снятие невозможно!
              </p>
            </div>

            <h4 style={{ marginTop: '1.5rem' }}>📈 Пай (акция здания)</h4>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
              <p style={{ margin: 0 }}>
                Выпускаете долю в своём здании, чтобы привлечь инвестора.<br/>
                <strong>Пример:</strong> Выпустили пай на Острог за 💰3, дивиденд 💰1/ход.
                Другая артель покупает пай → вы получаете 💰3 сразу, но платите им 💰1 каждый ход.<br/>
                <strong>Выгода:</strong> Быстрые деньги для развития, инвестор получает пассивный доход.
              </p>
            </div>

            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>⚠️ Осторожно с векселями!</strong> Если не сможете вернуть долг, потеряете сектор и ОИ.
              Берите кредит только если уверены, что сможете погасить.
            </div>
          </>
        );

      case 'monopolies':
        return (
          <>
            <h3>🏆 Монополии</h3>
            <p>Захватите <strong>все сектора</strong> биома или региона — получите монополию с бонусами!</p>
            
            <h4>🌍 Региональные монополии:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Регион</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Секторов</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Бонус ОИ</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Пассивный доход</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌲 Сибирь</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>10</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+8</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰3/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌊 Русская Америка</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>8</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+7</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰3/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫 Закавказье</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>10</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+8</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰3/ход</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ marginTop: '1.5rem' }}>🌿 Биомные монополии:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Биом</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Секторов</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Бонус ОИ</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left' }}>Пассивный доход</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌲 Лесная</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>6</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+4</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰1 🦊1/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>⛰️ Рудная</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>8</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+4</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰1 ⚒️1/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌊 Морская</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>6</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+5</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰2 🍞1/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🌾 Степная</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>5</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+5</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰2 🍞1/ход</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>🐫 Шёлковая</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>5</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>+6</td>
                  <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>💰2 💰1/ход</td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример:</strong> Вы захватили все 6 секторов побережья (🌊). Получаете монополию «Морская»:
              сразу +5 ОИ и каждый ход +💰2 +🍞1. Это очень выгодно!
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Стратегия:</strong> Монополии — самый быстрый путь к победе. Сосредоточьтесь на захвате
              целого биома или региона, а не разбрасывайтесь по карте.
            </div>
          </>
        );

      case 'events':
        return (
          <>
            <h3>🎲 Случайные события</h3>
            <p>Бросайте кубик каждый ход. На <strong>4-6</strong> выпадает событие, на <strong>1-3</strong> — ничего не происходит.</p>
            
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Позитивные события (дают ресурсы):</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>🦊 Удачная охота: +3 пушнины</li>
                <li>⚒️ Открытие месторождения: +3 руды</li>
                <li>🐫 Торговый караван: +2 ткани, +2 рубля</li>
                <li>🌾 Богатый урожай: +4 провизии</li>
                <li>💰 Императорская награда: +5 рублей</li>
              </ul>
            </div>

            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Негативные события (отнимают ресурсы):</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>❄️ Суровая зима: −3 провизии</li>
                <li>📉 Падение цен на пушнину: −3 рубля</li>
                <li>🏴‍☠️ Набег разбойников: −2 ткани</li>
                <li>⚠️ Обвал в шахте: −2 руды</li>
                <li>🦠 Эпидемия: −2 провизии, −1 пушнина</li>
                <li>📜 Налоговая ревизия: −4 рубля</li>
              </ul>
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Совет:</strong> События случайны, но держите запас ресурсов на случай негативных событий.
              Не тратьте всё сразу — оставьте «подушку безопасности».
            </div>
          </>
        );

      case 'victory':
        return (
          <>
            <h3>👑 Победа</h3>
            <p>Игра заканчивается через <strong>10 ходов</strong> или когда все сектора захвачены.</p>
            
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>Как определить победителя:</strong>
              <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Подсчитываются <strong>Очки Империи (ОИ)</strong> каждой артели</li>
                <li>Побеждает артель с <strong>наибольшим количеством ОИ</strong></li>
                <li>При равенстве — побеждает артель с большим количеством секторов</li>
              </ol>
            </div>

            <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>📝 Пример подсчёта:</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                <strong>Строгановы:</strong> 4 здания (по 3 ОИ) + монополия «Сибирь» (+8 ОИ) = 4×3 + 8 = <strong>20 ОИ</strong><br/>
                <strong>Шелиховы:</strong> 5 зданий (по 2 ОИ) + монополия «Морская» (+5 ОИ) = 5×2 + 5 = <strong>15 ОИ</strong><br/>
                <strong>Победитель:</strong> Строгановы с 20 ОИ! 🏆
              </p>
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <strong>💡 Стратегия победы:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Стройте здания с высокими ОИ (Таможня +5, Верфь +4)</li>
                <li>Захватывайте монополии (+4…+8 ОИ за каждую)</li>
                <li>Не теряйте секторы из-за дефолтов по векселям (−2 ОИ)</li>
                <li>Балансируйте между экспансией и развитием</li>
              </ul>
            </div>

            <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '8px', marginTop: '1rem', textAlign: 'center' }}>
              <strong style={{ fontSize: '1.2rem' }}>Удачи в игре! 🏰✨</strong>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {/* Боковая навигация */}
        <div style={{
          background: '#f8fafc',
          padding: '1rem',
          width: isMobile ? '100%' : '250px',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
          maxHeight: isMobile ? '200px' : 'none',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>📖 Правила</h2>
            <button
              onClick={onClose}
              style={{
                background: '#f87171', color: 'white', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  padding: '0.6rem 0.8rem',
                  background: activeSection === section.id ? '#3b82f6' : 'white',
                  color: activeSection === section.id ? 'white' : '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  fontWeight: activeSection === section.id ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        <div style={{
          flex: 1,
          padding: isMobile ? '1rem' : '2rem',
          overflowY: 'auto',
          maxHeight: isMobile ? 'calc(92vh - 200px)' : '92vh'
        }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
