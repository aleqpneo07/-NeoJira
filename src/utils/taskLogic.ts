import {
  NavigationFilter,
  SUBTASK_CONSTRAINTS,
  SubtaskItem,
  TASK_CONSTRAINTS,
  TaskCategory,
  TaskDraftInput,
  TaskItem,
  TaskStatus,
} from '../types/tasks';

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SPANISH_MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateTaskProgress(
  subtasks: Pick<SubtaskItem, 'completed'>[],
  fallbackStatus?: TaskStatus
): { progress: number; totalSubtasks: number; completedSubtasks: number } {
  const totalSubtasks = Math.min(subtasks.length, TASK_CONSTRAINTS.MAX_SUBTASKS);
  if (totalSubtasks === 0) {
    const fallbackProgress =
      fallbackStatus === 'terminado' ? 100 : fallbackStatus === 'en_marcha' ? 50 : 0;
    return {
      progress: fallbackProgress,
      totalSubtasks: 0,
      completedSubtasks: 0,
    };
  }
  const completedSubtasks = Math.min(
    subtasks.slice(0, totalSubtasks).filter((s) => s.completed).length,
    totalSubtasks
  );
  const progress = Math.round((completedSubtasks / totalSubtasks) * 100);
  return { progress, totalSubtasks, completedSubtasks };
}

export function formatSpanishDate(
  isoDate: string,
  todayIso: string
): {
  fullDate: string;
  shortLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  isOverdue: boolean;
  isThisWeek: boolean;
  diffDays: number;
} {
  if (!TASK_CONSTRAINTS.DUE_DATE_PATTERN.test(isoDate)) {
    return {
      fullDate: isoDate,
      shortLabel: isoDate,
      isToday: false,
      isTomorrow: false,
      isOverdue: false,
      isThisWeek: false,
      diffDays: 99,
    };
  }

  const [y, m, d] = isoDate.split('-').map(Number);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const targetMs = Date.UTC(y, m - 1, d);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));

  const monthName = SPANISH_MONTHS[(m - 1 + 12) % 12] || 'noviembre';
  const monthShort = SPANISH_MONTHS_SHORT[(m - 1 + 12) % 12] || 'nov';
  const fullDate = `${d} de ${monthName}, ${y}`;

  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;
  const isOverdue = diffDays < 0;
  const isThisWeek = diffDays >= 0 && diffDays <= 7;

  let shortLabel = `${d} ${monthShort}`;
  if (isToday) shortLabel = 'Entrega hoy';
  else if (isTomorrow) shortLabel = 'Mañana';
  else if (isOverdue) shortLabel = `Hace ${Math.abs(diffDays)} d`;

  return {
    fullDate,
    shortLabel,
    isToday,
    isTomorrow,
    isOverdue,
    isThisWeek,
    diffDays,
  };
}

export function validateTaskDraft(draft: Partial<TaskDraftInput>): {
  valid: boolean;
  error?: string;
  sanitized?: TaskDraftInput;
} {
  const title = (draft.title ?? '').trim().slice(0, TASK_CONSTRAINTS.TITLE_MAX_LEN);
  const subtitle = (draft.subtitle ?? '').trim().slice(0, TASK_CONSTRAINTS.SUBTITLE_MAX_LEN);
  const tag = (draft.tag ?? '').trim().slice(0, TASK_CONSTRAINTS.TAG_MAX_LEN);
  const dueDate = (draft.dueDate ?? '').trim();
  const category: TaskCategory =
    draft.category === 'trabajo' || draft.category === 'examen' || draft.category === 'diario'
      ? draft.category
      : 'trabajo';
  const status: TaskStatus =
    draft.status === 'pendiente' || draft.status === 'en_marcha' || draft.status === 'terminado'
      ? draft.status
      : 'pendiente';

  if (title.length < TASK_CONSTRAINTS.TITLE_MIN_LEN) {
    return { valid: false, error: 'El título es obligatorio.' };
  }
  if (subtitle.length < TASK_CONSTRAINTS.SUBTITLE_MIN_LEN) {
    return { valid: false, error: 'La asignatura, cliente o contexto es obligatorio.' };
  }
  if (!TASK_CONSTRAINTS.DUE_DATE_PATTERN.test(dueDate)) {
    return { valid: false, error: 'Selecciona una fecha válida (AAAA-MM-DD).' };
  }

  const finalTag =
    tag.length >= TASK_CONSTRAINTS.TAG_MIN_LEN
      ? tag
      : category === 'examen'
      ? 'Temario'
      : category === 'trabajo'
      ? 'Proyecto'
      : 'Rutina';

  const sanitizedSubtasks = (draft.initialSubtasks ?? [])
    .map((s) => ({
      title: (s.title ?? '').trim().slice(0, SUBTASK_CONSTRAINTS.TITLE_MAX_LEN),
      scheduleLabel: (s.scheduleLabel ?? '').trim().slice(0, SUBTASK_CONSTRAINTS.LABEL_MAX_LEN),
      completed: Boolean(s.completed),
    }))
    .filter((s) => s.title.length >= SUBTASK_CONSTRAINTS.TITLE_MIN_LEN)
    .slice(0, TASK_CONSTRAINTS.MAX_SUBTASKS);

  return {
    valid: true,
    sanitized: {
      title,
      subtitle,
      category,
      status,
      dueDate,
      tag: finalTag,
      initialSubtasks: sanitizedSubtasks,
    },
  };
}

