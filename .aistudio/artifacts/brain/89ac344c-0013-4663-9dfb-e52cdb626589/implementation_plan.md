# Enfoque — Gestor Diario de Trabajos, Exámenes y Tareas

Un espacio de trabajo personal e interactivo inspirado en la estructura visual de tu imagen de referencia, adaptado específicamente para organizar tus **Trabajos**, **Exámenes** y **Tareas del Día a Día**, sincronizado en tiempo real entre tu ordenador y tu móvil mediante tu cuenta de Google e instalable como aplicación nativa (PWA).

### Decisiones Confirmadas y Revisión del Usuario

> [!IMPORTANT]
> Revisa las decisiones clave confirmadas a partir de tus respuestas antes de pasar a la construcción e integración con Firebase:

- **Sincronización en Tiempo Real (PC + Móvil)**: Se utilizará **Firebase Authentication (Google Sign-In)** junto con **Cloud Firestore** en tiempo real (`onSnapshot`). Cualquier cambio que hagas en el ordenador (mover una tarjeta, marcar una subtarea o crear un examen) aparecerá al instante en tu móvil y viceversa. Además, contará con modo de prueba instantáneo con datos de ejemplo editables antes de iniciar sesión.
- **Diseño en Modo Oscuro Moderno con Alto Contraste**: Adaptaremos la composición limpia de 3 paneles de la imagen de referencia a una estética **Dark Mode de alto contraste** (fondo obsidiana profundo, tarjetas en pizarra elevada y acentos vibrantes en coral/ámbar, índigo y esmeralda para destacar entregas urgentes y progreso).
- **Tarjetas Limpias sin Métricas Monetarias**: Eliminamos los precios en euros (`450 €`, `1.800 €`) de la imagen original para centrar cada tarjeta únicamente en lo que importa: **título**, **categoría/asignatura**, **fecha de entrega o examen**, **estado** y **barra de progreso automática** calculada según las subtareas completadas.
- **App Instalable (PWA) con Soporte Offline**: Se configurará como Progressive Web App completa con botón de instalación integrado en la interfaz (para Android, Windows/Mac y guía paso a paso en iPhone/iOS) y caché offline para consultar tus tareas incluso sin conexión.

---

### 1. Concepto General y Propuesta de Valor

- **Qué hace**: Reproduce la experiencia exacta del gestor de la imagen (barra lateral de navegación con resumen mensual, tablero central dividido en *Pendiente*, *En marcha* y *Terminado* con cambio a vista de *Lista*, panel lateral derecho de inspección con desglose de subtareas interactivas y tarjeta flotante de *Entregas de hoy*), pero transformado para tu vida académica, laboral y personal.
- **Categorías Principales**:
  - **Todo**: Vista global de todas tus actividades activas.
  - **Trabajos**: Proyectos, entregas prácticas, informes o encargos.
  - **Exámenes**: Pruebas, parciales y entregas finales con lista de temas a estudiar.
  - **Día a Día**: Tareas cotidianas, recados, hábitos y gestiones personales.
  - **Entregas**: Vista filtrada y ordenada cronológicamente por fechas límite próximas.
- **Valor Principal**: Saber de un solo vistazo qué tienes pendiente, qué está en marcha hoy y qué has terminado, desde cualquier dispositivo.

---

### 2. Experiencia de Usuario y Diseño Visual

#### Flujos de Usuario Clave
1. **Vista de Escritorio (3 Paneles + Recordatorio Flotante)**:
   - **Panel Izquierdo (Navegación y Resumen)**: Filtros rápidos por área (*Todo*, *Trabajos*, *Exámenes*, *Día a Día*, *Entregas*), resumen de actividad del mes (*Completados* vs *Por entregar*), estado de sincronización con Google y botón para instalar la App.
   - **Panel Central (Tablero Kanban / Lista)**: Cabecera con contador de entregas de la semana, buscador en tiempo real, selector interactivo `Tablero | Lista` y botón `+ Nueva tarea`. Las tarjetas pueden moverse entre **Pendiente**, **En marcha** y **Terminado** con un clic o arrastrando, mostrando su barra de progreso y fecha límite.
   - **Panel Derecho (Inspector de Detalle y Subtareas)**: Al seleccionar cualquier tarjeta (como *"Identidad Estudio Lumen"* en tu imagen), se muestra su tarjeta destacada con porcentaje de progreso (`90 %`), selector de fecha de entrega (`6 de noviembre, 2026`) y la lista interactiva de subtareas o temas donde puedes marcar/desmarcar casillas, añadir nuevos pasos o etiquetar su urgencia (*En curso*, *Mañana*, *Hoy*).
   - **Notificación Flotante Inferior ("Entregas de hoy")**: Replica el widget inferior izquierdo de la imagen mostrando la entrega más prioritaria del día y cuántas subtareas quedan por completar.
