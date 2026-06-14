# Git Challenge — Viaje de Aprendizaje de Git

Plataforma web educativa de **Duoc UC — Escuela de Informática y Telecomunicaciones** que guía a estudiantes de primer año a través de un **viaje de aprendizaje de Git** en 8 unidades progresivas. Cada unidad combina teoría, ejemplos, ejercicios prácticos validados y un quiz. El avance se guarda en la nube y el estudiante puede exportar **en cualquier momento** un informe PDF con su detalle de respuestas, puntaje (0–100) y nota (1.0–7.0, exigencia 60%) para entregar a su profesor.

> Documentación de diseño completa en [`docs/spec.md`](docs/spec.md) y [`docs/plan.md`](docs/plan.md).

## Características

- **8 unidades progresivas** — de `git config` hasta `rebase`, tags y Conventional Commits. Las unidades se desbloquean en orden al completar la anterior.
- **31 ejercicios** con validación por patrones (tolerante a variantes equivalentes, ej. `git switch -c` ≡ `git checkout -b`) y hasta 3 intentos con puntaje decreciente (100 % / 70 % / 40 %).
- **42 preguntas de quiz** de selección múltiple con feedback inmediato.
- **Autenticación con Google** restringida a cuentas institucionales Duoc UC (`@duocuc.cl`, `@profesor.duoc.cl`, `@duoc.cl`).
- **Persistencia en Cloud Firestore**: el avance se sincroniza entre dispositivos, asociado a la cuenta del estudiante, con indicador de estado de guardado.
- **Informe PDF** generado 100 % en el cliente (parcial o final) con identidad Duoc UC, puntaje y nota.
- Diseño responsivo conforme al Manual de Identidad Corporativa Duoc UC 2024.

## Stack

