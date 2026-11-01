import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTaskProgress,
  computeMonthlySummary,
  countDeliveriesThisWeek,
  cycleScheduleLabel,
  filterAndSortTasks,
  formatSpanishDate,
  getInitialSeedData,
  getPriorityTodayDelivery,
  validateTaskDraft,
} from './taskLogic';

test('calculateTaskProgress computes accurate percentages from subtasks', () => {
  const result = calculateTaskProgress([
    { completed: true },
    { completed: true },
    { completed: true },
    { completed: false },
    { completed: false },
  ]);
  assert.equal(result.progress, 60);
  assert.equal(result.totalSubtasks, 5);
  assert.equal(result.completedSubtasks, 3);
});

test('calculateTaskProgress falls back cleanly when there are 0 subtasks', () => {
  assert.equal(calculateTaskProgress([], 'pendiente').progress, 0);
  assert.equal(calculateTaskProgress([], 'en_marcha').progress, 50);
  assert.equal(calculateTaskProgress([], 'terminado').progress, 100);
});

test('formatSpanishDate detects today, tomorrow, and formats full Spanish dates', () => {
  const today = '2026-11-06';
  const todayFormatted = formatSpanishDate('2026-11-06', today);
  assert.equal(todayFormatted.isToday, true);
  assert.equal(todayFormatted.shortLabel, 'Entrega hoy');
  assert.equal(todayFormatted.fullDate, '6 de noviembre, 2026');

  const tomorrowFormatted = formatSpanishDate('2026-11-07', today);
  assert.equal(tomorrowFormatted.isTomorrow, true);
  assert.equal(tomorrowFormatted.shortLabel, 'Mañana');
});

test('validateTaskDraft enforces required fields and blueprint length limits', () => {
  const invalidEmpty = validateTaskDraft({ title: '   ', subtitle: 'Uni', dueDate: '2026-11-06' });
  assert.equal(invalidEmpty.valid, false);

  const validRes = validateTaskDraft({
    title: 'Examen de Cálculo',
    subtitle: 'Ingeniería',
    category: 'examen',
    status: 'pendiente',
    dueDate: '2026-11-12',
    tag: '',
    initialSubtasks: [{ title: 'Integrales dobles', scheduleLabel: 'Hoy' }],
  });
  assert.equal(validRes.valid, true);
  assert.equal(validRes.sanitized?.tag, 'Temario');
  assert.equal(validRes.sanitized?.initialSubtasks?.length, 1);
});

test('filterAndSortTasks filters by category and search query accurately', () => {
  const { tasks } = getInitialSeedData('2026-11-01');
  const exams = filterAndSortTasks(tasks, 'examen', '');
  assert.equal(exams.every((t) => t.category === 'examen'), true);
  assert.equal(exams.length, 2);

  const searchLumen = filterAndSortTasks(tasks, 'todo', 'Lumen');
  assert.equal(searchLumen.length, 1);
  assert.equal(searchLumen[0].id, 'task-estudio-lumen');
});

test('getPriorityTodayDelivery and weekly/monthly summaries compute expected values', () => {
  const today = '2026-11-01';
  const { tasks, subtasks } = getInitialSeedData(today);
  const priority = getPriorityTodayDelivery(tasks, subtasks, today);
  assert.ok(priority);
  assert.equal(priority.isToday, true);
  assert.equal(priority.task.id, 'task-estudio-lumen');
  assert.equal(priority.remainingSubtasks, 2);

  const weekly = countDeliveriesThisWeek(tasks, today);
  assert.equal(weekly >= 3, true);

  const summary = computeMonthlySummary(tasks);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.inProgressCount, 3);
  assert.equal(summary.pendingCount, 2);
});

test('cycleScheduleLabel rotates through timing tags', () => {
  assert.equal(cycleScheduleLabel(''), 'En curso');
  assert.equal(cycleScheduleLabel('En curso'), 'Hoy');
  assert.equal(cycleScheduleLabel('Hoy'), 'Mañana');
  assert.equal(cycleScheduleLabel('Mañana'), '');
});
