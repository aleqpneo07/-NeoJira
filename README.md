# Enfoque (NeoJira) — Gestor de Trabajos, Exámenes y Calendario

Aplicación interactiva en modo oscuro de alto contraste inspirada en flujos ágiles tipo **Jira / Linear**, diseñada para organizar **Trabajos**, **Exámenes** y **Tareas del Día a Día** desde **PC, Tableta y Teléfono Móvil**.

---

## ✨ Características Principales

- **3 Vistas Interactivas:**
  - **Tablero Kanban (`Tablero`):** Columnas *Pendiente*, *En marcha* y *Terminado* con soporte de **Drag & Drop** (arrastrar y soltar) y transiciones de un toque.
  - **Vista de Lista (`Lista`):** Resumen compacto ordenado por fecha de entrega, progreso (`%`) o alfabéticamente (`A-Z`).
  - **Calendario de Entregas (`Calendario`):** Cuadrícula mensual interactiva estilo Jira con indicadores por categoría, agenda diaria inferior y creación directa de entregas en cualquier día.
- **Inspector de Subtareas y Cálculo Automático:**
  - El progreso (`0% – 100%`) se calcula automáticamente al marcar o desmarcar pasos/temas.
  - Edición inline del texto de subtareas, etiquetas rápidas de momento (*En curso*, *Hoy*, *Mañana*) y confirmación en 2 pasos antes de eliminar tareas.
- **Sincronización Híbrida + Copia Portable:**
  - **Offline-First (`localStorage`):** Funciona al instante sin necesidad de registro.
  - **Cloud Sync en Tiempo Real (`Firebase Auth + Cloud Firestore`):** Sincroniza tareas y subtareas entre PC, Tableta y Móvil al iniciar sesión con Google, preservando el trabajo local previo.
  - **Exportar / Importar Backup (`.json`):** Permite guardar o transferir todas las tareas mediante un archivo JSON entre dispositivos.
- **Archivo Único Portable ([`Enfoque_NeoJira.html`](./Enfoque_NeoJira.html)):**
  - Versión autocontenida en un solo archivo `.html` lista para abrir directamente en cualquier navegador de **Móvil, Tableta o PC** sin necesidad de servidor ni Node.js.
- **Atajos de Teclado (PC / Tableta con teclado):**
  - `N`: Crear nueva tarea.
  - `/` o `Ctrl + K`: Buscar tareas.
  - `Esc`: Cerrar modales o paneles laterales.

---

## 🚀 Uso Rápido

### Opción 1: Archivo Único Portable (Sin instalación)
Abre directamente el archivo **[`Enfoque_NeoJira.html`](./Enfoque_NeoJira.html)** en cualquier navegador en tu ordenador, tableta o teléfono móvil.

### Opción 2: Entorno de Desarrollo (Vite + React + TypeScript)
```bash
npm install
npm run dev
```

---

## 🔒 Seguridad (`firestore.rules`)
Las reglas declarativas en [`firestore.rules`](./firestore.rules) validan estrictamente la propiedad por UID (`request.auth.uid`), tipos de datos, longitudes de cadenas, formato de fechas ISO (`YYYY-MM-DD`) y pertenencia jerárquica de subtareas (`isParentTaskOwner`).
