import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { ASSIGNMENTS as BUILTIN_ASSIGNMENTS, SUBJECT_LABELS } from '../data/assignments';
import { UUD, getFgostopicById } from '../data/fgosTopics';
import { getFLTopicById } from '../data/financialLiteracy';
import { generateFGOSReport } from '../utils/fgosReport';
import {
  getCustomAssignments,
  importAssignmentsFromFile,
  exportAllAssignments,
  deleteCustomAssignment,
  getAssignmentTemplate,
} from '../utils/assignmentImport';
import type { Assignment } from '../data/assignments';
import type { LogAction } from '../types';

interface TeacherPanelProps {
  onClose: () => void;
}

const ACTION_LABELS: Record<LogAction, string> = {
  capture: '⚔️ Захват',
  build: '🏗️ Постройка',
  trade: '🤝 Сделка',
  loan_take: '📜 Вексель (взять)',
  loan_repay: '📜 Вексель (погасить)',
  deposit: '💰 Депозит',
  share_buy: '📈 Пай (покупка/див.)',
  share_issue: '📈 Пай (выпуск)',
  event: '🎴 Событие',
  monopoly: '🏆 Монополия',
  default: '⚠️ Дефолт',
  turn_start: '⏭️ Начало хода',
};

export const TeacherPanel = ({ onClose }: TeacherPanelProps) => {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'tools' | 'assignments' | 'journal' | 'stats'>('tools');
  const [filterTribe, setFilterTribe] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<LogAction | 'all'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [customAssignments, setCustomAssignments] = useState<Assignment[]>([]);

  const assignmentFileRef = useRef<HTMLInputElement>(null);

  const sectors = useGameStore((s) => s.sectors);
  const tribes = useGameStore((s) => s.tribes);
  const expansionLevel = useGameStore((s) => s.expansionLevel);
  const logs = useGameStore((s) => s.logs);
  const expandMap = useGameStore((s) => s.expandMap);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    setCustomAssignments(getCustomAssignments());
  }, []);

  const handleExpand = () => {
    const ok = expandMap();
    if (ok) {
      const newState = useGameStore.getState();
      alert(`✅ Карта расширена!\n\nУровень расширения: ${newState.expansionLevel}\nВсего тайлов: ${newState.sectors.length}`);
    }
  };

  const handleFullReset = () => {
    if (confirm('🔄 Полный сброс партии?\n\nБудут сброшены:\n• все сектора и здания\n• ресурсы всех племён\n• банк, монополии, паи\n• журнал действий\n\nСохранённый снимок останется.')) {
      resetGame();
      alert('✅ Партия сброшена.');
    }
  };

  const handleExportCSV = () => {
    const rows = [['Ход', 'Племя', 'Тип действия', 'Детали', 'Время']];
    for (const log of logs) {
      const time = new Date(log.timestamp).toLocaleTimeString('ru-RU');
      rows.push([
        String(log.turn),
        log.tribeName || '—',
        ACTION_LABELS[log.action],
        log.details.replace(/[,;]/g, ' '),
        time,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eco-empire-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartAssignment = (assignment: Assignment) => {
    const confirmMsg = `📚 Запустить задание «${assignment.title}»?\n\n` +
      `📝 ${assignment.description.slice(0, 100)}...\n\n` +
      `⏱️ Время: ${assignment.duration}\n` +
      `🎯 Цель: ${assignment.objective}\n\n` +
      `Игра будет сброшена и настроена под задание. Продолжить?`;

    if (!confirm(confirmMsg)) return;

    resetGame();

    if (assignment.startingConditions) {
      const state = useGameStore.getState();
      if (assignment.startingConditions.resources) {
        useGameStore.setState({
          tribes: state.tribes.map((t) => ({
            ...t,
            resources: {
              ...t.resources,
              ...assignment.startingConditions!.resources,
            },
          })),
        });
      }
      if (assignment.startingConditions.expansionLevel) {
        for (let i = 0; i < assignment.startingConditions.expansionLevel; i++) {
          useGameStore.getState().expandMap();
        }
      }
    }

    useGameStore.getState().addLog(
      'turn_start',
      `📚 ЗАДАНИЕ: ${assignment.title} | Код: ${assignment.id} | Цель: ${assignment.objective}`,
      null
    );

    localStorage.setItem('eco-empire-active-assignment', JSON.stringify(assignment));

    alert(`✅ Задание запущено!\n\n🎯 Цель: ${assignment.objective}\n⏱️ Время: ${assignment.duration}\n\nУдачи ученикам!`);
  };

  const handleImportAssignments = () => {
    assignmentFileRef.current?.click();
  };

  const handleAssignmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('❌ Пожалуйста, выберите JSON файл!');
      e.target.value = '';
      return;
    }

    const result = await importAssignmentsFromFile(file, BUILTIN_ASSIGNMENTS);
    alert(result.message);

    if (result.success) {
      setCustomAssignments(getCustomAssignments());
    }

    e.target.value = '';
  };

  const handleExportAssignments = () => {
    const all = [...BUILTIN_ASSIGNMENTS, ...customAssignments];
    exportAllAssignments(all);
    alert(`⬇️ Экспортировано ${all.length} заданий в JSON файл`);
  };

  const handleDownloadTemplate = () => {
    const template = getAssignmentTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignment-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('📥 Шаблон задания скачан!\n\nОткройте файл в текстовом редакторе, заполните поля и импортируйте обратно.\n\n💡 ID задания должен быть уникальным!');
  };

  const handleDeleteCustomAssignment = (assignmentId: string) => {
    if (!confirm('❌ Удалить это пользовательское задание?')) return;
    if (deleteCustomAssignment(assignmentId)) {
      setCustomAssignments(getCustomAssignments());
      alert('✅ Задание удалено');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterTribe !== 'all' && log.tribeId !== filterTribe) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    return true;
  });

  const tribeStats = tribes.map((t) => {
    const tribeLogs = logs.filter((l) => l.tribeId === t.id);
    const actions = tribeLogs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action] = (acc[l.action] || 0) + 1;
      return acc;
    }, {});
    return {
      tribe: t,
      totalActions: tribeLogs.length,
      captures: actions.capture || 0,
      builds: actions.build || 0,
      trades: actions.trade || 0,
      loans: (actions.loan_take || 0) + (actions.loan_repay || 0),
      deposits: actions.deposit || 0,
      shares: (actions.share_buy || 0) + (actions.share_issue || 0),
      monopolies: actions.monopoly || 0,
      defaults: actions.default || 0,
    };
  });

  const allAssignments = [
    ...BUILTIN_ASSIGNMENTS,
    ...customAssignments.map((a) => ({ ...a, isCustom: true })),
  ];
  const filteredAssignments = allAssignments.filter(
    (a) => subjectFilter === 'all' || a.subject === subjectFilter
  );

  const tabButton = (id: typeof tab, label: string) => (
    <button
      onClick={() => { setTab(id); setSelectedAssignment(null); }}
      style={{
        flex: 1,
        padding: '0.6rem 0.3rem',
        background: tab === id ? '#475569' : '#e2e8f0',
        color: tab === id ? 'white' : '#1e293b',
        border: 'none',
        borderRadius: '8px',
        fontSize: isMobile ? '0.72rem' : '0.85rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        minHeight: '44px'
      }}
    >
      {label}
    </button>
  );

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
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem' }}>
            ⚙️ Панель учителя
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

        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
          {tabButton('tools', '🛠️ Инструменты')}
          {tabButton('assignments', '📚 Задания')}
          {tabButton('journal', '📋 Журнал')}
          {tabButton('stats', '📊 Статистика')}
        </div>

        {/* === ВКЛАДКА: ИНСТРУМЕНТЫ === */}
        {tab === 'tools' && (
          <>
            <div style={{
              background: '#eff6ff', border: '2px solid #3b82f6',
              borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>
                🗺️ Текущее состояние карты
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Тайлов: <strong>{sectors.length}</strong> | Уровень расширения: <strong>{expansionLevel}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{
                border: '2px solid #3b82f6', borderRadius: '8px',
                padding: '1rem', background: '#eff6ff'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e40af' }}>
                  ➕ Расширить карту (+8 тайлов)
                </h3>
                <button
                  onClick={handleExpand}
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px'
                  }}
                >
                  ➕ Расширить сейчас
                </button>
              </div>

              <div style={{
                border: '2px solid #f87171', borderRadius: '8px',
                padding: '1rem', background: '#fef2f2'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#991b1b' }}>
                  🔄 Полный сброс партии
                </h3>
                <button
                  onClick={handleFullReset}
                  style={{
                    width: '100%', padding: '0.8rem',
                    background: 'linear-gradient(135deg, #f87171, #dc2626)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px'
                  }}
                >
                  🔄 Сбросить партию
                </button>
              </div>
            </div>
          </>
        )}

        {/* === ВКЛАДКА: ЗАДАНИЯ - СПИСОК (когда ничего не выбрано) === */}
        {tab === 'assignments' && selectedAssignment === null && (
          <>
            <div style={{
              background: '#fef9c3', border: '2px solid #facc15',
              borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem',
              fontSize: '0.85rem', color: '#713f12'
            }}>
              <strong>📚 Библиотека заданий:</strong> {BUILTIN_ASSIGNMENTS.length} встроенных + {customAssignments.length} пользовательских
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <button
                onClick={handleImportAssignments}
                style={{
                  padding: '0.6rem 0.5rem',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                📥 Импорт заданий
              </button>
              <button
                onClick={handleExportAssignments}
                style={{
                  padding: '0.6rem 0.5rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                📤 Экспорт всех
              </button>
              <button
                onClick={handleDownloadTemplate}
                style={{
                  padding: '0.6rem 0.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                📝 Скачать шаблон
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSubjectFilter('all')}
                style={{
                  padding: '0.5rem 0.8rem',
                  background: subjectFilter === 'all' ? '#1e293b' : '#e2e8f0',
                  color: subjectFilter === 'all' ? 'white' : '#1e293b',
                  border: 'none', borderRadius: '6px',
                  fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                Все ({allAssignments.length})
              </button>
              {Object.entries(SUBJECT_LABELS).map(([key, label]) => {
                const count = allAssignments.filter((a) => a.subject === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSubjectFilter(key)}
                    style={{
                      padding: '0.5rem 0.8rem',
                      background: subjectFilter === key ? '#1e293b' : '#e2e8f0',
                      color: subjectFilter === key ? 'white' : '#1e293b',
                      border: 'none', borderRadius: '6px',
                      fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {filteredAssignments.map((assignment) => {
                const isCustom = 'isCustom' in assignment && Boolean(assignment.isCustom);
                return (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignment(assignment)}
                    style={{
                      border: `2px solid ${isCustom ? '#ec4899' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '0.9rem',
                      background: isCustom ? '#fdf2f8' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(59,130,246,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = isCustom ? '#ec4899' : '#e2e8f0';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {isCustom && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '10px',
                        background: '#ec4899',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        👤 Моё
                      </span>
                    )}

                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomAssignment(assignment.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#f87171',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          lineHeight: '1',
                          padding: 0
                        }}
                        title="Удалить задание"
                      >
                        ×
                      </button>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem', paddingRight: isCustom ? '32px' : '0' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', flex: 1 }}>{assignment.title}</h3>
                      <span style={{
                        background: '#f1f5f9', padding: '0.2rem 0.5rem',
                        borderRadius: '4px', fontSize: '0.7rem', color: '#64748b',
                        whiteSpace: 'nowrap'
                      }}>
                        {assignment.grade} · {assignment.duration}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontFamily: 'monospace' }}>
                      Код: {assignment.id}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem' }}>
                      {assignment.description.slice(0, 120)}...
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 'bold' }}>
                      🎯 {assignment.objective}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* === ВКЛАДКА: ЗАДАНИЯ - ДЕТАЛИ (когда выбрано задание) === */}
        {tab === 'assignments' && selectedAssignment !== null && (
          <>
            <button
              onClick={() => setSelectedAssignment(null)}
              style={{
                background: '#e2e8f0', color: '#1e293b', border: 'none',
                borderRadius: '6px', padding: '0.5rem 1rem',
                fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem',
                fontWeight: 'bold'
              }}
            >
              ← Назад к списку
            </button>

            <div style={{
              background: 'linear-gradient(135deg, #fef9c3, #fde68a)',
              border: '2px solid #facc15',
              borderRadius: '12px',
              padding: isMobile ? '1rem' : '1.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#78350f' }}>
                  {SUBJECT_LABELS[selectedAssignment.subject]} · {selectedAssignment.grade}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#78350f' }}>
                  ⏱️ {selectedAssignment.duration}
                </span>
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '1.1rem' : '1.3rem', color: '#78350f' }}>
                {selectedAssignment.title}
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontFamily: 'monospace', marginBottom: '0.7rem' }}>
                Код: {selectedAssignment.id}
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#713f12', lineHeight: 1.5 }}>
                {selectedAssignment.description}
              </p>
            </div>

            {selectedAssignment.fgosTopicId && (() => {
              const topic = getFgostopicById(selectedAssignment.fgosTopicId);
              if (!topic) return null;
              return (
                <div style={{ background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e40af' }}>
                    📚 Тема по ФГОС
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                    Код: {topic.code} | {topic.grade} | Раздел: {topic.section}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#1e3a8a', fontWeight: 'bold', marginBottom: '0.7rem' }}>
                    {topic.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.7rem', lineHeight: 1.5 }}>
                    {topic.description}
                  </div>

                  <div style={{ marginTop: '0.7rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#1e40af' }}>Ученики должны знать:</strong>
                    <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      {topic.requiredKnowledge.slice(0, 3).map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: '0.7rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#1e40af' }}>Ученики должны уметь:</strong>
                    <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      {topic.requiredSkills.slice(0, 3).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {selectedAssignment.fgosSkills && selectedAssignment.fgosSkills.length > 0 && (
              <div style={{ background: '#f3e8ff', border: '2px solid #a78bfa', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#5b21b6' }}>
                  🎯 Формируемые УУД
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedAssignment.fgosSkills.map((code) => {
                    const uud = Object.values(UUD).find((u) => u.code === code);
                    return (
                      <span
                        key={code}
                        style={{
                          background: '#e9d5ff',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#6b21a8',
                          fontWeight: 'bold'
                        }}
                        title={uud?.description || code}
                      >
                        {uud?.name || code}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedAssignment.financialLiteracyTopicId && (() => {
              const flTopic = getFLTopicById(selectedAssignment.financialLiteracyTopicId);
              if (!flTopic) return null;
              return (
                <div style={{ background: '#d1fae5', border: '2px solid #10b981', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#065f46' }}>
                    💰 Финансовая грамотность
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                    Код: {flTopic.code} | {flTopic.gradeLevel}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#064e3b', fontWeight: 'bold', marginBottom: '0.7rem' }}>
                    {flTopic.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.7rem', lineHeight: 1.5 }}>
                    {flTopic.description}
                  </div>

                  <div style={{ marginTop: '0.7rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#065f46' }}>Ключевые понятия:</strong>
                    <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      {flTopic.keyConcepts.slice(0, 4).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: '0.7rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#065f46' }}>Практические навыки:</strong>
                    <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      {flTopic.practicalSkills.slice(0, 3).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: '0.7rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#065f46' }}>Формируемые компетенции:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                      {flTopic.competencies.map((comp, i) => (
                        <span
                          key={i}
                          style={{
                            background: '#a7f3d0',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#065f46',
                            fontWeight: 'bold'
                          }}
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {selectedAssignment.financialLiteracyQuestions && selectedAssignment.financialLiteracyQuestions.length > 0 && (
              <div style={{ background: '#ecfdf5', border: '2px solid #34d399', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#065f46' }}>
                  💬 Вопросы по финансовой грамотности
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Эти вопросы войдут в итоговый отчёт по ФГОС
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#064e3b' }}>
                  {selectedAssignment.financialLiteracyQuestions.map((q, i) => (
                    <li key={i} style={{ marginBottom: '0.4rem', fontSize: '0.9rem' }}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            <div style={{ background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e40af' }}>🎯 Цель задания</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e3a8a', fontWeight: 'bold' }}>
                {selectedAssignment.objective}
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#166534' }}>✅ Критерии успеха</h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#14532d' }}>
                {selectedAssignment.successCriteria.map((c, i) => (
                  <li key={i} style={{ marginBottom: '0.3rem' }}>{c}</li>
                ))}
              </ul>
            </div>

            {selectedAssignment.tips.length > 0 && (
              <div style={{ background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#92400e' }}>💡 Подсказки ученикам</h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#78350f' }}>
                  {selectedAssignment.tips.map((t, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedAssignment.discussionQuestions.length > 0 && (
              <div style={{ background: '#f3e8ff', border: '2px solid #a78bfa', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#5b21b6' }}>🗣️ Вопросы для обсуждения после игры</h3>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b21a8' }}>
                  {selectedAssignment.discussionQuestions.map((q, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            <button
              onClick={() => handleStartAssignment(selectedAssignment)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #4ade80, #16a34a)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                minHeight: '56px',
                boxShadow: '0 4px 12px rgba(22,163,74,0.4)'
              }}
            >
              🚀 Запустить задание
            </button>
          </>
        )}

        {/* === ВКЛАДКА: ЖУРНАЛ === */}
        {tab === 'journal' && (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <select
                value={filterTribe}
                onChange={(e) => setFilterTribe(e.target.value)}
                style={{
                  padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                  fontSize: '0.85rem', flex: 1, minWidth: '120px'
                }}
              >
                <option value="all">Все племена</option>
                {tribes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as LogAction | 'all')}
                style={{
                  padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                  fontSize: '0.85rem', flex: 1, minWidth: '120px'
                }}
              >
                <option value="all">Все действия</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <button
                onClick={handleExportCSV}
                style={{
                  padding: '0.5rem 1rem', background: '#10b981', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '0.85rem',
                  fontWeight: 'bold', cursor: 'pointer', minHeight: '38px'
                }}
              >
                📥 CSV
              </button>
            </div>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '0.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.8rem'
            }}>
              Показано: <strong>{filteredLogs.length}</strong> из {logs.length} записей
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                📭 Журнал пуст — начните играть!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {filteredLogs.slice(0, 100).map((log) => {
                  const tribe = tribes.find((t) => t.id === log.tribeId);
                  const time = new Date(log.timestamp).toLocaleTimeString('ru-RU');
                  return (
                    <div
                      key={log.id}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${tribe?.color || '#94a3b8'}`,
                        borderRadius: '6px',
                        padding: '0.5rem 0.7rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <strong style={{ color: '#64748b' }}>Ход {log.turn}</strong>
                          {log.tribeName && (
                            <span style={{ color: tribe?.color, fontWeight: 'bold' }}>
                              {log.tribeName}
                            </span>
                          )}
                          <span style={{
                            background: '#f1f5f9', padding: '0.1rem 0.4rem',
                            borderRadius: '4px', fontSize: '0.75rem'
                          }}>
                            {ACTION_LABELS[log.action]}
                          </span>
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{time}</span>
                      </div>
                      <div style={{ marginTop: '0.2rem', color: '#334155' }}>
                        {log.details}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === ВКЛАДКА: СТАТИСТИКА === */}
        {tab === 'stats' && (
          <>
            <div style={{
              background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '8px',
              padding: '0.7rem', marginBottom: '1rem', fontSize: '0.85rem'
            }}>
              📊 Аналитика действий каждой артели за всю партию
            </div>

            <button
              onClick={() => generateFGOSReport()}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                marginBottom: '1rem', minHeight: '52px',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
              }}
            >
              📄 Экспорт отчёта по ФГОС (QMD)
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {tribeStats.map((s) => (
                <div
                  key={s.tribe.id}
                  style={{
                    border: `2px solid ${s.tribe.color}`,
                    borderLeftWidth: '6px',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    background: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: s.tribe.color, fontSize: '1rem' }}>
                      {s.tribe.name}
                    </h3>
                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                      🏆 {s.tribe.score} ОИ
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                    gap: '0.3rem',
                    fontSize: '0.8rem'
                  }}>
                    <div>⚔️ {s.captures}</div>
                    <div>🏗️ {s.builds}</div>
                    <div>🤝 {s.trades}</div>
                    <div>📜 {s.loans}</div>
                    <div>💰 {s.deposits}</div>
                    <div>📈 {s.shares}</div>
                    <div>🏆 {s.monopolies}</div>
                    <div style={{ color: s.defaults > 0 ? '#dc2626' : '#64748b' }}>
                      ⚠️ {s.defaults}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <input
          ref={assignmentFileRef}
          type="file"
          accept=".json"
          onChange={handleAssignmentFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};
