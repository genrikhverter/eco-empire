import { useGameStore } from '../store/gameStore';
import type { Assignment } from '../data/assignments';
import { getFgostopicById, UUD } from '../data/fgosTopics';
import { getFLTopicById } from '../data/financialLiteracy';

interface CriteriaResult {
  text: string;
  passed: boolean;
  details: string;
}

function checkSuccessCriteria(assignment: Assignment): CriteriaResult[] {
  const state = useGameStore.getState();
  const results: CriteriaResult[] = [];
  const currentTribe = state.tribes[0];

  for (const criterion of assignment.successCriteria) {
    const result = checkOneCriterion(criterion, state, currentTribe.id);
    results.push({ text: criterion, ...result });
  }

  return results;
}

function checkOneCriterion(
  criterion: string,
  state: ReturnType<typeof useGameStore.getState>,
  tribeId: string
): { passed: boolean; details: string } {
  const tribe = state.tribes.find((t) => t.id === tribeId);
  if (!tribe) return { passed: false, details: 'Нет данных' };

  const c = criterion.toLowerCase();

  const siberiaMatch = c.match(/(\d+).*сибир/i);
  if (siberiaMatch) {
    const required = parseInt(siberiaMatch[1]);
    const siberiaIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const owned = tribe.sectors.filter((s) => siberiaIds.includes(s)).length;
    return { passed: owned >= required, details: `Захвачено ${owned} из ${required} секторов Сибири` };
  }

  const americaMatch = c.match(/америк/i);
  if (americaMatch) {
    const americaIds = [10, 11, 12, 13, 14, 15, 16, 17];
    const owned = tribe.sectors.filter((s) => americaIds.includes(s)).length;
    return { passed: owned === 8, details: `Захвачено ${owned} из 8 секторов Русской Америки` };
  }

  const turkestanMatch = c.match(/закавказ|туркестан/i);
  if (turkestanMatch) {
    const turkestanIds = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    const owned = tribe.sectors.filter((s) => turkestanIds.includes(s)).length;
    return { passed: owned >= 10, details: `Захвачено ${owned} секторов Закавказья` };
  }

  const buildingMatch = c.match(/(\d+).*(острог|здани|верф|тамож)/i);
  if (buildingMatch) {
    const required = parseInt(buildingMatch[1]);
    const buildingType = buildingMatch[2].toLowerCase();
    let count = 0;
    for (const sectorId of tribe.sectors) {
      const sector = state.sectors.find((s) => s.id === sectorId);
      if (!sector?.buildingId) continue;
      const building = state.buildings.find((b) => b.id === sector.buildingId);
      if (!building) continue;
      if (buildingType.includes('острог') && building.id === 'fort') count++;
      else if (buildingType.includes('верф') && building.id === 'shipyard') count++;
      else if (buildingType.includes('тамож') && building.id === 'customs') count++;
      else if (buildingType.includes('здани')) count++;
    }
    return { passed: count >= required, details: `Построено ${count} из ${required} зданий` };
  }

  const resourceMatch = c.match(/(\d+).*(пушнин|🦊|руд|⚒️|рубл|💰|денег|ткан|🧵|провиз|🍞)/);
  if (resourceMatch) {
    const required = parseInt(resourceMatch[1]);
    let amount = 0;
    if (/пушнин|🦊/.test(c)) amount = tribe.resources.fur;
    else if (/руд|⚒️/.test(c)) amount = tribe.resources.ore;
    else if (/рубл|💰|денег/.test(c)) amount = tribe.resources.money;
    else if (/ткан|🧵/.test(c)) amount = tribe.resources.fabric;
    else if (/провиз|🍞/.test(c)) amount = tribe.resources.food;
    return { passed: amount >= required, details: `Накоплено ${amount} из ${required}` };
  }

  if (c.includes('монополи')) {
    const activeMonopolies = state.monopolies.filter((m) => m.tribeId === tribeId && m.active);
    return { passed: activeMonopolies.length > 0, details: `Активных монополий: ${activeMonopolies.length}` };
  }

  const scoreMatch = c.match(/(\d+).*ои|очк/i);
  if (scoreMatch) {
    const required = parseInt(scoreMatch[1]);
    return { passed: tribe.score >= required, details: `Очков Империи: ${tribe.score} из ${required}` };
  }

  const tradeMatch = c.match(/(\d+).*(сдел|торг)/i);
  if (tradeMatch) {
    const required = parseInt(tradeMatch[1]);
    const trades = state.trades.filter((t) => t.fromTribeId === tribeId).length;
    return { passed: trades >= required, details: `Заключено сделок: ${trades} из ${required}` };
  }

  if (c.includes('вексел')) {
    const repaidLoans = state.loans.filter((l) => l.tribeId === tribeId && l.repaid).length;
    return { passed: repaidLoans > 0, details: `Погашено векселей: ${repaidLoans}` };
  }

  if (c.includes('дефолт') || c.includes('не допущен')) {
    const logs = state.logs.filter((l) => l.tribeId === tribeId && l.action === 'default');
    return { passed: logs.length === 0, details: `Дефолтов: ${logs.length}` };
  }

  if (c.includes('депозит')) {
    const closedDeposits = state.deposits.filter((d) => d.tribeId === tribeId && d.closed).length;
    return { passed: closedDeposits > 0, details: `Созревших депозитов: ${closedDeposits}` };
  }

  if (c.includes('пай')) {
    const issuedShares = state.shares.filter((s) => s.emitterId === tribeId).length;
    return { passed: issuedShares > 0, details: `Выпущено паёв: ${issuedShares}` };
  }

  const diceMatch = c.match(/(\d+).*(брос|кубик)/i);
  if (diceMatch) {
    const required = parseInt(diceMatch[1]);
    const diceLogs = state.logs.filter((l) => l.tribeId === tribeId && l.action === 'event').length;
    return { passed: diceLogs >= required, details: `Бросков с результатом: ${diceLogs} из ${required}` };
  }

  return { passed: false, details: 'Критерий требует ручной проверки' };
}