2. **Vista de Móvil (Ergonomía Táctil Nativa)**:
   - Cabecera compacta con buscador, filtro rápido por estado (`Pendiente`, `En marcha`, `Terminado`) y acceso al perfil de sincronización.
   - Al tocar una tarjeta en el móvil, el **Inspector de Detalle y Subtareas** se despliega suavemente como un panel deslizable inferior (*Bottom Sheet*) con botones táctiles amplios (`44px+`).
   - Barra de navegación inferior fija (*Bottom Tab Bar*) para cambiar con el pulgar entre *Tablero*, *Trabajos*, *Exámenes*, *Día a Día* y *Entregas*.

#### Identidad Visual y Tema (Modo Oscuro Vibrante)
- **Dirección Estética**: Oscuro moderno, nítido y táctil, manteniendo la jerarquía limpia de la referencia pero con contraste elevado para largas sesiones en PC o consulta rápida en el móvil.
- **Paleta de Colores (Tailwind Tokens)**:
  - `--background`: `#0B0E14` (Obsidiana profundo, 60% del lienzo).
  - `--surface`: `#131822` (Pizarra oscura para columnas y tarjetas, 30% estructural) con bordes sutiles `#1F2737`.
  - `--accent-primary`: `#FF6B4A` (Coral/Ámbar vibrante para la tarjeta destacada del inspector, barras de progreso activas y avisos de *"Entrega hoy"*).
  - `--accent-secondary`: `#6366F1` (Índigo eléctrico para Exámenes), `#10B981` (Esmeralda para elementos completados) y `#F59E0B` (Ámbar para entregas próximas).
- **Tipografía y Jerarquía**:
  - **Display y Títulos**: `Plus Jakarta Sans` (SemiBold/Bold) para encabezados de sección, nombres de proyectos y porcentajes de avance.
  - **Cuerpo y Controles**: `DM Sans` para lectura limpia en tarjetas y subtareas.
  - **Fechas y Contadores**: `JetBrains Mono` con `tabular-nums` para porcentajes (`90 %`), contadores de columnas y fechas.

---

### 3. Decisiones de Producto y Alternativas

- **Decisión 1: Sincronización con Firebase Firestore + Caché Local**
  - *Enfoque elegido*: Base de datos Cloud Firestore asociada a tu cuenta de Google con oyentes en tiempo real (`onSnapshot`) y persistencia local.
  - *Por qué*: Es la única forma fiable de que al abrir la app en el móvil en la calle o en el PC en casa veas exactamente las mismas tareas al segundo, sin tener que exportar archivos ni escanear códigos manualmente.
  - *Alternativa descartada*: Almacenamiento solo en el navegador (`localStorage`), ya que aislaría los datos del móvil respecto a los del ordenador.
- **Decisión 2: Aplicación Web Progresiva (PWA) frente a Web Estándar**
  - *Enfoque elegido*: Configuración completa de Manifiesto Web, Service Worker con `vite-plugin-pwa` y botón de instalación dentro de la app.
  - *Por qué*: Te permite instalarla en la pantalla de inicio de tu móvil (Android o iPhone) y en el escritorio de tu PC a pantalla completa sin barra de direcciones del navegador.

---

### 4. Arquitectura Técnica y Estrategia de Datos

