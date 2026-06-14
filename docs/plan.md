# plan.md — Plan de Desarrollo: Git Challenge

**Referencia:** [spec.md](spec.md) · **Stack base existente:** Astro `^6.4.6`, Node ≥ 22.12, pnpm, TypeScript (`tsconfig` strict de Astro).

> **Actualización v1.1 (post-implementación):** la persistencia migró de `localStorage` a **Cloud Firestore** (sincronización entre dispositivos); la autenticación pasó de *Email link* a **Google OAuth** (la cuarentena del correo Duoc UC bloqueaba los enlaces); la compleción de unidad depende solo de **ejercicios + quiz**. Las secciones marcadas como completadas siguen describiendo el plan original; las notas en línea indican qué cambió.

---

## 1. Decisiones técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Framework de islas | **Preact** (`@astrojs/preact`) | Interactividad necesaria (quiz, ejercicios, progreso, export) con huella mínima (~4 kB); API React conocida. |
| Estado compartido | **nanostores** + `@nanostores/preact` | Estado reactivo entre islas (progreso en header + contenido). La persistencia ya no es automática vía `@nanostores/persistent`: se escribe explícitamente en Firestore (ver fila Persistencia). |
| Persistencia | **Cloud Firestore** (`firebase/firestore`) — documento `students/<email>` | Avance sincronizado entre dispositivos, asociado a la cuenta. Acceso directo desde el cliente con reglas de seguridad (cada estudiante solo su documento); cero backend propio. Fallback a `localStorage` solo en modo dev sin Firebase. |
| Contenido de unidades | **Astro Content Collections** — MDX para teoría/ejemplos (`@astrojs/mdx`), colección JSON con schema Zod para ejercicios y quiz | Contenido versionado en repo, tipado y validado en build; agregar/editar unidades sin tocar código. |
| Estilos | CSS plano con custom properties (tokens Duoc UC) + scoped styles de Astro | Sin dependencia de Tailwind; el manual define un sistema pequeño y estable. |
| Tipografías | `@fontsource/lato` + `@fontsource/merriweather` | Self-hosted, sin CDN, conforme a tipografías web del manual. |
| Autenticación | `firebase/auth` — **Google OAuth** (`signInWithPopup`) | Sin acceso al Azure de Duoc UC. Los correos Duoc UC son cuentas Google Workspace: login instantáneo sin correos. Verifica posesión de la cuenta institucional (`@duocuc.cl`, `@profesor.duoc.cl`, `@duoc.cl`) con validación de dominio exacto post-login. *(El plan original usaba Email link, descartado porque la cuarentena institucional bloquea los enlaces.)* |
| PDF | `jspdf` + `jspdf-autotable` (import dinámico al exportar) | Generación 100% cliente; autotable simplifica tablas del informe. |
| Resaltado de código | `Shiki` (incluido en Astro) para bloques en MDX | Cero JS en runtime para teoría. |
| Hash de integridad | Web Crypto API (`crypto.subtle.digest`) | Nativo, sin dependencias. |
| Despliegue | Build estático; objetivo primario **Netlify o Firebase Hosting** con HTTPS | HTTPS requerido por Firebase Auth; Firebase Hosting simplifica los *authorized domains*. |

**Dependencias a instalar:**
```bash
pnpm add @astrojs/preact preact @astrojs/mdx nanostores @nanostores/preact @nanostores/persistent firebase jspdf jspdf-autotable @fontsource/lato @fontsource/merriweather
```

## 2. Estructura de archivos objetivo