// === ГЕНЕРАЦИЯ QMD-ОТЧЁТА (Quarto Markdown) ===

export function generateFGOSReport(): void {
  const savedAssignment = localStorage.getItem('eco-empire-active-assignment');
  if (!savedAssignment) {
    alert('❌ Нет активного задания!\n\nСначала выберите и запустите задание из вкладки «📚 Задания».');
    return;
  }

  const assignment: Assignment = JSON.parse(savedAssignment);
  const state = useGameStore.getState();
  const criteriaResults = checkSuccessCriteria(assignment);
  const passedCount = criteriaResults.filter((c) => c.passed).length;
  const totalCount = criteriaResults.length;
  const percent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const fgosTopic = assignment.fgosTopicId ? getFgostopicById(assignment.fgosTopicId) : null;
  const flTopic = assignment.financialLiteracyTopicId ? getFLTopicById(assignment.financialLiteracyTopicId) : null;

  // Экранирование для YAML
  const escapeYaml = (s: string) => s.replace(/"/g, '\\"');
  const today = new Date().toISOString().slice(0, 10);

  // === YAML-заголовок ===
  let qmd = `---
title: "Отчёт по ФГОС — ${escapeYaml(assignment.title)}"
subtitle: "Экономическая Империя · Образовательная игра"
date: ${today}
author: "Автоматически сгенерировано"
categories: [ФГОС, ${assignment.subject}, "${escapeYaml(assignment.grade)}"]
format:
  html:
    toc: true
    toc-depth: 3
    theme: cosmo
    code-fold: true
    self-contained: true
    embed-resources: true
  pdf:
    documentclass: article
    margin-left: 2cm
    margin-right: 2cm
    toc: true
---

# 📋 Паспорт урока

| Параметр | Значение |
|----------|----------|
| **Дата проведения** | ${new Date().toLocaleDateString('ru-RU')} |
| **Время** | ${new Date().toLocaleTimeString('ru-RU')} |
| **Задание** | ${assignment.title} |
| **Предмет** | ${assignment.subject === 'history' ? '🏛️ История' : assignment.subject === 'economics' ? '💼 Экономика' : assignment.subject === 'geography' ? '🗺️ География' : '📐 Математика'} |
| **Класс** | ${assignment.grade} |
| **Длительность** | ${assignment.duration} |
| **Ход игры** | ${state.turn}/10 |

## 📝 Описание задания

${assignment.description}

::: {.callout-note appearance="minimal"}
## 🎯 Цель задания

**${assignment.objective}**
:::

`;

  // === Тема по ФГОС ===
  if (fgosTopic) {
    qmd += `# 📚 Тема по ФГОС

| Поле | Значение |
|------|----------|
| **Код темы** | \`${fgosTopic.code}\` |
| **Раздел программы** | ${fgosTopic.section} |
| **Класс** | ${fgosTopic.grade} |

## ${fgosTopic.title}

${fgosTopic.description}

### Что ученики должны знать

${fgosTopic.requiredKnowledge.map((k) => `- ${k}`).join('\n')}

### Что ученики должны уметь

${fgosTopic.requiredSkills.map((s) => `- ${s}`).join('\n')}

`;
  }

  // === УУД ===
  if (assignment.fgosSkills && assignment.fgosSkills.length > 0) {
    qmd += `# 🎯 Формируемые УУД

`;
    assignment.fgosSkills.forEach((code) => {
      const uud = Object.values(UUD).find((u) => u.code === code);
      if (uud) {
        qmd += `- **${code} — ${uud.name}**: ${uud.description}\n`;
      }
    });
    qmd += `\n`;
  }

  // === Финансовая грамотность ===
  if (flTopic) {
    qmd += `# 💰 Финансовая грамотность

| Поле | Значение |
|------|----------|
| **Код темы** | \`${flTopic.code}\` |
| **Уровень** | ${flTopic.gradeLevel} |

## ${flTopic.title}

${flTopic.description}

### Ключевые понятия

${flTopic.keyConcepts.map((c) => `- ${c}`).join('\n')}

### Практические навыки

${flTopic.practicalSkills.map((s) => `- ${s}`).join('\n')}

### Формируемые компетенции

${flTopic.competencies.map((c) => `- ${c}`).join('\n')}

`;
  }

  // === Вопросы по финграмотности ===
  if (assignment.financialLiteracyQuestions && assignment.financialLiteracyQuestions.length > 0) {
    qmd += `# 💬 Вопросы по финансовой грамотности

::: {.callout-tip appearance="default"}
## Вопросы для обсуждения с учениками

Эти вопросы связывают игровую механику с реальными финансовыми понятиями и соответствуют теме **"${flTopic?.title || 'ФГ'}"**.
:::

`;
    assignment.financialLiteracyQuestions.forEach((q, i) => {
      qmd += `${i + 1}. **${q}**\n\n`;
    });
  }

  // === Общие вопросы для обсуждения ===
  if (assignment.discussionQuestions.length > 0) {
    qmd += `# 🗣️ Общие вопросы для обсуждения

`;
    assignment.discussionQuestions.forEach((q, i) => {
      qmd += `${i + 1}. ${q}\n`;
    });
    qmd += `\n`;
  }

  // === Результаты учеников ===
  qmd += `# 🏆 Результаты учеников

| Артель | ОИ | Секторов | Зданий | Захватов | Построек | Сделок | Дефолтов |
|--------|----|----------|--------|----------|----------|--------|----------|
`;

  state.tribes.forEach((t) => {
    const tribeLogs = state.logs.filter((l) => l.tribeId === t.id);
    const captures = tribeLogs.filter((l) => l.action === 'capture').length;
    const builds = tribeLogs.filter((l) => l.action === 'build').length;
    const trades = tribeLogs.filter((l) => l.action === 'trade').length;
    const defaults = tribeLogs.filter((l) => l.action === 'default').length;
    qmd += `| **${t.name}** | ${t.score} | ${t.sectors.length} | ${t.buildings.length} | ${captures} | ${builds} | ${trades} | ${defaults} |\n`;
  });

  qmd += `\n`;

  // === Проверка критериев ===
  qmd += `# ✅ Проверка критериев успеха

| Статус | Критерий | Фактический результат |
|:------:|----------|----------------------|
`;

  criteriaResults.forEach((r) => {
    const status = r.passed ? '✅' : '❌';
    qmd += `| ${status} | ${r.text} | ${r.details} |\n`;
  });

  qmd += `\n`;

  // === Итоговая оценка ===
  let grade = '';
  let emoji = '';
  if (passedCount === totalCount) {
    grade = 'Отлично — все критерии выполнены!';
    emoji = '🏆';
  } else if (passedCount >= totalCount * 0.7) {
    grade = 'Хорошо — большинство критериев выполнено';
    emoji = '👍';
  } else if (passedCount >= totalCount * 0.4) {
    grade = 'Удовлетворительно — есть над чем работать';
    emoji = '📝';
  } else {
    grade = 'Требуется доработка — мало выполненных критериев';
    emoji = '⚠️';
  }

  qmd += `::: {.callout-important appearance="default"}
## 📊 Итоговая оценка

- **Выполнено критериев:** ${passedCount} из ${totalCount} (${percent}%)
- **Оценка урока:** ${emoji} ${grade}
:::

`;

  // === Ресурсы племён ===
  qmd += `# 💼 Ресурсы племён

| Артель | 🦊 Пушнина | ⚒️ Руда | 🧵 Ткань | 🍞 Провизия | 💰 Рублей |
|--------|-----------|--------|---------|------------|----------|
`;

  state.tribes.forEach((t) => {
    qmd += `| **${t.name}** | ${t.resources.fur} | ${t.resources.ore} | ${t.resources.fabric} | ${t.resources.food} | ${t.resources.money} |\n`;
  });

  qmd += `\n`;

  // === Монополии ===
  const activeMonopolies = state.monopolies.filter((m) => m.active);
  if (activeMonopolies.length > 0) {
    qmd += `# 🏆 Активные монополии

| Артель | Тип | Название | ОИ | Доход/ход |
|--------|-----|----------|----:|----------:|
`;
    activeMonopolies.forEach((m) => {
      const tribe = state.tribes.find((t) => t.id === m.tribeId);
      qmd += `| ${tribe?.name || '?'} | ${m.kind === 'region' ? '🌍 Регион' : '🌿 Биом'} | ${m.icon} ${m.title} | +${m.scoreBonus} | +${m.moneyIncome} 💰 |\n`;
    });
    qmd += `\n`;
  }

  // === Подсказки ученикам ===
  if (assignment.tips.length > 0) {
    qmd += `# 💡 Подсказки для учеников (для справки)

${assignment.tips.map((t) => `- ${t}`).join('\n')}

`;
  }

  // === Рекомендации учителя ===
  qmd += `# 📝 Рекомендации учителя

*Заполните после проведения урока:*

................................................................................

................................................................................

................................................................................

................................................................................

**Подпись учителя:** ________________________

**Дата:** ${new Date().toLocaleDateString('ru-RU')}

---

*Отчёт сгенерирован автоматически в образовательной игре «Экономическая Империя»*
*Дата генерации: ${new Date().toLocaleString('ru-RU')}*
`;

  // === Скачивание файла ===
  const blob = new Blob([qmd], { type: 'text/x-qmd;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fgos-report-${assignment.id}-${today}.qmd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