export function filterAndSortTasks(
  tasks: TaskItem[],
  filter: NavigationFilter,
  searchQuery: string
): TaskItem[] {
  const q = searchQuery.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    if (filter === 'trabajo' && task.category !== 'trabajo') return false;
    if (filter === 'examen' && task.category !== 'examen') return false;
    if (filter === 'diario' && task.category !== 'diario') return false;
    if (filter === 'entregas' && task.status === 'terminado') return false;

    if (q.length > 0) {
      const hay = `${task.title} ${task.subtitle} ${task.tag} ${task.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.title.localeCompare(b.title);
  });
}

export function countDeliveriesThisWeek(tasks: TaskItem[], todayIso: string): number {
  return tasks.filter((task) => {
    if (task.status === 'terminado') return false;
    const info = formatSpanishDate(task.dueDate, todayIso);
    return info.isThisWeek || info.isOverdue;
  }).length;
}

export function computeMonthlySummary(tasks: TaskItem[]): {
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  averageProgress: number;
} {
  const completedCount = tasks.filter((t) => t.status === 'terminado').length;
  const inProgressCount = tasks.filter((t) => t.status === 'en_marcha').length;
  const pendingCount = tasks.filter((t) => t.status === 'pendiente').length;
  const averageProgress =
    tasks.length === 0
      ? 0
      : Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length);

  return { completedCount, inProgressCount, pendingCount, averageProgress };
}

export function getPriorityTodayDelivery(
  tasks: TaskItem[],
  subtasks: SubtaskItem[],
  todayIso: string
): {
  task: TaskItem;
  remainingSubtasks: number;
  isToday: boolean;
} | null {
  const activeTasks = tasks.filter((t) => t.status !== 'terminado');
  if (activeTasks.length === 0) return null;

  const sorted = [...activeTasks].sort((a, b) => {
    const aToday = a.dueDate === todayIso ? 0 : 1;
    const bToday = b.dueDate === todayIso ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const chosen = sorted[0];
  const taskSubtasks = subtasks.filter((s) => s.taskId === chosen.id);
  const remainingSubtasks =
    taskSubtasks.length > 0
      ? taskSubtasks.filter((s) => !s.completed).length
      : Math.max(1, chosen.totalSubtasks - chosen.completedSubtasks);

  return {
    task: chosen,
    remainingSubtasks,
    isToday: chosen.dueDate <= todayIso,
  };
}

export function cycleScheduleLabel(current: string): string {
  const order = ['', 'En curso', 'Hoy', 'Mañana'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export function getInitialSeedData(
  todayIso: string,
  ownerId = 'demo-user'
): { tasks: TaskItem[]; subtasks: SubtaskItem[] } {
  const tasks: TaskItem[] = [
    {
      id: 'task-estudio-lumen',
      ownerId,
      title: 'Identidad Estudio Lumen',
      subtitle: 'Estudio Lumen',
      category: 'trabajo',
      status: 'en_marcha',
      dueDate: todayIso,
      tag: 'Identidad visual',
      progress: 60,
      totalSubtasks: 5,
      completedSubtasks: 3,
    },
    {
      id: 'task-examen-mercantil',
      ownerId,
      title: 'Examen Parcial de Estadística',
      subtitle: 'Universidad · Aula B4',
      category: 'examen',
      status: 'en_marcha',
      dueDate: addDaysIso(todayIso, 3),
      tag: 'Temas 1 al 5',
      progress: 50,
      totalSubtasks: 4,
      completedSubtasks: 2,
    },
    {
      id: 'task-memoria-tfg',
      ownerId,
      title: 'Informe Técnico de Arquitectura',
      subtitle: 'Proyecto Ingeniería',
      category: 'trabajo',
      status: 'pendiente',
      dueDate: addDaysIso(todayIso, 5),
      tag: 'Borrador inicial',
      progress: 25,
      totalSubtasks: 4,
      completedSubtasks: 1,
    },
    {
      id: 'task-examen-algoritmos',
      ownerId,
      title: 'Examen Final de Algoritmos',
      subtitle: 'Facultad Informática',
      category: 'examen',
      status: 'pendiente',
      dueDate: addDaysIso(todayIso, 9),
      tag: 'Práctica + Teoría',
      progress: 25,
      totalSubtasks: 4,
      completedSubtasks: 1,
    },
    {
      id: 'task-rutina-diaria',
      ownerId,
      title: 'Organización Semanal y Entreno',
      subtitle: 'Bienestar personal',
      category: 'diario',
      status: 'en_marcha',
      dueDate: todayIso,
      tag: 'Hábitos clave',
      progress: 75,
      totalSubtasks: 4,
      completedSubtasks: 3,
    },
    {
      id: 'task-rebranding-bodega',
      ownerId,
      title: 'Presentación de Caso Práctico',
      subtitle: 'Seminario Estratégico',
      category: 'trabajo',
      status: 'terminado',
      dueDate: addDaysIso(todayIso, -2),
      tag: 'Entregado',
      progress: 100,
      totalSubtasks: 3,
      completedSubtasks: 3,
    },
    {
      id: 'task-gestiones-mes',
      ownerId,
      title: 'Renovación de Matrícula y Becas',
      subtitle: 'Secretaría Académica',
      category: 'diario',
      status: 'terminado',
      dueDate: addDaysIso(todayIso, -4),
      tag: 'Completado',
      progress: 100,
      totalSubtasks: 3,
      completedSubtasks: 3,
    },
  ];

  const subtasks: SubtaskItem[] = [
    // Task 1: Identidad Estudio Lumen (Matches reference image checklist!)
    {
      id: 'sub-lumen-1',
      ownerId,
      taskId: 'task-estudio-lumen',
      title: 'Estrategia y enfoque inicial',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-lumen-2',
      ownerId,
      taskId: 'task-estudio-lumen',
      title: 'Logotipo y retícula base',
      completed: true,
      scheduleLabel: '',
      sortOrder: 2,
    },
    {
      id: 'sub-lumen-3',
      ownerId,
      taskId: 'task-estudio-lumen',
      title: 'Sistema visual y tipografía',
      completed: true,
      scheduleLabel: '',
      sortOrder: 3,
    },
    {
      id: 'sub-lumen-4',
      ownerId,
      taskId: 'task-estudio-lumen',
      title: 'Aplicaciones y presentación',
      completed: false,
      scheduleLabel: 'En curso',
      sortOrder: 4,
    },
    {
      id: 'sub-lumen-5',
      ownerId,
      taskId: 'task-estudio-lumen',
      title: 'Manual de marca y entrega final',
      completed: false,
      scheduleLabel: 'Mañana',
      sortOrder: 5,
    },

    // Task 2: Examen Parcial de Estadística
    {
      id: 'sub-est-1',
      ownerId,
      taskId: 'task-examen-mercantil',
      title: 'Resumir formulario de distribuciones',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-est-2',
      ownerId,
      taskId: 'task-examen-mercantil',
      title: 'Resolver 15 problemas de contraste de hipótesis',
      completed: true,
      scheduleLabel: '',
      sortOrder: 2,
    },
    {
      id: 'sub-est-3',
      ownerId,
      taskId: 'task-examen-mercantil',
      title: 'Simulacro con examen del año pasado',
      completed: false,
      scheduleLabel: 'En curso',
      sortOrder: 3,
    },
    {
      id: 'sub-est-4',
      ownerId,
      taskId: 'task-examen-mercantil',
      title: 'Repaso final de errores frecuentes',
      completed: false,
      scheduleLabel: 'Mañana',
      sortOrder: 4,
    },

    // Task 3: Informe Técnico
    {
      id: 'sub-inf-1',
      ownerId,
      taskId: 'task-memoria-tfg',
      title: 'Definir objetivos y alcance del trabajo',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-inf-2',
      ownerId,
      taskId: 'task-memoria-tfg',
      title: 'Diagramas de componentes y flujo de datos',
      completed: false,
      scheduleLabel: 'Hoy',
      sortOrder: 2,
    },
    {
      id: 'sub-inf-3',
      ownerId,
      taskId: 'task-memoria-tfg',
      title: 'Redacción de pruebas y conclusiones',
      completed: false,
      scheduleLabel: 'Mañana',
      sortOrder: 3,
    },
    {
      id: 'sub-inf-4',
      ownerId,
      taskId: 'task-memoria-tfg',
      title: 'Exportar PDF y subir al campus',
      completed: false,
      scheduleLabel: '',
      sortOrder: 4,
    },

    // Task 4: Examen Algoritmos
    {
      id: 'sub-alg-1',
      ownerId,
      taskId: 'task-examen-algoritmos',
      title: 'Complejidad asintótica y recurrencias',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-alg-2',
      ownerId,
      taskId: 'task-examen-algoritmos',
      title: 'Árboles equilibrados y grafos (Dijkstra / BFS)',
      completed: false,
      scheduleLabel: 'En curso',
      sortOrder: 2,
    },
    {
      id: 'sub-alg-3',
      ownerId,
      taskId: 'task-examen-algoritmos',
      title: 'Programación dinámica y voraces',
      completed: false,
      scheduleLabel: 'Mañana',
      sortOrder: 3,
    },
    {
      id: 'sub-alg-4',
      ownerId,
      taskId: 'task-examen-algoritmos',
      title: 'Practicar ejercicios en papel sin IDE',
      completed: false,
      scheduleLabel: '',
      sortOrder: 4,
    },

    // Task 5: Día a día
    {
      id: 'sub-dia-1',
      ownerId,
      taskId: 'task-rutina-diaria',
      title: 'Planificar bloque de estudio de la mañana',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-dia-2',
      ownerId,
      taskId: 'task-rutina-diaria',
      title: 'Compra semanal y preparar comidas',
      completed: true,
      scheduleLabel: '',
      sortOrder: 2,
    },
    {
      id: 'sub-dia-3',
      ownerId,
      taskId: 'task-rutina-diaria',
      title: 'Entrenamiento de fuerza (45 min)',
      completed: true,
      scheduleLabel: '',
      sortOrder: 3,
    },
    {
      id: 'sub-dia-4',
      ownerId,
      taskId: 'task-rutina-diaria',
      title: 'Lectura de 20 páginas antes de dormir',
      completed: false,
      scheduleLabel: 'Hoy',
      sortOrder: 4,
    },

    // Task 6: Terminado 1
    {
      id: 'sub-term-1',
      ownerId,
      taskId: 'task-rebranding-bodega',
      title: 'Investigación de referencias',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-term-2',
      ownerId,
      taskId: 'task-rebranding-bodega',
      title: 'Diseño de diapositivas',
      completed: true,
      scheduleLabel: '',
      sortOrder: 2,
    },
    {
      id: 'sub-term-3',
      ownerId,
      taskId: 'task-rebranding-bodega',
      title: 'Exposición en clase',
      completed: true,
      scheduleLabel: '',
      sortOrder: 3,
    },

    // Task 7: Terminado 2
    {
      id: 'sub-gest-1',
      ownerId,
      taskId: 'task-gestiones-mes',
      title: 'Descargar certificados académicos',
      completed: true,
      scheduleLabel: '',
      sortOrder: 1,
    },
    {
      id: 'sub-gest-2',
      ownerId,
      taskId: 'task-gestiones-mes',
      title: 'Adjuntar resguardo bancario',
      completed: true,
      scheduleLabel: '',
      sortOrder: 2,
    },
    {
      id: 'sub-gest-3',
      ownerId,
      taskId: 'task-gestiones-mes',
      title: 'Confirmar registro electrónico',
      completed: true,
      scheduleLabel: '',
      sortOrder: 3,
    },
  ];

  return { tasks, subtasks };
}