```
git-challenge/
├─ astro.config.mjs               # + integraciones preact, mdx
├─ .env / .env.example            # PUBLIC_FIREBASE_* (config del proyecto), PUBLIC_AUTH_DISABLED
├─ public/
│  └─ brand/duoc-logo.svg         # logotipo oficial (activo provisto, no redibujado)
├─ src/
│  ├─ styles/
│  │  ├─ tokens.css               # paleta y tipografías del manual (§11 spec)
│  │  └─ global.css               # reset, base, utilidades
│  ├─ layouts/
│  │  ├─ BaseLayout.astro         # <head>, fuentes, header, footer (duoc.cl + acreditación)
│  │  └─ UnitLayout.astro         # layout de unidad: stepper secciones + nav anterior/siguiente
│  ├─ components/
│  │  ├─ astro/                   # estáticos: Header, Footer, JourneyMap, TerminalBlock, DiagramSvg…
│  │  └─ islands/                 # Preact: AuthGate, LoginCard (correo+nombre / enlace enviado),
│  │                              #         ProgressBar, ExerciseCard, QuizQuestion, UnitProgress,
│  │                              #         SummaryTable, ExportPdfButton, ResetProgress
│  ├─ content/
│  │  ├─ config.ts                # schemas Zod: units, exercises, quiz
│  │  ├─ units/u1.mdx … u8.mdx    # conceptos + ejemplos (frontmatter: orden, título, puntos)
│  │  └─ activities/u1.json … u8.json  # ejercicios (patrones aceptados) + preguntas MCQ
│  ├─ lib/
│  │  ├─ auth.ts                  # wrapper Firebase Auth: signInWithGoogle, sesión, allowlist de dominios
│  │  ├─ storage.ts               # persistencia Firestore (students/<email>), fallback localStorage dev, hash integridad PDF
│  │  ├─ progress.ts              # stores nanostores: respuestas, % global, unlock de unidades
│  │  ├─ scoring.ts               # puntajes, factor de intentos, pctToNota() exigencia 60%
│  │  ├─ matcher.ts               # normalización y matching de respuestas de ejercicios
│  │  └─ pdf.ts                   # generación del informe (jspdf)
│  └─ pages/
│     ├─ index.astro              # landing + login + mapa del viaje
│     ├─ unidades/[slug].astro    # página dinámica de unidad (getStaticPaths sobre collection)
│     └─ resumen.astro            # resultados, nota, exportación
└─ tests/                         # vitest: scoring, matcher, storage
```

## 3. Fases de desarrollo

### Fase 0 — Fundaciones (0.5 día)
- [ ] Instalar dependencias e integrar `@astrojs/preact` y `@astrojs/mdx` en `astro.config.mjs`.
- [ ] Crear proyecto Firebase gratuito (cuenta propia) + habilitar método *Email link*; crear `.env.example` (`PUBLIC_FIREBASE_*`, `PUBLIC_AUTH_DISABLED`).
- [ ] `tokens.css` + `global.css` con paleta, tipografías y escala tipográfica del manual.
- [ ] Colocar `duoc-logo.svg` en `public/brand/` (gestionar activo oficial — ver Riesgos).
- **Hito:** `pnpm dev` levanta con fuentes y tokens cargados.

### Fase 1 — Layout y sistema de marca (1 día)
- [ ] `BaseLayout.astro`: head (SEO básico, lang `es-CL`), header con logo (área de reserva 2x via padding), slot, footer con `duoc.cl` + acreditación.
- [ ] Componentes estáticos: `TerminalBlock` (bloque terminal oscuro con prompt `$`), tarjetas, badges de estado de unidad.
- [ ] Página `index.astro` provisional con mapa del viaje estático (8 unidades, estados dummy).
- **Hito:** revisión visual contra manual (colores, tipografías, logo, footer).

### Fase 2 — Modelo de contenido (1 día)
- [ ] `content/config.ts`: schema `units` (slug, orden, título, descripción, puntos, secciones) y `activities` (ejercicios: id, enunciado, contexto, patrones regex aceptados, valor, pista; quiz: id, enunciado, alternativas a–d, correcta, explicación, valor).
- [ ] Redactar **Unidad 1 completa** (piloto): u1.mdx + u1.json con sus 3 ejercicios y 5 preguntas.
- [ ] `pages/unidades/[slug].astro` + `UnitLayout.astro` renderizando las 4 secciones desde la collection.
- **Hito:** Unidad 1 navegable con contenido real (sin interactividad aún).

### Fase 3 — Estado, persistencia y progreso (1.5 días)
- [ ] `storage.ts`: lectura/escritura clave `gitchallenge:v1:<email>`, versión de esquema, hash SHA-256, reset.
- [ ] `progress.ts`: stores (respuestas por unidad, % por unidad, % global, unidad activa, lógica de desbloqueo secuencial).
- [ ] `scoring.ts` con `pctToNota()` y suma de puntajes. **Tests unitarios** (casos 0→1.0, 30→2.5, 59.9, 60→4.0, 80→5.5, 100→7.0; factores de intento).
- [ ] Islas: `ProgressBar` (header), `UnitProgress` (stepper), `JourneyMap` interactivo (estados reales + bloqueo).
- **Hito:** progreso persiste tras recarga; unidades se desbloquean en orden.

