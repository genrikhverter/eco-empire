import type { Assignment } from '../data/assignments';

const STORAGE_KEY = 'eco-empire-custom-assignments';

// Валидация структуры задания
function validateAssignment(data: unknown): data is Assignment {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  
  // Обязательные поля
  if (typeof obj.id !== 'string' || obj.id.trim() === '') return false;
  if (typeof obj.subject !== 'string') return false;
  if (!['history', 'economics', 'geography', 'math'].includes(obj.subject)) return false;
  if (typeof obj.grade !== 'string') return false;
  if (typeof obj.title !== 'string') return false;
  if (typeof obj.description !== 'string') return false;
  if (typeof obj.objective !== 'string') return false;
  if (typeof obj.duration !== 'string') return false;
  
  // Массивы
  if (!Array.isArray(obj.successCriteria)) return false;
  if (!Array.isArray(obj.tips)) return false;
  if (!Array.isArray(obj.discussionQuestions)) return false;
  
  // Опциональные поля
  if (obj.fgosTopicId !== undefined && typeof obj.fgosTopicId !== 'string') return false;
  if (obj.financialLiteracyTopicId !== undefined && typeof obj.financialLiteracyTopicId !== 'string') return false;
  if (obj.fgosSkills !== undefined && !Array.isArray(obj.fgosSkills)) return false;
  if (obj.financialLiteracyQuestions !== undefined && !Array.isArray(obj.financialLiteracyQuestions)) return false;
  
  // startingConditions (опционально)
  if (obj.startingConditions !== undefined) {
    if (typeof obj.startingConditions !== 'object' || obj.startingConditions === null) return false;
  }
  
  return true;
}

// Получить все пользовательские задания
export function getCustomAssignments(): Assignment[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved) as Assignment[];
  } catch {
    return [];
  }
}

// Сохранить пользовательские задания
export function saveCustomAssignments(assignments: Assignment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// Импортировать задания из JSON с проверкой уникальности ID
export function importAssignmentsFromFile(
  file: File,
  builtinAssignments: Assignment[]
): Promise<{
  success: boolean;
  message: string;
  imported: number;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Проверяем, массив это или одиночный объект
        let assignments: unknown[];
        if (Array.isArray(data)) {
          assignments = data;
        } else if (typeof data === 'object' && data !== null && 'assignments' in data) {
          const obj = data as { assignments: unknown };
          if (!Array.isArray(obj.assignments)) {
            resolve({ success: false, message: 'Поле "assignments" должно быть массивом', imported: 0 });
            return;
          }
          assignments = obj.assignments;
        } else {
          assignments = [data];
        }
        
        const existing = getCustomAssignments();
        const existingIds = new Set([
          ...builtinAssignments.map((a) => a.id),
          ...existing.map((a) => a.id),
        ]);
        
        let imported = 0;
        const errors: string[] = [];
        const skippedDuplicates: string[] = [];
        
        for (const item of assignments) {
          if (!validateAssignment(item)) {
            errors.push(`Задание ${JSON.stringify(item).slice(0, 50)}... имеет неверную структуру`);
            continue;
          }
          
          // Проверяем уникальность ID
          if (existingIds.has(item.id)) {
            skippedDuplicates.push(item.id);
            continue;
          }
          
          existing.push(item);
          existingIds.add(item.id);
          imported++;
        }
        
        if (imported > 0) {
          saveCustomAssignments(existing);
        }
        
        let message = '';
        if (imported > 0) {
          message += `✅ Импортировано заданий: ${imported}\n\n`;
        }
        if (skippedDuplicates.length > 0) {
          message += `⚠️ Пропущено (дубликаты ID): ${skippedDuplicates.length}\n`;
          message += skippedDuplicates.map((id) => `  • ${id}`).join('\n');
          message += '\n\n';
        }
        if (errors.length > 0) {
          message += `❌ Ошибки структуры: ${errors.length}\n`;
          message += errors.slice(0, 3).map((e) => `  • ${e}`).join('\n');
        }
        
        if (imported === 0 && skippedDuplicates.length === 0 && errors.length === 0) {
          message = '❌ Файл не содержит валидных заданий';
        }
        
        resolve({ success: imported > 0, message: message.trim(), imported });
      } catch (error) {
        resolve({
          success: false,
          message: `Ошибка парсинга JSON: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`,
          imported: 0,
        });
      }
    };
    
    reader.onerror = () => {
      resolve({ success: false, message: 'Ошибка чтения файла', imported: 0 });
    };
    
    reader.readAsText(file);
  });
}

// Экспортировать все задания (встроенные + пользовательские) в JSON
export function exportAllAssignments(assignments: Assignment[]): void {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    assignments,
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `eco-empire-assignments-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Удалить пользовательское задание
export function deleteCustomAssignment(assignmentId: string): boolean {
  const existing = getCustomAssignments();
  const filtered = existing.filter((a) => a.id !== assignmentId);
  if (filtered.length === existing.length) return false;
  saveCustomAssignments(filtered);
  return true;
}

// Проверить, существует ли задание с таким ID
export function assignmentIdExists(
  id: string,
  builtinAssignments: Assignment[],
  customAssignments: Assignment[]
): boolean {
  return (
    builtinAssignments.some((a) => a.id === id) ||
    customAssignments.some((a) => a.id === id)
  );
}

// Шаблон для создания нового задания с уникальным ID
export function getAssignmentTemplate(): string {
  const uniqueSuffix = Date.now().toString(36);
  const template: Assignment = {
    id: `custom_${uniqueSuffix}`,
    subject: 'history',
    grade: '7 класс',
    title: '📝 Моё задание',
    description: 'Описание задания для учеников. Что они должны сделать в игре?',
    objective: 'Конкретная цель задания (например: захватить 5 секторов)',
    successCriteria: [
      'Критерий 1 (например: Захвачено ≥5 секторов)',
      'Критерий 2 (например: Построено ≥2 здания)',
      'Критерий 3 (например: Накоплено ≥10 ресурсов)',
    ],
    duration: '30 минут',
    startingConditions: {
      resources: { fur: 5, ore: 5, fabric: 5, food: 5, money: 10 },
    },
    tips: [
      'Совет 1 для учеников',
      'Совет 2 для учеников',
      'Совет 3 для учеников',
    ],
    discussionQuestions: [
      'Вопрос 1 для обсуждения после игры',
      'Вопрос 2 для обсуждения',
      'Вопрос 3 для обсуждения',
    ],
    fgosTopicId: 'hist_7_stroganov',
    fgosSkills: ['Л2', 'П1', 'П2'],
    financialLiteracyTopicId: 'fl_budget',
    financialLiteracyQuestions: [
      'Вопрос по финграмотности 1',
      'Вопрос по финграмотности 2',
    ],
  };
  
  return JSON.stringify({ assignments: [template] }, null, 2);
}
