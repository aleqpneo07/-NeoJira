import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  NavigationFilter,
  SortOption,
  STATUS_LABELS,
  TaskItem,
  TaskStatus,
  ViewMode,
} from '../types/tasks';
import {
  formatSpanishDate,
  getCalendarMonthDays,
  SPANISH_MONTHS,
} from '../utils/taskLogic';

interface KanbanBoardProps {
  tasks: TaskItem[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onOpenNewTaskModal: (defaultStatus?: TaskStatus, defaultDueDate?: string) => void;
  onOpenConnectModal: () => void;
  activeFilter: NavigationFilter;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  weeklyDeliveriesCount: number;
  todayIso: string;
  userEmail: string | null;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'pendiente', title: 'Pendiente' },
  { status: 'en_marcha', title: 'En marcha' },
  { status: 'terminado', title: 'Terminado' },
];

const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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
  sortBy,
  onSortByChange,
  weeklyDeliveriesCount,
  todayIso,
  userEmail,
  searchInputRef,
}) => {
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskStatus | 'todos'>('todos');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [touchDragGhost, setTouchDragGhost] = useState<{
    taskId: string;
    title: string;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeTouchTaskRef = useRef<{ id: string; title: string } | null>(null);
  const dragOverColumnRef = useRef<TaskStatus | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const beginTouchDrag = (task: TaskItem, clientX: number, clientY: number) => {
    clearLongPressTimer();
    activeTouchTaskRef.current = { id: task.id, title: task.title };
    setDraggedTaskId(task.id);
    setTouchDragGhost({
      taskId: task.id,
      title: task.title,
      x: clientX,
      y: clientY,
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore vibration errors on unsupported browsers
      }
    }
  };

  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!activeTouchTaskRef.current) {
        // If waiting for long-press, cancel if finger moved > 10px (user is scrolling)
        if (longPressTimerRef.current !== null && touchStartPosRef.current && e.touches[0]) {
          const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
          if (dx > 10 || dy > 10) {
            clearLongPressTimer();
          }
        }
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      // Prevent page scroll while actively dragging a task card on tablet/mobile
      if (e.cancelable) {
        e.preventDefault();
      }

      setTouchDragGhost({
        taskId: activeTouchTaskRef.current.id,
        title: activeTouchTaskRef.current.title,
        x: touch.clientX,
        y: touch.clientY,
      });

      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = targetEl?.closest('[data-drop-status]') as HTMLElement | null;
      const status = (dropZone?.getAttribute('data-drop-status') as TaskStatus | null) || null;

      if (dragOverColumnRef.current !== status) {
        dragOverColumnRef.current = status;
        setDragOverColumn(status);
      }
    };

    const finishTouchDrag = () => {
      clearLongPressTimer();
      if (activeTouchTaskRef.current) {
        const taskId = activeTouchTaskRef.current.id;
        const targetStatus = dragOverColumnRef.current;
        if (targetStatus) {
          onStatusChange(taskId, targetStatus);
        }
      }
      activeTouchTaskRef.current = null;
      dragOverColumnRef.current = null;
      touchStartPosRef.current = null;
      setDraggedTaskId(null);
      setDragOverColumn(null);
      setTouchDragGhost(null);
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', finishTouchDrag);
    window.addEventListener('touchcancel', finishTouchDrag);

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', finishTouchDrag);
      window.removeEventListener('touchcancel', finishTouchDrag);
    };
  }, [onStatusChange]);

  // Calendar month state initialized from todayIso
  const initialYearMonth = useMemo(() => {
    const [y, m] = todayIso.split('-').map(Number);
    return {
      year: y || new Date().getFullYear(),
      monthIndex: (m || new Date().getMonth() + 1) - 1,
    };
  }, [todayIso]);

  const [calYear, setCalYear] = useState(initialYearMonth.year);
  const [calMonth, setCalMonth] = useState(initialYearMonth.monthIndex);
  const [selectedCalDate, setSelectedCalDate] = useState<string>(todayIso);

  const calendarCells = useMemo(
    () => getCalendarMonthDays(calYear, calMonth, todayIso),
    [calYear, calMonth, todayIso]
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const t of tasks) {
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    }
    return map;
  }, [tasks]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCalYear(initialYearMonth.year);
    setCalMonth(initialYearMonth.monthIndex);
    setSelectedCalDate(todayIso);
  };

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
      {/* Top Header & Controls Bar */}
      <header className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#1E2638] space-y-3 shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
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

              {/* Mobile & Tablet quick sync + new button */}
              <div className="flex sm:hidden items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenConnectModal}
                  aria-label="Instalar aplicación y sincronizar"
                  className="min-h-[42px] px-3 rounded-xl bg-[#151B28] border border-[#FF6B4A]/40 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Cloud
                    className={`w-4 h-4 ${userEmail ? 'text-emerald-400' : 'text-[#FF6B4A]'}`}
                  />
                  <span>{userEmail ? 'Sync / Backup' : 'Conectar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal()}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#FF6B4A] text-[#0B0E14] font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nueva</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search, Sort, View Switcher (Tablero | Lista | Calendario), and + Nueva tarea CTA */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-44 xl:w-52 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar... (/)"
                aria-label="Buscar trabajos, exámenes o tareas"
                className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-[#131822] border border-[#222B3D] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B4A] transition-colors min-h-[40px]"
              />
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortOption)}
              aria-label="Ordenar tareas por"
              className="px-2.5 py-2 rounded-xl bg-[#131822] border border-[#222B3D] text-xs text-slate-300 focus:outline-none focus:border-[#FF6B4A] min-h-[40px] cursor-pointer shrink-0"
            >
              <option value="fecha">Orden: Fecha</option>
              <option value="progreso">Orden: Progreso</option>
              <option value="titulo">Orden: A-Z</option>
            </select>

            {/* Segmented Control: Tablero | Lista | Calendario */}
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
              <button
                type="button"
                onClick={() => onViewModeChange('calendario')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'calendario'
                    ? 'bg-[#222C40] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>

            {/* Desktop Primary CTA: + Nueva tarea */}
            <button
              type="button"
              onClick={() => onOpenNewTaskModal()}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7e62] text-[#0B0E14] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva tarea</span>
            </button>
          </div>
        </div>

        {/* Mobile / Small-Tablet Column Filter Tabs (Also act as drop targets!) */}
        {viewMode === 'tablero' && (
          <div className="grid grid-cols-4 md:hidden gap-1.5 pt-0.5">
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
              const isDropTab = tab.id !== 'todos' && dragOverColumn === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-drop-status={tab.id !== 'todos' ? tab.id : undefined}
                  onClick={() => setMobileStatusTab(tab.id)}
                  onDragOver={(e) => {
                    if (tab.id === 'todos') return;
                    e.preventDefault();
                    if (dragOverColumn !== tab.id) setDragOverColumn(tab.id);
                  }}
                  onDragLeave={() => {
                    if (tab.id !== 'todos' && dragOverColumn === tab.id) setDragOverColumn(null);
                  }}
                  onDrop={(e) => {
                    if (tab.id === 'todos') return;
                    e.preventDefault();
                    setDragOverColumn(null);
                    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    if (taskId) {
                      onStatusChange(taskId, tab.id);
                    }
                    setDraggedTaskId(null);
                  }}
                  className={`px-2 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap truncate transition-all cursor-pointer min-h-[40px] ${
                    isDropTab
                      ? 'bg-[#FF6B4A]/30 text-white ring-2 ring-[#FF6B4A] scale-[1.03]'
                      : active
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

      {/* Main Board, List, or Calendar Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-24 lg:pb-6">
        {tasks.length === 0 && viewMode !== 'calendario' ? (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {COLUMNS.filter(
              (col) => mobileStatusTab === 'todos' || mobileStatusTab === col.status
            ).map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.status);
              const isDropTarget = dragOverColumn === col.status;

              return (
                <div
                  key={col.status}
                  data-drop-status={col.status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverColumn !== col.status) setDragOverColumn(col.status);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverColumn === col.status) setDragOverColumn(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverColumn(null);
                    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    if (taskId) {
                      onStatusChange(taskId, col.status);
                    }
                    setDraggedTaskId(null);
                  }}
                  className={`space-y-3 rounded-2xl p-2.5 -m-1.5 min-h-[220px] transition-all ${
                    isDropTarget
                      ? 'bg-[#192234]/80 ring-2 ring-[#FF6B4A] shadow-lg shadow-[#FF6B4A]/10'
                      : 'bg-transparent'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold text-slate-300 tracking-tight">
                        {col.title}
                      </h2>
                      {isDropTarget && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FF6B4A]/20 text-[#FF6B4A]">
                          Soltar aquí
                        </span>
                      )}
                    </div>
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
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskId(task.id);
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          onTouchStart={(e) => {
                            const touch = e.touches[0];
                            if (!touch) return;
                            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
                            clearLongPressTimer();
                            longPressTimerRef.current = window.setTimeout(() => {
                              beginTouchDrag(task, touch.clientX, touch.clientY);
                            }, 220);
                          }}
                          className={`rounded-2xl p-4 transition-all border select-none cursor-grab active:cursor-grabbing ${
                            isSelected
                              ? 'bg-[#171E2E] border-[#FF6B4A] shadow-lg shadow-black/40'
                              : 'bg-[#131822] border-[#1F2737] hover:border-[#33415C] hover:bg-[#151B27]'
                          } ${draggedTaskId === task.id ? 'opacity-45 scale-[0.97] ring-1 ring-[#FF6B4A]' : ''}`}
                        >
                          {/* Main Clickable Card Area to Select in Inspector */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (!draggedTaskId) onSelectTask(task.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectTask(task.id);
                              }
                            }}
                            className="w-full text-left space-y-2 cursor-pointer focus:outline-none"
                          >
                            {/* Quiet Unboxed Metadata Kicker + Touch/Mouse Drag Handle */}
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  role="presentation"
                                  title="Arrastra para mover de columna"
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    const touch = e.touches[0];
                                    if (touch) {
                                      beginTouchDrag(task, touch.clientX, touch.clientY);
                                    }
                                  }}
                                  className="p-1 -ml-1 rounded-md text-slate-500 hover:text-[#FF6B4A] hover:bg-[#1C2436] touch-none cursor-grab active:cursor-grabbing shrink-0"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                <span className="truncate">
                                  {task.subtitle}
                                </span>
                              </div>
                              <span className="font-mono-num text-slate-300 font-semibold shrink-0">
                                {task.progress} %
                              </span>
                            </div>

                            {/* Primary Title */}
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

                            {/* Visual Progress Bar */}
                            <div className="w-full h-1.5 rounded-full bg-[#222B3D] overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                                style={{ width: `${Math.max(6, task.progress)}%` }}
                              />
                            </div>
                          </div>

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
                      <div
                        data-drop-status={col.status}
                        className={`rounded-2xl border border-dashed p-6 text-center transition-colors ${
                          isDropTarget
                            ? 'border-[#FF6B4A] bg-[#FF6B4A]/10 text-white'
                            : 'border-[#1E2638] text-slate-500'
                        }`}
                      >
                        <p className="text-xs">
                          {isDropTarget
                            ? `Suelta aquí para mover a ${col.title}`
                            : `Sin tareas en ${col.title} (arrastra aquí o pulsa +)`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'lista' ? (
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
                            (dateInfo.isToday || dateInfo.isOverdue) &&
                            task.status !== 'terminado'
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
                            className={`h-full rounded-full ${
                              task.status === 'terminado' ? 'bg-emerald-400' : 'bg-[#FF6B4A]'
                            }`}
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
        ) : (
          /* Calendar View Mode (Jira-style interactive task calendar for PC, Tablet & Phone) */
          <div className="space-y-4">
            {/* Calendar Month Navigation Bar */}
            <div className="flex items-center justify-between gap-2 bg-[#131822] border border-[#1F2737] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white font-display capitalize">
                  {SPANISH_MONTHS[calMonth]} {calYear}
                </h2>
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-2.5 py-1 rounded-lg bg-[#1B2333] hover:bg-[#253047] text-xs font-medium text-[#FF6B4A] transition-colors cursor-pointer"
                >
                  Hoy
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                  className="p-2 rounded-xl bg-[#1B2333] hover:bg-[#253047] text-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                  className="p-2 rounded-xl bg-[#1B2333] hover:bg-[#253047] text-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Column Calendar Grid */}
            <div className="rounded-2xl bg-[#131822] border border-[#1F2737] overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#1E2638] bg-[#0F131C]">
                {WEEKDAYS_SHORT.map((day) => (
                  <div
                    key={day}
                    className="py-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-[#1E2638]">
                {calendarCells.map((cell) => {
                  const dayTasks = tasksByDate[cell.isoDate] || [];
                  const isSelectedDay = selectedCalDate === cell.isoDate;

                  return (
                    <div
                      key={cell.isoDate}
                      onClick={() => setSelectedCalDate(cell.isoDate)}
                      className={`min-h-[76px] sm:min-h-[110px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between cursor-pointer ${
                        !cell.isCurrentMonth
                          ? 'bg-[#0B0E14]/60 text-slate-600'
                          : isSelectedDay
                          ? 'bg-[#192132]'
                          : 'hover:bg-[#161D2B]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-mono-num flex items-center justify-center font-semibold ${
                            cell.isToday
                              ? 'bg-[#FF6B4A] text-[#0B0E14]'
                              : cell.isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-600'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNewTaskModal('pendiente', cell.isoDate);
                          }}
                          aria-label={`Añadir tarea el ${cell.isoDate}`}
                          className="opacity-70 hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#242F46] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Desktop / Tablet Task Pills */}
                      <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map((t) => {
                          const pillColor =
                            t.status === 'terminado'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 line-through'
                              : t.category === 'examen'
                              ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
                              : 'bg-[#FF6B4A]/20 border-[#FF6B4A]/40 text-white';

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTask(t.id);
                              }}
                              className={`w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-medium truncate transition-transform hover:scale-[1.01] cursor-pointer ${pillColor}`}
                            >
                              {t.title}
                            </button>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <span className="text-[10px] text-slate-400 pl-1 font-mono-num">
                            +{dayTasks.length - 3} más
                          </span>
                        )}
                      </div>

                      {/* Mobile Compact Dots */}
                      {dayTasks.length > 0 && (
                        <div className="flex sm:hidden items-center justify-center gap-1 mt-1">
                          {dayTasks.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className={`w-2 h-2 rounded-full ${
                                t.status === 'terminado'
                                  ? 'bg-emerald-400'
                                  : t.category === 'examen'
                                  ? 'bg-indigo-400'
                                  : 'bg-[#FF6B4A]'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda Details (ideal for Phone & Tablet touch ergonomics) */}
            <div className="rounded-2xl bg-[#131822] border border-[#1F2737] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Entregas del día seleccionado</p>
                  <h3 className="text-sm font-bold text-white font-display">
                    {formatSpanishDate(selectedCalDate, todayIso).fullDate}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal('pendiente', selectedCalDate)}
                  className="px-3 py-1.5 rounded-xl bg-[#FF6B4A] text-[#0B0E14] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Añadir este día</span>
                </button>
              </div>

              {(tasksByDate[selectedCalDate] || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No hay entregas programadas para esta fecha.
                </p>
              ) : (
                <div className="space-y-2">
                  {(tasksByDate[selectedCalDate] || []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTask(t.id)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0E14] border border-[#1E2638] hover:border-[#FF6B4A] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">
                          {t.subtitle}
                        </p>
                        <p className="text-xs font-bold text-white truncate mt-0.5">{t.title}</p>
                      </div>
                      <span className="text-xs font-mono-num font-semibold text-[#FF6B4A] shrink-0">
                        {t.progress} %
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Floating Touch Drag Ghost Card (Tablet & Phone Touch Drag-and-Drop) */}
      {touchDragGhost && (
        <div
          aria-hidden="true"
          style={{
            left: `${touchDragGhost.x}px`,
            top: `${touchDragGhost.y}px`,
            transform: 'translate(-50%, -65%) rotate(2deg)',
          }}
          className="fixed z-50 pointer-events-none w-60 max-w-[78vw] rounded-2xl p-3.5 bg-[#171E2E]/95 border-2 border-[#FF6B4A] shadow-2xl backdrop-blur-md"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FF6B4A]">
            {dragOverColumn
              ? `Soltar en: ${STATUS_LABELS[dragOverColumn]}`
              : 'Arrastra a otra columna...'}
          </p>
          <p className="text-xs font-bold text-white font-display truncate mt-0.5">
            {touchDragGhost.title}
          </p>
        </div>
      )}
    </section>
  );
};