### Fase 4 — Actividades interactivas (2 días)
- [ ] `matcher.ts`: normalización (trim, espacios múltiples, comillas, flags equivalentes) + match contra lista de patrones; tests con variantes (`checkout -b` ≡ `switch -c`, comillas simples/dobles, orden de flags).
- [ ] Isla `ExerciseCard`: enunciado, input/textarea, validación, 3 intentos con puntaje decreciente, pista tras primer fallo, estado congelado al acertar/agotar, escritura inmediata a storage.
- [ ] Isla `QuizQuestion`: alternativas radio, un intento, feedback inmediato + explicación, accesible por teclado.
- [ ] Marcado de sección visitada y `completedAt` de unidad al cerrar todos los ítems.
- **Hito:** Unidad 1 jugable de inicio a fin con puntaje real.

### Fase 5 — Autenticación por enlace de correo (1 día)
- [ ] `auth.ts`: init Firebase, `sendSignInLinkToEmail` (con `actionCodeSettings` → URL del sitio), detección y consumo del enlace al cargar (`isSignInWithEmailLink` + `signInWithEmailLink`), `updateProfile` con el nombre en el primer acceso, `onAuthStateChanged`, validación de dominio contra allowlist (`duocuc.cl`, `profesor.duoc.cl`, `duoc.cl` — comparación exacta del dominio) antes de enviar y post-login (signOut si no cumple), modo dev (`PUBLIC_AUTH_DISABLED`).
- [ ] Isla `LoginCard`: formulario nombre + correo institucional → estado "enlace enviado" con instrucciones (revisar spam, abrir en este mismo navegador) y reenvío con cooldown.
- [ ] Isla `AuthGate` (envuelve contenido protegido; muestra landing de login si no hay sesión).
- [ ] Manejo del caso borde: enlace abierto en otro navegador (Firebase pide re-confirmar correo) + aviso "tu avance vive en el navegador donde estudias".
- [ ] Header: nombre del estudiante + menú (cerrar sesión, reiniciar avance, exportar informe).
- [ ] Asociar clave de storage al email autenticado.
- **Hito:** flujo completo correo → enlace → sesión persistente → logout; correo externo rechazado con mensaje claro.

### Fase 6 — Contenido completo (2.5 días, paralelizable desde Fase 4)
- [ ] Redactar unidades 2–8 (MDX + JSON) según currículum §5 del spec: teoría, ejemplo básico, caso real, 31 ejercicios y 42 preguntas en total, sumando exactamente 100 puntos.
- [x] Diagramas SVG por unidad, en colores de marca (azul Escuela + amarillo), respetando la regla de no adelantar conceptos:
  - [x] **U2 — `AreasDiagram.astro`**: tres áreas y flujo `git add` → `git commit`.
  - [x] **U3 — `HistoryDiagram.astro`**: historia lineal de commits con `HEAD → main`.
  - [x] **U4 — `UndoDiagram.astro`**: `reset` (reescribe historia) vs `revert` (commit inverso).
  - [x] **U5 — `BranchDiagram.astro`**: crear rama `feature/login` y commits en paralelo (sin tags ni merge en el gráfico).
  - [x] **U5 — `MergeDiagram.astro`**: three-way merge con commit de merge (dos padres).
  - [x] **U6 — `RemoteDiagram.astro`**: local ↔ `origin` (push / pull / fetch / clone).
  - [x] **U7 — `FlowDiagram.astro`**: GitHub Flow (rama → commits → push → PR → review/merge → borrar).
  - [x] **U8 — `RebaseDiagram.astro`**: rebase reaplicando commits sobre `main` (historia lineal).
- [ ] Revisión pedagógica: dificultad creciente, lenguaje primer año, consistencia de terminología.
- **Hito:** las 8 unidades completas; total de puntos = 100 verificado en build (assert en `config.ts`).

