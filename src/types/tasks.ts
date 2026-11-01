export type TaskCategory = 'trabajo' | 'examen' | 'diario';

export type TaskStatus = 'pendiente' | 'en_marcha' | 'terminado';

export type NavigationFilter = 'todo' | 'trabajo' | 'examen' | 'diario' | 'entregas';

export type ViewMode = 'tablero' | 'lista';

export interface TaskItem {
  id: string;
  ownerId: string;
  title: string;
  subtitle: string;
  category: TaskCategory;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  tag: string;
  progress: number; // 0..100
  totalSubtasks: number; // 0..50
  completedSubtasks: number; // 0..50
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SubtaskItem {
  id: string;
  ownerId: string;
  taskId: string;
  title: string;
  completed: boolean;
  scheduleLabel: string; // '', 'En curso', 'Hoy', 'Mañana', 'Esta semana'
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TaskDraftInput {
  title: string;
  subtitle: string;
  category: TaskCategory;
  status: TaskStatus;
  dueDate: string;
  tag: string;
  initialSubtasks?: { title: string; scheduleLabel?: string; completed?: boolean }[];
}

export const TASK_CONSTRAINTS = {
  ID_MAX_LEN: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  TITLE_MIN_LEN: 1,
  TITLE_MAX_LEN: 120,
  SUBTITLE_MIN_LEN: 1,
  SUBTITLE_MAX_LEN: 80,
  TAG_MIN_LEN: 1,
  TAG_MAX_LEN: 40,
  DUE_DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  MAX_SUBTASKS: 50,
} as const;

export const SUBTASK_CONSTRAINTS = {
  TITLE_MIN_LEN: 1,
  TITLE_MAX_LEN: 140,
  LABEL_MAX_LEN: 30,
  MAX_SORT_ORDER: 500,
} as const;

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  trabajo: 'Trabajos',
  examen: 'Exámenes',
  diario: 'Día a día',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_marcha: 'En marcha',
  terminado: 'Terminado',
};