| Área | Tecnología |
|------|-----------|
| Framework | [Astro](https://astro.build) `^6.4` (build estático) |
| Islas interactivas | [Preact](https://preactjs.com) (`@astrojs/preact`) |
| Estado | [nanostores](https://github.com/nanostores/nanostores) |
| Contenido | Astro Content Collections — MDX (teoría) + JSON con schema Zod (actividades) |
| Autenticación | Firebase Authentication — Google OAuth |
| Persistencia | Cloud Firestore (fallback a `localStorage` en modo dev) |
| PDF | `jspdf` + `jspdf-autotable` (import dinámico) |
| Estilos | CSS con custom properties (tokens de marca Duoc UC) |
| Tipografías | `@fontsource` (Lato + Merriweather, self-hosted) |

**Requisitos:** Node ≥ 22.12 · pnpm.

## Puesta en marcha

### Opción A — Modo desarrollo (sin Firebase)

La forma más rápida de levantar el proyecto. No requiere cuenta Firebase: el login es inmediato como `dev@duocuc.cl` y el avance se guarda en `localStorage`.

```bash
pnpm install
cp .env.example .env      # en Windows PowerShell: Copy-Item .env.example .env
# Asegúrate de que el .env contenga: PUBLIC_AUTH_DISABLED=true
pnpm dev                  # http://localhost:4321
```

### Opción B — Con Firebase (Google + Firestore)

Para probar el flujo real de autenticación y persistencia en la nube:

1. **Crea un proyecto** en [Firebase Console](https://console.firebase.google.com).
2. **Authentication** → habilita el proveedor **Google**.
3. **Firestore Database** → crea la base en modo producción (región `us-central1` o cercana) y publica estas reglas. Cada estudiante solo accede a su propio documento; el personal docente/funcionario puede leer (no escribir) para la verificación de informes:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isVerified() {
         return request.auth != null && request.auth.token.email_verified == true;
       }
       function isOwner(email) {
         return isVerified() && request.auth.token.email == email;
       }
       function isStaff() {
         return isVerified() && (
           request.auth.token.email.matches('^[^@]+@profesor[.]duoc[.]cl$') ||
           request.auth.token.email.matches('^[^@]+@duoc[.]cl$')
         );
       }
       match /students/{email} {
         allow read:  if isOwner(email) || isStaff();
         allow write: if isOwner(email);
       }
     }
   }
   ```
4. **Project settings → Tus apps** → copia la config web a tu `.env`:
   ```env
   PUBLIC_FIREBASE_API_KEY=...
   PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
   PUBLIC_FIREBASE_APP_ID=1:...:web:...
   # NO definir PUBLIC_AUTH_DISABLED (o dejarlo vacío) en producción
   ```
5. Para producción, agrega tu dominio publicado en **Authentication → Settings → Authorized domains** (`localhost` ya viene incluido para desarrollo).

```bash
pnpm install
pnpm dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PUBLIC_FIREBASE_API_KEY` | Config del proyecto Firebase (pública por diseño). |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de auth del proyecto. |
| `PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto. |
| `PUBLIC_FIREBASE_APP_ID` | ID de la app web. |
| `PUBLIC_AUTH_DISABLED` | `true` solo en desarrollo: salta Firebase (usuario ficticio + localStorage). Vacío en producción. |

La seguridad no depende del secreto de estos valores, sino de los *authorized domains*, el proveedor Google y las reglas de Firestore.

## Scripts

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Servidor de desarrollo en `localhost:4321`. |
| `pnpm build` | Build estático de producción en `./dist/`. |
| `pnpm preview` | Previsualiza el build localmente. |
| `pnpm astro check` | Chequeo de tipos de Astro. |

## Estructura del proyecto

```
src/
├─ components/
│  ├─ astro/        # Estáticos: Header, Footer, DuocLogo, TerminalBlock, Callout
│  └─ islands/      # Preact: LoginCard, ExerciseCard, QuizQuestion, SummaryView,
│                   #         UnitProgressIsland, HeaderProgress, SaveStatus, UserMenu…
├─ content/
│  ├─ units/        # u1.mdx … u8.mdx — teoría y ejemplos (frontmatter: orden, título, puntos)
│  └─ activities/   # u1.json … u8.json — ejercicios (patrones aceptados) + preguntas de quiz
├─ layouts/         # BaseLayout, UnitLayout
├─ lib/
│  ├─ auth.ts       # Firebase Auth (Google) + allowlist de dominios
│  ├─ storage.ts    # Persistencia Firestore (students/<email>) + integridad del PDF
│  ├─ progress.ts   # Stores nanostores: avance, compleción, desbloqueo, scoring
│  ├─ scoring.ts    # Puntajes, factor de intentos, conversión pct → nota (exigencia 60 %)
│  ├─ matcher.ts    # Normalización y matching de respuestas de ejercicios
│  ├─ domains.ts    # Allowlist institucional Duoc UC
│  └─ pdf.ts        # Generación del informe (jsPDF)
├─ pages/
│  ├─ index.astro          # Landing + login + mapa del viaje
│  ├─ unidades/[slug].astro # Página dinámica de unidad
│  └─ resumen.astro        # Resultados, nota y exportación
└─ styles/          # tokens.css (marca Duoc UC) + global.css
```

## Editar contenido

Las unidades son archivos de contenido versionados, sin tocar código:

- **Teoría y ejemplos:** `src/content/units/uN.mdx` (frontmatter con `order`, `slug`, `title`, `description`, `points`).
- **Ejercicios y quiz:** `src/content/activities/uN.json`. Cada ejercicio define `accept` (patrones regex tolerantes) y los metadatos en [`src/lib/unitsMeta.ts`](src/lib/unitsMeta.ts) deben coincidir (cantidad de ejercicios/preguntas y puntos). El total de puntos debe sumar **100** (se verifica en build).

## Modelo de evaluación

- Puntaje total del curso: **0–100** (repartido entre las 8 unidades, ~50 % ejercicios / ~50 % quiz).
- Una unidad se completa al **responder todos sus ejercicios y todas las preguntas del quiz** (la teoría y los ejemplos son lectura libre).
- Conversión a nota chilena con exigencia 60 %: `0 → 1.0 · 60 → 4.0 · 100 → 7.0`. Todo ítem no respondido vale 0, por lo que la nota refleja exactamente lo avanzado.

## Verificación de informes (`/verificar`)

Cada informe PDF incluye un **código de verificación** en el pie. La página **`/verificar`** permite a un **docente o funcionario** (cuenta `@profesor.duoc.cl` o `@duoc.cl`) confirmar la autenticidad de un informe:

1. El docente inicia sesión con su cuenta institucional Duoc UC.
2. Ingresa el **correo del estudiante** y el **código de verificación** del PDF.
3. La página confirma si ese código corresponde a un informe realmente exportado por esa cuenta, mostrando nombre, correo, porcentaje de avance y fecha de exportación.

El acceso está restringido a personal docente/funcionario; un estudiante no puede usar esta herramienta. Cada exportación queda registrada en Firestore (`students/<email>`), por lo que se pueden verificar informes emitidos en distintos momentos del viaje.

> Requiere las reglas de Firestore que habilitan la lectura por parte del personal docente (ver más abajo).

## Despliegue

Build estático desplegable en Firebase Hosting, Netlify, Vercel o GitHub Pages. **HTTPS es obligatorio** (requisito de Firebase Auth). Recuerda registrar el dominio publicado en los *Authorized domains* del proyecto Firebase.

```bash
pnpm build   # genera ./dist
```

---

Material educativo para uso académico interno · Duoc UC — Escuela de Informática y Telecomunicaciones.