### Fase 7 — Resumen y exportación PDF (1.5 días)
- [ ] `resumen.astro` + `SummaryTable`: tabla por unidad (completada / en curso / no iniciada), puntaje global, nota provisoria/final, CTA exportar **siempre habilitado** + acceso a exportación desde el header.
- [ ] `pdf.ts`: documento según §10 del spec (encabezado con marca, estado de avance, tabla resumen, detalle de respuestas por unidad iniciada con pendientes "sin responder", nota destacada con rótulo provisoria/final, hash de verificación, paginación, footer duoc.cl). Banner "INFORME PARCIAL — Avance X%" en cada página cuando el viaje esté incompleto; sufijo `-parcial` en el nombre de archivo. Import dinámico de jspdf.
- [ ] Verificar PDF en tres escenarios: viaje recién iniciado (0%), avance intermedio (ej. 4/8 unidades) y viaje completo. Legibilidad, saltos de página, tildes/ñ (fuente estándar jsPDF: usar helvetica con encoding correcto o embeber Lato si hay problemas con caracteres).
- **Hito:** PDF parcial y final correctos generados desde cualquier punto del viaje.

### Fase 8 — QA, accesibilidad y despliegue (1 día)
- [ ] Pasada WCAG AA (axe), navegación por teclado en quiz/ejercicios, focus management.
- [ ] Responsive 360/768/1024; Lighthouse ≥ 90.
- [ ] Pruebas E2E manuales del checklist de criterios de aceptación (§13 spec), incluyendo recarga, cierre de navegador y reset.
- [ ] Build de producción + despliegue (Netlify/Firebase Hosting), agregar el dominio publicado a *Authorized domains* del proyecto Firebase.
- [ ] README: setup, variables de entorno, cómo editar contenido, cómo desplegar.
- **Hito:** sitio publicado y validado.

**Esfuerzo total estimado:** ~12 días-persona. Ruta crítica: F0 → F1 → F2 → F3 → F4 → F7 → F8 (contenido F6 y auth F5 corren en paralelo desde F4).

## 4. Detalles de implementación clave

### 4.1 Fórmula de nota (scoring.ts)
```ts
export function pctToNota(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  const nota = p >= 60 ? 4 + (3 * (p - 60)) / 40 : 1 + (3 * p) / 60;
  return Math.round(nota * 10) / 10;
}
```

### 4.2 Matching de ejercicios (matcher.ts)
- Normalizar: trim, colapsar espacios, unificar comillas `"`/`'`, lowercase fuera de strings.
- Cada ejercicio define `accept: string[]` (regex). Ejemplo unidad 5:
  ```json
  { "id": "u5-e2",
    "accept": ["^git (switch -c|checkout -b) feature[-/]login$"],
    "hint": "Existen dos comandos modernos/clásicos para crear y moverse a una rama…" }
  ```
- Nunca evaluar con `eval`; solo `RegExp.test` sobre entrada normalizada.

### 4.3 Desbloqueo de unidades (progress.ts)
- `unitComplete(u) := todosEjerciciosRespondidos(u) && todoQuizRespondido(u)` — la teoría y los ejemplos son lectura libre y **no** cuentan. *(El plan original incluía `todasSeccionesVisitadas`; se eliminó.)*
- `unlocked(n) := n === 1 || unitComplete(n-1)`; unidad bloqueada muestra un banner en lugar del contenido.
- `reconcileCompletion(state)` recalcula `completedAt` de cada unidad y del viaje al cargar, reparando estados guardados antes de cambios en la lógica.

### 4.4 Autenticación con Google (auth.ts)
```ts
const fbApp = initializeApp(firebaseConfig);          // PUBLIC_FIREBASE_* desde .env
const auth = getAuth(fbApp);
await setPersistence(auth, browserLocalPersistence);  // sesión sobrevive a cierres

// Allowlist institucional: estudiantes, docentes y funcionarios.
// Comparación exacta del dominio — un endsWith aceptaría dominios ajenos como "otraduoc.cl".
const ALLOWED_DOMAINS = ["duocuc.cl", "profesor.duoc.cl", "duoc.cl"];

export function isInstitutionalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return ALLOWED_DOMAINS.includes(domain ?? "");
}

export async function signInWithGoogle(): Promise<SessionUser> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);   // popup de selección de cuenta Google
  const email = cred.user.email ?? "";
  if (!isInstitutionalEmail(email)) {                   // re-validación post-login
    await signOut(auth);
    throw new Error("DOMINIO_INVALIDO");
  }
  return { name: cred.user.displayName ?? email.split("@")[0], email };
}
```

