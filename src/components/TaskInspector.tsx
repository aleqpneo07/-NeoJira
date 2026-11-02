import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Edit3,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  SubtaskItem,
  TaskItem,
  TaskStatus,
} from '../types/tasks';
import { addDaysIso, cycleScheduleLabel, formatSpanishDate } from '../utils/taskLogic';

interface TaskInspectorProps {
  task: TaskItem | null;
  subtasks: SubtaskItem[];
  todayIso: string;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onCycleSubtaskLabel: (subtaskId: string, nextLabel: string) => void;
  onEditSubtaskTitle: (subtaskId: string, newTitle: string) => void;
  onAddSubtask: (taskId: string, title: string, scheduleLabel: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDateChange: (taskId: string, newDueDate: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskInspector: React.FC<TaskInspectorProps> = ({
  task,
  subtasks,
  todayIso,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  onToggleSubtask,
  onCycleSubtaskLabel,
  onEditSubtaskTitle,
  onAddSubtask,
  onDeleteSubtask,
  onStatusChange,
  onDateChange,
  onEditTask,
  onDeleteTask,
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskSchedule, setNewSubtaskSchedule] = useState('En curso');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');

  useEffect(() => {
    setConfirmDelete(false);
    setEditingSubtaskId(null);
    setIsEditingDate(false);
  }, [task?.id]);

  const handleCreateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    onAddSubtask(task.id, trimmed, newSubtaskSchedule);
    setNewSubtaskTitle('');
  };

  const handleSaveSubtaskEdit = (subtaskId: string) => {
    const trimmed = editingSubtaskText.trim();
    if (trimmed) {
      onEditSubtaskTitle(subtaskId, trimmed);
    }
    setEditingSubtaskId(null);
  };

  const renderInspectorBody = () => {
    if (!task) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <p className="text-sm font-semibold text-white">Selecciona una tarea</p>
          <p className="text-xs text-slate-500 mt-1">
            Haz clic en cualquier tarjeta del tablero o calendario para ver su progreso, fecha de entrega y
            lista de subtareas.
          </p>
        </div>
      );
    }

    const dateInfo = formatSpanishDate(task.dueDate, todayIso);
    const sortedSubtasks = [...subtasks].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <div className="space-y-4">
        {/* 1. Highlighted Accent Hero Card */}
        <div className="rounded-2xl bg-[#FF6B4A] text-[#0B0E14] p-5 shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold opacity-80 truncate">
                {task.subtitle}
              </p>
              <h2 className="text-xl font-extrabold font-display tracking-tight leading-snug mt-0.5">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEditTask(task)}
                aria-label={`Editar ${task.title}`}
                className="p-2 rounded-xl bg-black/10 hover:bg-black/20 text-[#0B0E14] transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete((v) => !v)}
                aria-label={`Eliminar ${task.title}`}
                className="p-2 rounded-xl bg-black/10 hover:bg-black/20 text-[#0B0E14] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                aria-label="Cerrar panel de detalle"
                className="2xl:hidden p-2 rounded-xl bg-black/10 hover:bg-black/20 text-[#0B0E14] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {confirmDelete && (
            <div className="rounded-xl bg-[#0B0E14]/95 text-white p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium">¿Eliminar esta tarea y sus pasos?</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    onDeleteTask(task.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-[11px] font-bold text-[#0B0E14] cursor-pointer"
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          )}

          {/* Progress Percentage & Steps Counter */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[11px] font-semibold opacity-75">Progreso</p>
              <p
                data-testid="inspector-progress-value"
                className="text-2xl font-extrabold font-mono-num tracking-tight mt-0.5"
              >
                {task.progress} %
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold opacity-75">Subtareas</p>
              <p className="text-lg font-extrabold font-mono-num tracking-tight mt-0.5">
                {task.completedSubtasks}/{task.totalSubtasks}
              </p>
            </div>
          </div>

          {/* Bold Progress Bar */}
          <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0B0E14] transition-all duration-200"
              style={{ width: `${Math.max(5, task.progress)}%` }}
            />
          </div>
        </div>

