import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  NavigationFilter,
  STATUS_LABELS,
  TaskItem,
  TaskStatus,
  ViewMode,
} from '../types/tasks';
import { formatSpanishDate } from '../utils/taskLogic';

interface KanbanBoardProps {
  tasks: TaskItem[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onOpenNewTaskModal: (defaultStatus?: TaskStatus) => void;
  onOpenConnectModal: () => void;
  activeFilter: NavigationFilter;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  weeklyDeliveriesCount: number;
  todayIso: string;
  userEmail: string | null;
}

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'pendiente', title: 'Pendiente' },
  { status: 'en_marcha', title: 'En marcha' },
  { status: 'terminado', title: 'Terminado' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
  onOpenNewTaskModal,
  onOpenConnectModal,
  activeFilter,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  weeklyDeliveriesCount,
  todayIso,
  userEmail,
}) => {
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskStatus | 'todos'>('todos');

  const sectionHeading =
    activeFilter === 'todo'
      ? 'Proyectos'
      : activeFilter === 'trabajo'
      ? 'Trabajos'
      : activeFilter === 'examen'
      ? 'Exámenes'
      : activeFilter === 'diario'
      ? 'Día a Día'
      : 'Entregas';

  const getNextStatus = (status: TaskStatus): { next: TaskStatus; label: string } => {
    if (status === 'pendiente') return { next: 'en_marcha', label: 'Iniciar' };
    if (status === 'en_marcha') return { next: 'terminado', label: 'Terminar' };
    return { next: 'en_marcha', label: 'Reabrir' };
  };

  return (
    <section
      aria-label="Tablero de actividades"
      className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#0B0E14]"
    >
      {/* Top Header & Controls Bar (Matches reference image single-row top bar) */}
      <header className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#1E2638] space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="shrink-0">
            <p className="text-xs font-medium text-slate-400 font-mono-num">
              {weeklyDeliveriesCount === 1
                ? '1 entrega esta semana'
                : `${weeklyDeliveriesCount} entregas esta semana`}
            </p>
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display whitespace-nowrap">
                {sectionHeading}
              </h1>

              {/* Mobile quick sync + install + new button */}
              <div className="flex lg:hidden items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenConnectModal}
                  aria-label="Instalar aplicación en móvil y sincronizar"
                  className="min-h-[44px] px-3 rounded-xl bg-[#151B28] border border-[#FF6B4A]/40 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Cloud
                    className={`w-4 h-4 ${userEmail ? 'text-emerald-400' : 'text-[#FF6B4A]'}`}
                  />
                  <span>{userEmail ? 'Instalar / Sync' : 'Instalar App'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal()}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#FF6B4A] text-[#0B0E14] font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nueva</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search, View Switcher (Tablero | Lista), and + Nueva tarea CTA on one line */}
          <div className="flex items-center gap-2 flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-40 xl:w-52 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar trabajos, exámenes o tareas"
                className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-[#131822] border border-[#222B3D] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A] transition-colors min-h-[40px]"
              />
            </div>

            {/* Segmented Control: Tablero | Lista */}
            <div
              role="group"
              aria-label="Modo de visualización"
              className="flex items-center p-1 rounded-xl bg-[#131822] border border-[#222B3D] shrink-0"
            >
              <button
                type="button"
                onClick={() => onViewModeChange('tablero')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'tablero'
                    ? 'bg-[#222C40] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tablero</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('lista')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'lista'
                    ? 'bg-[#222C40] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {/* Desktop Primary CTA: + Nueva tarea */}
            <button
              type="button"
              onClick={() => onOpenNewTaskModal()}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7e62] text-[#0B0E14] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva tarea</span>
            </button>
          </div>
        </div>

        {/* Mobile Column Filter Tabs (4-column grid with zero horizontal clipping) */}
        {viewMode === 'tablero' && (
          <div className="grid grid-cols-4 sm:hidden gap-1.5 pt-0.5">
            {(
              [
                { id: 'todos', label: 'Todos', count: tasks.length },
                {
                  id: 'pendiente',
                  label: 'Pendiente',
                  count: tasks.filter((t) => t.status === 'pendiente').length,
                },
                {
                  id: 'en_marcha',
                  label: 'En marcha',
                  count: tasks.filter((t) => t.status === 'en_marcha').length,
                },
                {
                  id: 'terminado',
                  label: 'Terminado',
                  count: tasks.filter((t) => t.status === 'terminado').length,
                },
              ] as const
            ).map((tab) => {
              const active = mobileStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileStatusTab(tab.id)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap truncate transition-colors cursor-pointer min-h-[40px] ${
                    active
                      ? 'bg-[#FF6B4A] text-[#0B0E14] font-semibold'
                      : 'bg-[#131822] text-slate-400 border border-[#1E2638]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Board or List Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-24 lg:pb-6">
        {tasks.length === 0 ? (
          <div className="h-64 rounded-2xl border border-dashed border-[#242E42] bg-[#111620]/50 flex flex-col items-center justify-center text-center p-6">
            <SlidersHorizontal className="w-8 h-8 text-slate-500 mb-3" />
            <p className="text-sm font-semibold text-white">
              No hay elementos que coincidan con tu filtro
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Añade un nuevo trabajo, examen o tarea diaria para empezar a organizar tu progreso.
            </p>
            <button
              type="button"
              onClick={() => onOpenNewTaskModal()}
              className="mt-4 px-4 py-2 rounded-xl bg-[#FF6B4A] text-[#0B0E14] font-semibold text-xs hover:bg-[#ff7e62] transition-colors cursor-pointer"
            >
              + Crear primera tarea
            </button>
          </div>
        ) : viewMode === 'tablero' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {COLUMNS.filter(
              (col) => mobileStatusTab === 'todos' || mobileStatusTab === col.status
            ).map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.status);
              return (
                <div key={col.status} className="space-y-3">
                  {/* Column Header (Matches "Pendiente 2", "En marcha 2", "Terminado 3") */}
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold text-slate-400 tracking-tight">
                      {col.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-num text-slate-400">
                        {colTasks.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenNewTaskModal(col.status)}
                        aria-label={`Añadir en ${col.title}`}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#19202E] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cards Stack */}
                  <div className="space-y-3">
                    {colTasks.map((task) => {
                      const isSelected = task.id === selectedTaskId;
                      const dateInfo = formatSpanishDate(task.dueDate, todayIso);
                      const nextTransition = getNextStatus(task.status);

                      // Progress bar color matching status & urgency
                      const barColor =
                        task.status === 'terminado'
                          ? 'bg-emerald-400'
                          : dateInfo.isToday || dateInfo.isOverdue
                          ? 'bg-[#FF6B4A]'
                          : task.category === 'examen'
                          ? 'bg-indigo-400'
                          : 'bg-sky-400';

                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl p-4 transition-all border ${
                            isSelected
                              ? 'bg-[#171E2E] border-[#FF6B4A] shadow-lg shadow-black/40'
                              : 'bg-[#131822] border-[#1F2737] hover:border-[#33415C] hover:bg-[#151B27]'
                          }`}
                        >
                          {/* Main Clickable Card Area to Select in Inspector */}
                          <button
                            type="button"
                            onClick={() => onSelectTask(task.id)}
                            className="w-full text-left space-y-2 cursor-pointer focus:outline-none"
                          >
                            {/* Quiet Unboxed Metadata Kicker (Category · Context) */}
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                              <span className="truncate">
                                {CATEGORY_LABELS[task.category]} · {task.subtitle}
                              </span>
                              <span className="font-mono-num text-slate-300 font-semibold shrink-0">
                                {task.progress} %
                              </span>
                            </div>

                            {/* Primary Title (No Euro prices as requested by user) */}
                            <h3 className="text-[15px] font-bold text-white font-display leading-snug">
                              {task.title}
                            </h3>

                            {/* Due Date & Phase Line */}
                            <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                              <span
                                className={`font-medium truncate ${
                                  task.status === 'terminado'
                                    ? 'text-emerald-400'
                                    : dateInfo.isToday || dateInfo.isOverdue
                                    ? 'text-[#FF6B4A]'
                                    : 'text-slate-400'
                                }`}
                              >
                                {task.status === 'terminado'
                                  ? 'Completado'
                                  : dateInfo.shortLabel === task.tag
                                  ? dateInfo.shortLabel
                                  : `${dateInfo.shortLabel} · ${task.tag}`}
                              </span>
                              <span className="text-[11px] font-mono-num text-slate-400 whitespace-nowrap shrink-0">
                                {task.completedSubtasks}/{task.totalSubtasks} pasos
                              </span>
                            </div>

                            {/* Visual Progress Bar (Matches bottom bar on cards in reference image) */}
                            <div className="w-full h-1.5 rounded-full bg-[#222B3D] overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                                style={{ width: `${Math.max(6, task.progress)}%` }}
                              />
                            </div>
                          </button>

                          {/* Interactive Footer Row: Quick Status Transition */}
                          <div className="mt-3 pt-2.5 border-t border-[#1E2638]/80 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectTask(task.id)}
                              className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              Ver subtareas
                            </button>
                            <button
                              type="button"
                              onClick={() => onStatusChange(task.id, nextTransition.next)}
                              aria-label={`${nextTransition.label} ${task.title}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C2436] hover:bg-[#263149] text-[11px] font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {task.status === 'en_marcha' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <ArrowRight className="w-3 h-3 text-[#FF6B4A]" />
                              )}
                              <span>{nextTransition.label}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[#1E2638] p-5 text-center">
                        <p className="text-xs text-slate-500">Sin tareas en {col.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Mode */
          <div className="rounded-2xl bg-[#131822] border border-[#1F2737] overflow-hidden">
            <div className="divide-y divide-[#1E2638]">
              {tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                const dateInfo = formatSpanishDate(task.dueDate, todayIso);
                const nextTransition = getNextStatus(task.status);
                return (
                  <div
                    key={task.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors ${
                      isSelected ? 'bg-[#1A2233]' : 'hover:bg-[#161D2B]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTask(task.id)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{CATEGORY_LABELS[task.category]}</span>
                        <span>·</span>
                        <span className="truncate">{task.subtitle}</span>
                        <span>·</span>
                        <span
                          className={
                            dateInfo.isToday && task.status !== 'terminado'
                              ? 'text-[#FF6B4A] font-medium'
                              : 'text-slate-400'
                          }
                        >
                          {dateInfo.fullDate}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white font-display mt-0.5 truncate">
                        {task.title}
                      </p>
                    </button>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="w-28">
                        <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-300 mb-1">
                          <span>{STATUS_LABELS[task.status]}</span>
                          <span>{task.progress} %</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#222B3D] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#FF6B4A]"
                            style={{ width: `${Math.max(6, task.progress)}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onStatusChange(task.id, nextTransition.next)}
                        className="px-3 py-1.5 rounded-xl bg-[#1C2436] hover:bg-[#27324A] text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                      >
                        {nextTransition.label}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