### 4.5 Persistencia y feedback (storage.ts / progress.ts)
- `storage.ts`: `loadState`/`saveState`/`clearState` sobre `students/<email>`. Si Firebase no está configurado (dev), usa `localStorage`. En producción los errores de Firestore **se propagan** (no se cae a localStorage en silencio).
- `progress.ts`: `commit()` hace **actualización optimista** (`$state` primero) y luego `saveState`; expone `$saveStatus` (`idle|saving|saved|error`) y `$loadError`.
- UI: indicador de guardado en el header (`SaveStatus`), estados de carga en tarjetas de ejercicio/quiz, y mensaje de error de carga con botón "Reintentar".
- Reglas de seguridad Firestore: `request.auth.token.email == <docId> && email_verified == true`.

### 4.6 Sello de verificación del informe (storage.ts / pdf.ts)
- `computeIntegrity(state)`: genera un sello SHA-256 (Web Crypto) del avance, estable para un mismo avance.
- Al exportar el PDF se imprime el sello truncado en el pie y se **registra en Firestore** vía `recordReport(email, { hash, at, pct })` (campo `lastReport` + historial `reports[]` del documento `students/<email>`).
- En modo dev (sin Firebase) el registro se guarda en `localStorage`.
- Página `/verificar` (solo docentes/funcionarios): contrasta el código del PDF contra los informes registrados de esa cuenta.

## 5. Plan de pruebas

| Tipo | Herramienta | Cobertura |
|------|-------------|-----------|
| Unitarias | Vitest | `scoring` (fórmula y bordes), `matcher` (variantes de comandos), `storage` (migración, hash, reset), `auth.isInstitutionalEmail` (acepta los 3 dominios; rechaza subdominios no listados, `otraduoc.cl`, mayúsculas/espacios). |
| Componentes | Vitest + @testing-library/preact | `QuizQuestion` (un intento, feedback), `ExerciseCard` (intentos decrecientes). |
| Manuales E2E | Checklist | Flujo completo: login dev → 8 unidades → resumen → PDF; export parcial a 0% y a mitad del viaje; rechazo de dominio; enlace real recibido y consumido; persistencia tras recarga; reset. |
| Build | CI (`astro build` + `vitest run`) | Validación de schemas Zod + assert de 100 puntos totales. |

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| ~~Enlaces de Firebase a spam/cuarentena institucional~~ **(materializado)** | Usuarios no podían entrar | **Resuelto:** se reemplazó *Email link* por **Google OAuth**; los correos Duoc UC son cuentas Google, login sin correos de por medio. |
| Cuota gratuita de Firebase (lecturas/escrituras Firestore) | Bloqueo temporal | Volumen de un curso muy por debajo de la cuota Spark; cada respuesta es una escritura pequeña; monitorear en consola Firebase. |
| Firestore inaccesible (offline) al cargar/guardar | Avance no carga o no guarda | Mensaje de error con "Reintentar" al cargar; indicador "Sin guardar — revisa tu conexión" al escribir; actualización optimista mantiene el dato en memoria para reintento. |
| Logo oficial no disponible | Bloquea identidad visual | Solicitar al docente/Comunicación y Marketing; mientras tanto placeholder de texto "Duoc UC" con tipografía correcta, nunca un logo redibujado. |
| Reglas de Firestore mal configuradas | Fuga o pérdida de datos entre estudiantes | Reglas que restringen cada documento a su dueño (`email == docId && email_verified`); probar acceso cruzado denegado. |
| Integridad del informe entregado | PDF alterado | Sello de verificación impreso en el PDF y registrado en Firestore al exportar; página `/verificar` para docentes contrasta el código (ver §4.6). |
| Tildes/ñ en jsPDF | PDF ilegible | Probar temprano (Fase 7); si falla, embeber fuente Lato TTF en jsPDF. |
| Ambigüedad en respuestas de ejercicios | Frustración del estudiante | Patrones tolerantes + pistas + revisar con piloto (un estudiante real prueba la Unidad 1 al final de Fase 4). |

## 7. Variables de entorno

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `PUBLIC_FIREBASE_API_KEY` | `AIza...` | Config del proyecto Firebase (pública por diseño; la seguridad la dan los authorized domains y el método de login). |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `git-challenge-duoc.firebaseapp.com` | Dominio de auth del proyecto. |
| `PUBLIC_FIREBASE_PROJECT_ID` | `git-challenge-duoc` | ID del proyecto. |
| `PUBLIC_FIREBASE_APP_ID` | `1:1234:web:abcd` | ID de la app web. |
| `PUBLIC_AUTH_DISABLED` | `true` (solo dev) | Salta Firebase con usuario ficticio `dev@duocuc.cl`. |