#### Diagrama de Arquitectura y Componentes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     APLICACIÓN CLIENTE (PC & MÓVIL PWA)                  │
│                                                                          │
│  ┌────────────────────┐   ┌──────────────────────┐   ┌────────────────┐  │
│  │  Barra Lateral /   │   │    Lienzo Principal   │   │  Inspector de  │  │
│  │  Bottom Nav Móvil  │   │  (Kanban / Lista)    │   │   Detalle y    │  │
│  │                    │   │                      │   │   Subtareas    │  │
│  │ • Filtro Categoría │   │ • Buscador en vivo   │   │ • Progreso %   │  │
│  │   (Trabajos,       │   │ • Selector Tablero / │   │ • Fecha Límite │  │
│  │    Exámenes,       │   │   Lista              │   │ • Checklist    │  │
│  │    Día a Día)      │   │ • Columnas:          │   │   Interactivo  │  │
│  │ • Resumen del Mes  │   │   - Pendiente        │   │ • Añadir/Borrar│  │
│  │ • Botón Instalar   │   │   - En marcha        │   │   Subtareas    │  │
│  │   App (PWA)        │   │   - Terminado        │   │ • Notas/Estado │  │
│  └─────────┬──────────┘   └──────────┬───────────┘   └────────┬───────┘  │
│            │                         │                        │          │
│            └─────────────────────────┼────────────────────────┘          │
│                                      ▼                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │            Gestor de Estado React + Capa de Sincronización         │  │
│  │  • Cálculo automático de progreso (subtareas completadas / total)  │  │
│  │  • Widget Flotante "Entregas de hoy" (filtro de urgencia diaria)   │  │
│  └───────────────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────┘
                                       │
                    Sincronización en Tiempo Real (onSnapshot)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   FIREBASE CLOUD BACKEND & PWA SERVICE WORKER            │
│                                                                          │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Firebase Authentication         │  │ Cloud Firestore (/items)      │  │
│  │ • Login con Google (1 clic)     │  │ • Reglas de seguridad por UID │  │
│  │ • Sesión persistente PC/Móvil   │  │ • Sincronización instantánea  │  │
│  └─────────────────────────────────┘  └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Datos (`Item` y `Subtask`)
- **Elemento Principal (`TaskItem`)**:
  - `id`: Identificador único.
  - `ownerId`: UID del usuario autenticado en Google (garantiza privacidad total).
  - `title`: Nombre del trabajo, examen o tarea (ej. *"Examen de Derecho Mercantil"*, *"Entrega Proyecto Web"*).
  - `subtitle`: Asignatura, área o contexto (ej. *"Universidad"*, *"Cliente / Trabajo"*, *"Personal"*).
  - `category`: `'trabajo' | 'examen' | 'diario'`.
  - `status`: `'pendiente' | 'en_marcha' | 'terminado'`.
  - `dueDate`: Fecha clave en formato ISO (`YYYY-MM-DD`) para ordenar entregas y detectar *"Entrega hoy"* o *"Esta semana"*.
  - `tag`: Etiqueta breve de estado o fase (ej. *"Temario"*, *"Entrega hoy"*, *"Práctica"*, *"Repaso"*).
  - `subtasks`: Lista acotada de pasos o temas (`id`, `title`, `completed`, `scheduleLabel` como *"En curso"* o *"Mañana"*).
  - `progress`: Porcentaje (`0` a `100`) actualizado automáticamente cada vez que marcas o desmarcas una subtarea.

#### Mapeo de Interacciones
- **Marcar/Desmarcar Subtarea**: En el panel derecho, al hacer clic en cualquier subtarea, se invierte su estado `completed`, se recalcula inmediatamente la barra de progreso (`0%–100%`) tanto en el inspector como en la tarjeta del tablero, y si todas las subtareas se completan ofrece o actualiza el avance al 100%.
- **Cambiar Estado (`Pendiente` ↔ `En marcha` ↔ `Terminado`)**: Desde los botones rápidos de cada tarjeta, arrastrando entre columnas o desde el selector del inspector.
- **Crear / Editar / Eliminar**: Modal ágil para crear nuevos trabajos, exámenes o tareas diarias con sus subtareas iniciales, además de edición directa en el panel derecho.
