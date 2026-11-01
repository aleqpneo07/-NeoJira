/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  NavigationFilter,
  SUBTASK_CONSTRAINTS,
  SubtaskItem,
  TASK_CONSTRAINTS,
  TaskCategory,
  TaskDraftInput,
  TaskItem,
  TaskStatus,
  ViewMode,
} from './types/tasks';
import {
  calculateTaskProgress,
  computeMonthlySummary,
  countDeliveriesThisWeek,
  filterAndSortTasks,
  getInitialSeedData,
  getPriorityTodayDelivery,
  getTodayIsoString,
} from './utils/taskLogic';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskInspector } from './components/TaskInspector';
import { TaskModal } from './components/TaskModal';
import { SyncConnectModal } from './components/SyncConnectModal';
import { OfflineIndicator } from './components/OfflineIndicator';

const LOCAL_STORAGE_TASKS_KEY = 'enfoque_local_tasks_v1';
const LOCAL_STORAGE_SUBTASKS_KEY = 'enfoque_local_subtasks_v1';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`.slice(0, TASK_CONSTRAINTS.ID_MAX_LEN);
}

export default function App() {
  const todayIso = useMemo(() => getTodayIsoString(), []);

  // Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasSeededCloudRef = useRef<Set<string>>(new Set());

  // Local state (used immediately before login and synced with Firestore once signed in)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to seed data
    }
    return getInitialSeedData(getTodayIsoString()).tasks;
  });

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SUBTASKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to seed data
    }
    return getInitialSeedData(getTodayIsoString()).subtasks;
  });

  // Navigation & UI State
  const [activeFilter, setActiveFilter] = useState<NavigationFilter>('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tablero');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-estudio-lumen');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>('pendiente');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Persist to localStorage when in local mode
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
        localStorage.setItem(LOCAL_STORAGE_SUBTASKS_KEY, JSON.stringify(subtasks));
      } catch {
        // Ignore quota errors
      }
    }
  }, [tasks, subtasks, user]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners when authenticated
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tasksQuery = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const subtasksQuery = query(collection(db, 'subtasks'), where('ownerId', '==', user.uid));

    const unsubTasks = onSnapshot(
      tasksQuery,
      async (snapshot) => {
        if (snapshot.empty && !hasSeededCloudRef.current.has(user.uid)) {
          hasSeededCloudRef.current.add(user.uid);
          // Seed initial tasks into user's cloud account so their existing board carries over seamlessly
          try {
            const seed = getInitialSeedData(todayIso, user.uid);
            const batch = writeBatch(db);
            for (const t of seed.tasks) {
              batch.set(doc(db, 'tasks', t.id), {
                ownerId: user.uid,
                title: t.title.slice(0, TASK_CONSTRAINTS.TITLE_MAX_LEN),
                subtitle: t.subtitle.slice(0, TASK_CONSTRAINTS.SUBTITLE_MAX_LEN),
                category: t.category,
                status: t.status,
                dueDate: t.dueDate,
                tag: t.tag.slice(0, TASK_CONSTRAINTS.TAG_MAX_LEN),
                progress: t.progress,
                totalSubtasks: t.totalSubtasks,
                completedSubtasks: t.completedSubtasks,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            for (const s of seed.subtasks) {
              batch.set(doc(db, 'subtasks', s.id), {
                ownerId: user.uid,
                taskId: s.taskId,
                title: s.title.slice(0, SUBTASK_CONSTRAINTS.TITLE_MAX_LEN),
                completed: s.completed,
                scheduleLabel: s.scheduleLabel.slice(0, SUBTASK_CONSTRAINTS.LABEL_MAX_LEN),
                sortOrder: s.sortOrder,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await batch.commit();
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'tasks');
          }
          return;
        }

        const loadedTasks: TaskItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId || user.uid),
            title: String(data.title || ''),
            subtitle: String(data.subtitle || ''),
            category: (data.category as TaskCategory) || 'trabajo',
            status: (data.status as TaskStatus) || 'pendiente',
            dueDate: String(data.dueDate || todayIso),
            tag: String(data.tag || 'Tarea'),
            progress: Number(data.progress ?? 0),
            totalSubtasks: Number(data.totalSubtasks ?? 0),
            completedSubtasks: Number(data.completedSubtasks ?? 0),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setTasks(loadedTasks);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
    );

    const unsubSubtasks = onSnapshot(
      subtasksQuery,
      (snapshot) => {
        const loadedSubtasks: SubtaskItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId || user.uid),
            taskId: String(data.taskId || ''),
            title: String(data.title || ''),
            completed: Boolean(data.completed),
            scheduleLabel: String(data.scheduleLabel || ''),
            sortOrder: Number(data.sortOrder ?? 1),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setSubtasks(loadedSubtasks);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'subtasks');
      }
    );

    return () => {
      unsubTasks();
      unsubSubtasks();
    };
  }, [isAuthReady, user, todayIso]);

  // Keep selectedTaskId pointing to a valid task when tasks change
  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }
    if (!selectedTaskId || !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  // Derived collections & counts
  const filteredTasks = useMemo(
    () => filterAndSortTasks(tasks, activeFilter, searchQuery),
    [tasks, activeFilter, searchQuery]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const selectedTaskSubtasks = useMemo(
    () => subtasks.filter((s) => s.taskId === selectedTaskId),
    [subtasks, selectedTaskId]
  );

  const counts = useMemo(
    () => ({
      todo: tasks.length,
      trabajo: tasks.filter((t) => t.category === 'trabajo').length,
      examen: tasks.filter((t) => t.category === 'examen').length,
      diario: tasks.filter((t) => t.category === 'diario').length,
      entregas: tasks.filter((t) => t.status !== 'terminado').length,
    }),
    [tasks]
  );

  const monthlySummary = useMemo(() => computeMonthlySummary(tasks), [tasks]);
  const weeklyDeliveriesCount = useMemo(
    () => countDeliveriesThisWeek(tasks, todayIso),
    [tasks, todayIso]
  );
  const priorityToday = useMemo(
    () => getPriorityTodayDelivery(tasks, subtasks, todayIso),
    [tasks, subtasks, todayIso]
  );

  // Auth Actions
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsConnectModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(
        msg.includes('popup-closed-by-user')
          ? 'Cerraste la ventana de acceso antes de completar el inicio de sesión.'
          : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Task & Subtask Mutation Handlers
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsMobileDrawerOpen(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const taskSubs = subtasks.filter((s) => s.taskId === taskId);
    const { progress, totalSubtasks, completedSubtasks } =
      newStatus === 'terminado' && taskSubs.length === 0
        ? { progress: 100, totalSubtasks: 0, completedSubtasks: 0 }
        : calculateTaskProgress(taskSubs, newStatus);

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          status: newStatus,
          progress,
          totalSubtasks,
          completedSubtasks,
          tag: newStatus === 'terminado' ? 'Completado' : target.tag,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
      }
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                progress,
                totalSubtasks,
                completedSubtasks,
                tag: newStatus === 'terminado' ? 'Completado' : t.tag,
              }
            : t
        )
      );
    }
  };

  const handleDateChange = async (taskId: string, newDueDate: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          title: target.title,
          subtitle: target.subtitle,
          category: target.category,
          status: target.status,
          dueDate: newDueDate,
          tag: target.tag,
          progress: target.progress,
          totalSubtasks: target.totalSubtasks,
          completedSubtasks: target.completedSubtasks,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, dueDate: newDueDate } : t))
      );
    }
  };

  const handleCreateOrUpdateTask = async (
    draft: TaskDraftInput,
    editingTaskId?: string
  ) => {
    const ownerId = user ? user.uid : 'demo-user';

    if (editingTaskId) {
      const existing = tasks.find((t) => t.id === editingTaskId);
      if (!existing) return;

      if (user) {
        try {
          await updateDoc(doc(db, 'tasks', editingTaskId), {
            title: draft.title,
            subtitle: draft.subtitle,
            category: draft.category,
            status: draft.status,
            dueDate: draft.dueDate,
            tag: draft.tag,
            progress: existing.progress,
            totalSubtasks: existing.totalSubtasks,
            completedSubtasks: existing.completedSubtasks,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTaskId}`);
        }
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTaskId
              ? {
                  ...t,
                  title: draft.title,
                  subtitle: draft.subtitle,
                  category: draft.category,
                  status: draft.status,
                  dueDate: draft.dueDate,
                  tag: draft.tag,
                }
              : t
          )
        );
      }
      return;
    }

    // Creating a new Task + its initial Subtasks
    const newTaskId = makeSafeId('task');
    const initialSubs = (draft.initialSubtasks || []).map((s, idx) => ({
      id: makeSafeId(`sub-${idx}`),
      ownerId,
      taskId: newTaskId,
      title: s.title,
      completed: Boolean(s.completed),
      scheduleLabel: s.scheduleLabel || '',
      sortOrder: idx + 1,
    }));

    const { progress, totalSubtasks, completedSubtasks } = calculateTaskProgress(
      initialSubs,
      draft.status
    );

    const newTask: TaskItem = {
      id: newTaskId,
      ownerId,
      title: draft.title,
      subtitle: draft.subtitle,
      category: draft.category,
      status: draft.status,
      dueDate: draft.dueDate,
      tag: draft.tag,
      progress,
      totalSubtasks,
      completedSubtasks,
    };

    if (user) {
      try {
        await setDoc(doc(db, 'tasks', newTaskId), {
          ownerId,
          title: newTask.title,
          subtitle: newTask.subtitle,
          category: newTask.category,
          status: newTask.status,
          dueDate: newTask.dueDate,
          tag: newTask.tag,
          progress: newTask.progress,
          totalSubtasks: newTask.totalSubtasks,
          completedSubtasks: newTask.completedSubtasks,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const sub of initialSubs) {
          await setDoc(doc(db, 'subtasks', sub.id), {
            ownerId,
            taskId: newTaskId,
            title: sub.title,
            completed: sub.completed,
            scheduleLabel: sub.scheduleLabel,
            sortOrder: sub.sortOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `tasks/${newTaskId}`);
      }
    } else {
      setTasks((prev) => [newTask, ...prev]);
      setSubtasks((prev) => [...prev, ...initialSubs]);
    }

    setSelectedTaskId(newTaskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskSubtasks = subtasks.filter((s) => s.taskId === taskId);

    if (user) {
      try {
        for (const s of taskSubtasks) {
          await deleteDoc(doc(db, 'subtasks', s.id));
        }
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
      }
    } else {
      setSubtasks((prev) => prev.filter((s) => s.taskId !== taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }

    setIsMobileDrawerOpen(false);
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const targetSub = subtasks.find((s) => s.id === subtaskId);
    if (!targetSub) return;

    const parentTask = tasks.find((t) => t.id === targetSub.taskId);
    if (!parentTask) return;

    const nextCompleted = !targetSub.completed;
    const updatedSubsForTask = subtasks
      .filter((s) => s.taskId === parentTask.id)
      .map((s) => (s.id === subtaskId ? { ...s, completed: nextCompleted } : s));

    const { progress, totalSubtasks, completedSubtasks } = calculateTaskProgress(
      updatedSubsForTask,
      parentTask.status
    );

    const nextStatus: TaskStatus =
      totalSubtasks > 0 && completedSubtasks === totalSubtasks
        ? 'terminado'
        : parentTask.status === 'terminado' && completedSubtasks < totalSubtasks
        ? 'en_marcha'
        : parentTask.status;

    if (user) {
      try {
        await updateDoc(doc(db, 'subtasks', subtaskId), {
          completed: nextCompleted,
          scheduleLabel: nextCompleted ? '' : targetSub.scheduleLabel,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'tasks', parentTask.id), {
          status: nextStatus,
          progress,
          totalSubtasks,
          completedSubtasks,
          tag: parentTask.tag,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `subtasks/${subtaskId}`);
      }
    } else {
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtaskId
            ? {
                ...s,
                completed: nextCompleted,
                scheduleLabel: nextCompleted ? '' : s.scheduleLabel,
              }
            : s
        )
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === parentTask.id
            ? {
                ...t,
                status: nextStatus,
                progress,
                totalSubtasks,
                completedSubtasks,
              }
            : t
        )
      );
    }
  };

  const handleCycleSubtaskLabel = async (subtaskId: string, nextLabel: string) => {
    const targetSub = subtasks.find((s) => s.id === subtaskId);
    if (!targetSub) return;

    if (user) {
      try {
        await updateDoc(doc(db, 'subtasks', subtaskId), {
          completed: targetSub.completed,
          scheduleLabel: nextLabel.slice(0, SUBTASK_CONSTRAINTS.LABEL_MAX_LEN),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `subtasks/${subtaskId}`);
      }
    } else {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, scheduleLabel: nextLabel } : s))
      );
    }
  };

  const handleAddSubtask = async (
    taskId: string,
    title: string,
    scheduleLabel: string
  ) => {
    const parentTask = tasks.find((t) => t.id === taskId);
    if (!parentTask) return;

    const existingSubs = subtasks.filter((s) => s.taskId === taskId);
    if (existingSubs.length >= TASK_CONSTRAINTS.MAX_SUBTASKS) return;

    const ownerId = user ? user.uid : 'demo-user';
    const newSub: SubtaskItem = {
      id: makeSafeId('sub'),
      ownerId,
      taskId,
      title: title.trim().slice(0, SUBTASK_CONSTRAINTS.TITLE_MAX_LEN),
      completed: false,
      scheduleLabel: scheduleLabel.trim().slice(0, SUBTASK_CONSTRAINTS.LABEL_MAX_LEN),
      sortOrder: existingSubs.length + 1,
    };

    const nextSubs = [...existingSubs, newSub];
    const { progress, totalSubtasks, completedSubtasks } = calculateTaskProgress(
      nextSubs,
      parentTask.status
    );

    if (user) {
      try {
        await setDoc(doc(db, 'subtasks', newSub.id), {
          ownerId,
          taskId,
          title: newSub.title,
          completed: false,
          scheduleLabel: newSub.scheduleLabel,
          sortOrder: newSub.sortOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'tasks', taskId), {
          status: parentTask.status,
          progress,
          totalSubtasks,
          completedSubtasks,
          tag: parentTask.tag,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `subtasks/${newSub.id}`);
      }
    } else {
      setSubtasks((prev) => [...prev, newSub]);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, progress, totalSubtasks, completedSubtasks }
            : t
        )
      );
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const targetSub = subtasks.find((s) => s.id === subtaskId);
    if (!targetSub) return;

    const parentTask = tasks.find((t) => t.id === targetSub.taskId);
    if (!parentTask) return;

    const remainingSubs = subtasks.filter(
      (s) => s.taskId === parentTask.id && s.id !== subtaskId
    );
    const { progress, totalSubtasks, completedSubtasks } = calculateTaskProgress(
      remainingSubs,
      parentTask.status
    );

    if (user) {
      try {
        await deleteDoc(doc(db, 'subtasks', subtaskId));
        await updateDoc(doc(db, 'tasks', parentTask.id), {
          status: parentTask.status,
          progress,
          totalSubtasks,
          completedSubtasks,
          tag: parentTask.tag,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `subtasks/${subtaskId}`);
      }
    } else {
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === parentTask.id
            ? { ...t, progress, totalSubtasks, completedSubtasks }
            : t
        )
      );
    }
  };

  const openNewTaskModal = (defaultStatus: TaskStatus = 'pendiente') => {
    setEditingTask(null);
    setModalDefaultStatus(defaultStatus);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const defaultCategoryForModal: TaskCategory =
    activeFilter === 'trabajo' || activeFilter === 'examen' || activeFilter === 'diario'
      ? activeFilter
      : 'trabajo';

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0B0E14] text-[#F3F4F6]">
      <OfflineIndicator />

      {/* Left Navigation Sidebar + Mobile Bottom Navigation */}
      <Sidebar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        counts={counts}
        monthlySummary={monthlySummary}
        priorityToday={priorityToday}
        onSelectTask={handleSelectTask}
        userEmail={user?.email || null}
        isSyncing={!isAuthReady}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
      />

      {/* Main Center Board (Kanban / Lista) */}
      <main className="flex-1 min-w-0 flex h-full overflow-hidden">
        <KanbanBoard
          tasks={filteredTasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          onStatusChange={handleStatusChange}
          onOpenNewTaskModal={openNewTaskModal}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          weeklyDeliveriesCount={weeklyDeliveriesCount}
          todayIso={todayIso}
          userEmail={user?.email || null}
        />

        {/* Right Detail & Subtasks Inspector (Desktop Panel + Mobile Bottom Sheet) */}
        <TaskInspector
          task={selectedTask}
          subtasks={selectedTaskSubtasks}
          todayIso={todayIso}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          onToggleSubtask={handleToggleSubtask}
          onCycleSubtaskLabel={handleCycleSubtaskLabel}
          onAddSubtask={handleAddSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onStatusChange={handleStatusChange}
          onDateChange={handleDateChange}
          onEditTask={openEditTaskModal}
          onDeleteTask={handleDeleteTask}
        />
      </main>

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateOrUpdateTask}
        editingTask={editingTask}
        defaultStatus={modalDefaultStatus}
        defaultCategory={defaultCategoryForModal}
        todayIso={todayIso}
      />

      {/* Cloud Sync & Mobile/PC PWA Connection Guide Modal */}
      <SyncConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        userEmail={user?.email || null}
        onGoogleSignIn={handleGoogleSignIn}
        authError={authError}
      />
    </div>
  );
}