        {/* 2. Delivery Date & Status Card */}
        <div className="rounded-2xl bg-[#131822] border border-[#1F2737] p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">Entrega / Fecha clave</p>
              <p className="text-base font-bold text-white font-display mt-0.5">
                {dateInfo.fullDate}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingDate((v) => !v)}
              aria-label="Cambiar fecha de entrega"
              className="px-3 py-1.5 rounded-xl bg-[#1B2333] hover:bg-[#242F44] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF6B4A]" />
              <span>{dateInfo.shortLabel}</span>
            </button>
          </div>

          {isEditingDate && (
            <div className="pt-1 space-y-2">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Hoy', iso: todayIso },
                  { label: 'Mañana', iso: addDaysIso(todayIso, 1) },
                  { label: '+3 días', iso: addDaysIso(todayIso, 3) },
                  { label: '+1 sem', iso: addDaysIso(todayIso, 7) },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onDateChange(task.id, preset.iso);
                      setIsEditingDate(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      task.dueDate === preset.iso
                        ? 'bg-[#FF6B4A]/20 border-[#FF6B4A] text-white'
                        : 'bg-[#0B0E14] border-[#242F46] text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label htmlFor="inspector-due-date" className="sr-only">
                Fecha de entrega
              </label>
              <input
                id="inspector-due-date"
                type="date"
                value={task.dueDate}
                onChange={(e) => {
                  if (e.target.value) {
                    onDateChange(task.id, e.target.value);
                    setIsEditingDate(false);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#2A364F] text-xs text-white focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
          )}

          {/* Interactive Status Selector */}
          <div
            role="group"
            aria-label="Estado de la tarea"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0B0E14] border border-[#1E2638]"
          >
            {(['pendiente', 'en_marcha', 'terminado'] as TaskStatus[]).map((st) => {
              const active = task.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatusChange(task.id, st)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#222C40] text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {STATUS_LABELS[st]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Interactive Subtasks Checklist Card */}
        <div className="rounded-2xl bg-[#131822] border border-[#1F2737] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300">
              Pasos y subtareas ({task.completedSubtasks}/{task.totalSubtasks})
            </h3>
            <span className="text-[11px] text-slate-500">Toca para completar o editar</span>
          </div>

          <ul className="divide-y divide-[#1E2638]" aria-label="Lista de subtareas">
            {sortedSubtasks.map((sub) => (
              <li
                key={sub.id}
                className="py-2.5 flex items-center justify-between gap-2 group"
              >
                {editingSubtaskId === sub.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={editingSubtaskText}
                      onChange={(e) => setEditingSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSubtaskEdit(sub.id);
                        if (e.key === 'Escape') setEditingSubtaskId(null);
                      }}
                      autoFocus
                      maxLength={140}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-[#FF6B4A] text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSubtaskEdit(sub.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#FF6B4A] text-[#0B0E14] text-[11px] font-bold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(sub.id)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0 py-1 cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          sub.completed
                            ? 'bg-white text-[#0B0E14]'
                            : 'border-2 border-slate-600 group-hover:border-[#FF6B4A]'
                        }`}
                      >
                        {sub.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                      <span
                        className={`text-xs leading-snug transition-colors ${
                          sub.completed ? 'line-through text-slate-500' : 'text-slate-100 font-medium'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {!sub.completed && (
                        <button
                          type="button"
                          onClick={() =>
                            onCycleSubtaskLabel(sub.id, cycleScheduleLabel(sub.scheduleLabel))
                          }
                          aria-label={`Cambiar momento de ${sub.title}`}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            sub.scheduleLabel === 'En curso' || sub.scheduleLabel === 'Hoy'
                              ? 'bg-[#FF6B4A]/20 text-[#FF6B4A]'
                              : sub.scheduleLabel === 'Mañana'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-[#1B2333] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sub.scheduleLabel || '+ Cuándo'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubtaskId(sub.id);
                          setEditingSubtaskText(sub.title);
                        }}
                        aria-label={`Renombrar subtarea ${sub.title}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteSubtask(sub.id)}
                        aria-label={`Eliminar subtarea ${sub.title}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}

            {sortedSubtasks.length === 0 && (
              <li className="py-4 text-center text-xs text-slate-500">
                No hay subtareas todavía. Añade el primer paso abajo.
              </li>
            )}
          </ul>

          {/* Add New Subtask Inline Form */}
          <form onSubmit={handleCreateSubtask} className="pt-2 space-y-2 border-t border-[#1E2638]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Añadir paso, tema o ejercicio..."
                aria-label="Nueva subtarea"
                maxLength={140}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A] min-h-[40px]"
              />
              <button
                type="submit"
                aria-label="Añadir subtarea"
                className="px-3.5 py-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7e62] text-[#0B0E14] font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 min-h-[40px]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Añadir</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Cuándo:</span>
              </span>
              <div className="flex items-center gap-1">
                {(['En curso', 'Hoy', 'Mañana', ''] as const).map((lbl) => (
                  <button
                    key={lbl || 'ninguna'}
                    type="button"
                    onClick={() => setNewSubtaskSchedule(lbl)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      newSubtaskSchedule === lbl
                        ? 'bg-[#222C40] text-white font-medium'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {lbl || 'Libre'}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Right Inspector Column */}
      <aside
        aria-label="Inspector de detalle y subtareas"
        className="hidden 2xl:block w-[360px] shrink-0 bg-[#0F131C] border-l border-[#1E2638] p-5 overflow-y-auto"
      >
        {renderInspectorBody()}
      </aside>

      {/* Mobile & Tablet Bottom Sheet / Slide-over Drawer */}
      {isMobileDrawerOpen && task && (
        <div
          className="2xl:hidden fixed inset-0 z-50 flex flex-col justify-end md:items-end bg-black/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseMobileDrawer();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${task.title}`}
        >
          <div className="w-full md:max-w-md lg:max-w-lg max-h-[90vh] md:max-h-full md:h-full rounded-t-3xl md:rounded-none md:rounded-l-3xl bg-[#0F131C] border-t md:border-t-0 md:border-l border-[#263044] p-4 sm:p-5 overflow-y-auto shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto my-2 md:hidden" />
            {renderInspectorBody()}
          </div>
        </div>
      )}
    </>
  );
};
