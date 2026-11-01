import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  TaskCategory,
  TaskDraftInput,
  TaskItem,
  TaskStatus,
} from '../types/tasks';
import { addDaysIso, validateTaskDraft } from '../utils/taskLogic';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: TaskDraftInput, editingTaskId?: string) => void;
  editingTask?: TaskItem | null;
  defaultStatus?: TaskStatus;
  defaultCategory?: TaskCategory;
  defaultDueDate?: string;
  todayIso: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask = null,
  defaultStatus = 'pendiente',
  defaultCategory = 'trabajo',
  defaultDueDate,
  todayIso,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState(defaultDueDate || todayIso);
  const [tag, setTag] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<
    { title: string; scheduleLabel: string }[]
  >([
    { title: 'Planificación e investigación inicial', scheduleLabel: 'En curso' },
    { title: 'Desarrollo principal / estudio de temas', scheduleLabel: 'Hoy' },
    { title: 'Revisión final y entrega', scheduleLabel: 'Mañana' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingTask) {
      setTitle(editingTask.title);
      setSubtitle(editingTask.subtitle);
      setCategory(editingTask.category);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate);
      setTag(editingTask.tag);
      setSubtaskDrafts([]);
    } else {
      setTitle('');
      setSubtitle('');
      setCategory(defaultCategory);
      setStatus(defaultStatus);
      setDueDate(defaultDueDate || todayIso);
      setTag(
        defaultCategory === 'examen'
          ? 'Temario'
          : defaultCategory === 'diario'
          ? 'Rutina'
          : 'Entrega'
      );
      setSubtaskDrafts([
        { title: 'Primer bloque / preparación', scheduleLabel: 'En curso' },
        { title: 'Práctica o desarrollo', scheduleLabel: 'Hoy' },
        { title: 'Repaso final', scheduleLabel: 'Mañana' },
      ]);
    }
  }, [isOpen, editingTask, defaultCategory, defaultStatus, defaultDueDate, todayIso]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTaskDraft({
      title,
      subtitle,
      category,
      status,
      dueDate,
      tag,
      initialSubtasks: subtaskDrafts,
    });

    if (!validation.valid || !validation.sanitized) {
      setError(validation.error || 'Revisa los campos obligatorios.');
      return;
    }

    onSubmit(validation.sanitized, editingTask?.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={editingTask ? 'Editar tarea' : 'Nueva tarea, trabajo o examen'}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#131822] border border-[#263044] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-white font-display">
            {editingTask ? 'Editar elemento' : 'Nuevo Trabajo, Examen o Tarea'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-xs font-medium text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tipo de actividad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'trabajo', label: 'Trabajo / Proyecto' },
                  { id: 'examen', label: 'Examen / Estudio' },
                  { id: 'diario', label: 'Día a día' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    category === cat.id
                      ? 'bg-[#FF6B4A]/20 border-[#FF6B4A] text-white font-semibold'
                      : 'bg-[#0B0E14] border-[#222B3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-title-input" className="block text-xs font-medium text-slate-300 mb-1">
                Título
              </label>
              <input
                id="task-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Examen de Estadística"
                maxLength={120}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div>
              <label htmlFor="task-subtitle-input" className="block text-xs font-medium text-slate-300 mb-1">
                Asignatura, cliente o área
              </label>
              <input
                id="task-subtitle-input"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej. Universidad · Aula B4"
                maxLength={80}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
          </div>

          {/* Due Date, Status & Phase Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="task-date-input" className="block text-xs font-medium text-slate-300 mb-1">
                Fecha de entrega / examen
              </label>
              <input
                id="task-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white focus:outline-none focus:border-[#FF6B4A]"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {[
                  { lbl: 'Hoy', iso: todayIso },
                  { lbl: 'Mañana', iso: addDaysIso(todayIso, 1) },
                  { lbl: '+7d', iso: addDaysIso(todayIso, 7) },
                ].map((p) => (
                  <button
                    key={p.lbl}
                    type="button"
                    onClick={() => setDueDate(p.iso)}
                    className="px-2 py-0.5 rounded bg-[#1B2333] hover:bg-[#253047] text-[10px] text-slate-300 cursor-pointer"
                  >
                    {p.lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="task-status-select" className="block text-xs font-medium text-slate-300 mb-1">
                Columna inicial
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white focus:outline-none focus:border-[#FF6B4A]"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_marcha">En marcha</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-tag-input" className="block text-xs font-medium text-slate-300 mb-1">
                Fase o nota breve
              </label>
              <input
                id="task-tag-input"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ej. Temas 1-5"
                maxLength={40}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
          </div>

          {/* Initial Subtasks Checklist (when creating new task) */}
          {!editingTask && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Subtareas o temas para calcular el progreso
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSubtaskDrafts((prev) => [
                      ...prev,
                      { title: '', scheduleLabel: 'En curso' },
                    ])
                  }
                  className="text-xs font-semibold text-[#FF6B4A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir paso</span>
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {subtaskDrafts.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubtaskDrafts((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                        );
                      }}
                      placeholder={`Paso o tema ${idx + 1}`}
                      aria-label={`Paso o tema ${idx + 1}`}
                      maxLength={140}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#242F46] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSubtaskDrafts((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Quitar paso ${idx + 1}`}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E2638]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#1B2333] hover:bg-[#242F44] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7e62] text-[#0B0E14] font-semibold text-xs transition-colors cursor-pointer"
            >
              {editingTask ? 'Guardar cambios' : 'Crear y añadir al tablero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
