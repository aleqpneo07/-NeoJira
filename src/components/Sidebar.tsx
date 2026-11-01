import React from 'react';
import {
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Cloud,
  LayoutGrid,
  LogIn,
  LogOut,
  SunMedium,
} from 'lucide-react';
import { NavigationFilter, TaskItem } from '../types/tasks';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeFilter: NavigationFilter;
  onSelectFilter: (filter: NavigationFilter) => void;
  counts: {
    todo: number;
    trabajo: number;
    examen: number;
    diario: number;
    entregas: number;
  };
  monthlySummary: {
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
    averageProgress: number;
  };
  priorityToday: {
    task: TaskItem;
    remainingSubtasks: number;
    isToday: boolean;
  } | null;
  onSelectTask: (taskId: string) => void;
  userEmail: string | null;
  isSyncing: boolean;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenConnectModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeFilter,
  onSelectFilter,
  counts,
  monthlySummary,
  priorityToday,
  onSelectTask,
  userEmail,
  isSyncing,
  onGoogleSignIn,
  onSignOut,
  onOpenConnectModal,
}) => {
  const navItems: {
    id: NavigationFilter;
    label: string;
    shortLabel: string;
    count: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'todo',
      label: 'Proyectos y Todo',
      shortLabel: 'Todo',
      count: counts.todo,
      icon: LayoutGrid,
    },
    {
      id: 'trabajo',
      label: 'Trabajos',
      shortLabel: 'Trabajos',
      count: counts.trabajo,
      icon: Briefcase,
    },
    {
      id: 'examen',
      label: 'Exámenes',
      shortLabel: 'Exámenes',
      count: counts.examen,
      icon: BookOpen,
    },
    {
      id: 'diario',
      label: 'Día a día',
      shortLabel: 'Día a día',
      count: counts.diario,
      icon: SunMedium,
    },
    {
      id: 'entregas',
      label: 'Entregas',
      shortLabel: 'Entregas',
      count: counts.entregas,
      icon: CalendarClock,
    },
  ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside
        aria-label="Navegación principal"
        className="hidden lg:flex lg:flex-col w-[264px] shrink-0 bg-[#0F131C] border-r border-[#1E2638] p-5 justify-between select-none"
      >
        <div className="space-y-6">
          {/* Brand Header (Matches "E Encargo" from reference image) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B4A]/20 border border-[#FF6B4A]/40 flex items-center justify-center text-[#FF6B4A] font-display font-bold text-sm">
                E
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
                Enfoque
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenConnectModal}
              aria-label="Configurar sincronización entre PC y móvil"
              className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#19202E] cursor-pointer whitespace-nowrap"
            >
              PC ↔ Móvil
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1" aria-label="Categorías de tareas">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFilter(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1B2333] text-white border border-[#2A364F]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B28]'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#FF6B4A]' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span
                    className={`font-mono-num text-xs ${
                      isActive ? 'text-[#FF6B4A] font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Este mes summary (Matches "Este mes" section in reference image without € prices) */}
          <div className="pt-4 border-t border-[#1E2638] px-2 space-y-2.5">
            <p className="text-xs font-medium text-slate-500">Este mes</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between">
                <span className="text-slate-400">· Completados</span>
                <span className="font-mono-num font-semibold text-emerald-400">
                  {monthlySummary.completedCount}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">· En marcha</span>
                <span className="font-mono-num font-semibold text-[#FF6B4A]">
                  {monthlySummary.inProgressCount}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">· Por entregar</span>
                <span className="font-mono-num font-semibold text-slate-200">
                  {monthlySummary.pendingCount + monthlySummary.inProgressCount}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">· Avance global</span>
                <span className="font-mono-num font-semibold text-white">
                  {monthlySummary.averageProgress} %
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Area: Floating Priority Delivery Card + Cloud Sync & PWA */}
        <div className="space-y-3 pt-4">
          {/* Priority Delivery Card (Matches bottom-left "Encargo · hoy / Entrega: Estudio Lumen / Quedan 2 tareas" card in reference) */}
          {priorityToday && (
            <button
              type="button"
              onClick={() => onSelectTask(priorityToday.task.id)}
              className="w-full text-left rounded-2xl bg-[#161D2B] border border-[#28344E] hover:border-[#FF6B4A]/60 p-3.5 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B4A]/20 border border-[#FF6B4A]/40 flex items-center justify-center text-[#FF6B4A] font-display font-bold text-xs shrink-0 mt-0.5">
                  E
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 truncate">
                    {priorityToday.isToday ? 'Prioridad · hoy' : 'Próxima entrega'}
                  </p>
                  <p className="text-xs font-semibold text-white truncate mt-0.5 group-hover:text-[#FF6B4A] transition-colors">
                    Entrega: {priorityToday.task.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
                    {priorityToday.remainingSubtasks === 1
                      ? 'Queda 1 tarea'
                      : `Quedan ${priorityToday.remainingSubtasks} tareas`}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Cloud Sync Box (PC <-> Mobile) */}
          <div className="rounded-2xl bg-[#131822] border border-[#1E2638] p-3.5 space-y-2.5">
            {userEmail ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Sincronizado (PC/Móvil)</span>
                  </span>
                  <button
                    type="button"
                    onClick={onSignOut}
                    aria-label="Cerrar sesión de Google"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Cloud className="w-3.5 h-3.5 text-[#FF6B4A] shrink-0" />
                  <span className="truncate font-medium">
                    {isSyncing ? 'Conectando...' : 'Conectar PC y Móvil'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-[#0B0E14] hover:bg-slate-200 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Sincronizar con Google</span>
                </button>
              </div>
            )}

            <PWAInstallButton onOpenConnectGuide={onOpenConnectModal} />
          </div>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation Bar (<= 15% viewport height, >= 44px touch targets) */}
      <nav
        aria-label="Navegación móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#0F131C]/95 backdrop-blur-md border-t border-[#1E2638] grid grid-cols-5 items-center px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFilter(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-[#FF6B4A]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1 truncate max-w-[64px]">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
