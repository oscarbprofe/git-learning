# spec.md — Git Challenge: Viaje de Aprendizaje de Git

**Proyecto:** git-challenge
**Institución:** Duoc UC — Escuela de Informática y Telecomunicaciones
**Audiencia:** Estudiantes de primer año de Ingeniería Informática
**Fecha:** Junio 2026
**Versión:** 1.1

> **Cambios v1.1 respecto de v1.0:** la persistencia migró de `localStorage` a **Cloud Firestore** (avance sincronizado entre dispositivos, asociado a la cuenta). La autenticación pasó de *Email link* a **Google OAuth** (los correos institucionales Duoc UC son cuentas Google Workspace; el enlace por correo quedaba bloqueado por la cuarentena de correo institucional). La **compleción de una unidad** ahora depende únicamente de responder **todos los ejercicios + todo el quiz** (se eliminó el requisito de "secciones visitadas").

---

## 1. Visión general

Sitio web estático (Astro) que guía al estudiante a través de un **viaje de aprendizaje de Git** estructurado en unidades progresivas (de menos a más complejidad). Cada unidad combina teoría, ejemplos básicos y de uso real, ejercicios prácticos y preguntas de selección múltiple. Todo el avance y las respuestas quedan persistidas en **Cloud Firestore** (asociadas a la cuenta del estudiante, sincronizadas entre dispositivos) y el estudiante puede exportar **en cualquier momento** un **informe PDF** con su detalle de respuestas, puntaje (0–100) y **nota (1.0–7.0, exigencia 60%) hasta el punto que alcanzó a estudiar**, que entrega al profesor como evidencia del curso.

El acceso requiere **verificación del correo institucional** (dominios `@duocuc.cl`, `@profesor.duoc.cl` o `@duoc.cl`) mediante **inicio de sesión con Google** (Firebase Authentication, sin backend propio).

## 2. Objetivos

| # | Objetivo |
|---|----------|
| O1 | Enseñar Git desde cero hasta colaboración real (GitHub) a estudiantes sin experiencia previa. |
| O2 | Evaluar el aprendizaje con ejercicios verificables y preguntas teóricas auto-corregidas. |
| O3 | Persistir todo el avance en la nube (Cloud Firestore, sin backend propio) asociado a la cuenta del estudiante, y permitir exportar un informe PDF formal en cualquier momento del viaje. |
| O4 | Calcular nota chilena 1.0–7.0 con exigencia 60% a partir del puntaje 0–100. |
| O5 | Garantizar identidad del usuario verificando la posesión de un buzón institucional Duoc UC (`@duocuc.cl`, `@profesor.duoc.cl` o `@duoc.cl`). |
| O6 | Respetar estrictamente el Manual de Identidad Corporativa Duoc UC 2024. |

## 3. Alcance

### Incluido
- Sitio estático Astro con islas interactivas (sin backend propio; Firebase Authentication + Cloud Firestore como servicios externos gestionados).
- 8 unidades de aprendizaje + página de inicio + página de resumen/exportación.
- Autenticación con **Google** (Firebase Auth) con restricción a los dominios institucionales `@duocuc.cl`, `@profesor.duoc.cl` y `@duoc.cl`.
- Persistencia completa en **Cloud Firestore** (respuestas, intentos, timestamps, progreso), asociada a la cuenta y sincronizada entre dispositivos.
- Indicador de progreso global y por unidad, e indicador de estado de guardado en la nube.
- Exportación de informe PDF cliente-side **en cualquier momento** (parcial o final) con detalle, puntaje y nota hasta el punto alcanzado.
- Diseño responsivo conforme al manual de marca Duoc UC.

### Excluido (fuera de alcance v1)
- Backend propio o lógica de servidor (Firestore se accede directamente desde el cliente con reglas de seguridad).
- Login con Microsoft Entra ID (descartado: requiere App Registration en el Azure de Duoc UC, al cual no hay acceso).
- Terminal Git real embebida (los ejercicios se validan contra la entrada del estudiante, no ejecutan Git).
- Panel del profesor (la evidencia es el PDF entregado).
- Edición de contenidos vía CMS.

## 4. Usuarios y roles

| Rol | Descripción |
|-----|-------------|
| Estudiante | Rol principal. Se autentica con `@duocuc.cl`, recorre las unidades, responde y exporta su informe. |
| Profesor / funcionario | Receptor del PDF. Puede autenticarse con `@profesor.duoc.cl` o `@duoc.cl` para conocer y revisar el viaje (misma experiencia que el estudiante; no existe panel docente en v1). |

> El sitio no diferencia comportamiento por dominio: los tres dominios acceden a la misma experiencia.

## 5. Currículum: unidades del viaje

Las unidades van **de menos a más**. Cada unidad contiene 4 secciones: **Conceptos** (teoría) y **Ejemplos** (básicos + caso de uso real) como material de lectura, y **Ejercicios** (prácticos, respuesta escrita validada) y **Quiz** (selección múltiple) como ítems evaluados. Solo Ejercicios y Quiz cuentan para completar la unidad y para el puntaje.

| # | Unidad | Contenidos clave | Ejercicios | Preguntas quiz | Puntos |
|---|--------|------------------|-----------|----------------|--------|
| 1 | ¿Qué es el control de versiones? | Problema que resuelve, historia, VCS centralizado vs distribuido, instalación de Git, `git config` (user.name, user.email), ayuda (`git help`) | 3 | 5 | 10 |
| 2 | Mi primer repositorio | `git init`, working directory / staging area / repositorio, `git status`, `git add`, `git commit`, mensajes de commit, `git log` | 4 | 5 | 12 |
| 3 | Explorando la historia | `git log` (formatos, filtros), `git diff` (working/staged/commits), `git show`, `.gitignore`, `git commit --amend` | 4 | 5 | 12 |
| 4 | Deshacer cambios | `git restore` / `git restore --staged`, `git reset` (soft/mixed/hard), `git revert`, `git stash`, cuándo usar cada uno | 4 | 6 | 14 |
| 5 | Ramas (branches) | Qué es una rama, `git branch`, `git switch` / `git checkout`, `git merge` (fast-forward vs three-way), **resolución de conflictos**, `git branch -d` | 4 | 6 | 14 |
| 6 | Repositorios remotos | GitHub, `git clone`, `git remote`, `git push`, `git pull`, `git fetch` vs `pull`, tracking branches, autenticación (HTTPS/SSH/token) | 4 | 5 | 13 |
| 7 | Colaboración en equipo | Fork, Pull Request, code review, GitHub Flow, issues, conflictos en colaboración, README y documentación | 4 | 5 | 13 |
| 8 | Buenas prácticas y nivel pro | `git rebase` (y sus riesgos), `git tag` y releases, Conventional Commits, `git cherry-pick`, alias, flujo de trabajo profesional completo | 4 | 5 | 12 |
| | **Total** | | **31** | **42** | **100** |

### Estructura interna de cada unidad
1. **Conceptos** — teoría en lenguaje cercano, con diagramas (SVG) del flujo working → staging → repo, ramas, etc.
2. **Ejemplos** — (a) ejemplo básico paso a paso con bloques de terminal simulada; (b) **caso de uso real** contextualizado (ej.: "tu equipo de proyecto de Portafolio debe…").
3. **Ejercicios** — enunciado con escenario; el estudiante escribe el/los comando(s) o el resultado esperado. Validación automática contra patrones aceptados (regex tolerante a variantes equivalentes, ej. `git switch -c rama` ≡ `git checkout -b rama`). Máximo **3 intentos** por ejercicio con puntaje decreciente (100% / 70% / 40% del valor del ejercicio).
4. **Quiz** — preguntas de selección múltiple (4 alternativas, 1 correcta). **Un solo intento** por pregunta; feedback inmediato con explicación de la alternativa correcta.

### Reglas de navegación
- Las unidades se desbloquean secuencialmente: la unidad N+1 se habilita al **completar** la unidad N, entendiéndose por completar **responder todos los ejercicios y todas las preguntas del quiz** de esa unidad. La teoría (Conceptos) y los Ejemplos son material de apoyo de lectura libre y **no** cuentan como ítems a completar.
- Dentro de una unidad la navegación es libre entre sus secciones.
- El estudiante puede revisar unidades completadas en modo lectura (respuestas ya enviadas quedan congeladas).

## 6. Evaluación y nota

### Puntaje
- Puntaje total del curso: **0 a 100 puntos** (distribución según tabla §5).
- Dentro de cada unidad, el puntaje se reparte ~50% ejercicios / ~50% quiz (ajustado a enteros por ítem en el archivo de contenido).
- Ejercicio: valor × factor de intento (1.0 / 0.7 / 0.4; 0 si agota intentos sin acertar).
- Pregunta quiz: valor completo si es correcta, 0 si no.

### Conversión a nota (escala chilena, exigencia 60%)
```
si pct >= 60:  nota = 4.0 + 3.0 * (pct - 60) / 40
si pct <  60:  nota = 1.0 + 3.0 * pct / 60
```
- `pct` = puntaje obtenido (0–100). Nota redondeada a 1 decimal, acotada a [1.0, 7.0].
- Ejemplos: 0 → 1.0 · 30 → 2.5 · 60 → 4.0 · 80 → 5.5 · 100 → 7.0.
- **Nota hasta el punto alcanzado:** el puntaje siempre se calcula sobre el **total de 100 puntos del curso**; todo ítem no respondido vale 0. Así, la nota refleja exactamente lo que el estudiante alcanzó a estudiar al momento de consultarla o exportarla (ej.: completó las unidades 1–4 sin errores = 48 puntos → nota 3.4).
- La nota se rotula **provisoria** mientras el viaje no esté 100% completo y **final** al completarlo; la fórmula es la misma en ambos casos.

## 7. Autenticación (verificación de correo institucional — Firebase Auth + Google)

**Contexto de la decisión:** no existe acceso al Azure/Entra ID de Duoc UC, por lo que el login Microsoft real queda descartado. La primera implementación usó *Email link (passwordless)*, pero **la cuarentena del correo institucional Duoc UC bloquea los enlaces de Firebase**, dejando a los usuarios sin poder entrar. Dado que los correos institucionales Duoc UC son **cuentas Google Workspace**, se adopta **inicio de sesión con Google** (Firebase Authentication): el estudiante elige su cuenta `@duocuc.cl` en el popup de Google y queda autenticado al instante, sin correos de por medio. Garantiza que quien accede **controla una cuenta institucional Duoc UC** — misma garantía de identidad — sin backend propio (solo SDK cliente + servicio gestionado gratuito).

**Dominios admitidos (allowlist):**

| Dominio | Público |
|---------|---------|
| `@duocuc.cl` | Estudiantes |
| `@profesor.duoc.cl` | Docentes |
| `@duoc.cl` | Funcionarios / colaboradores |

La validación compara el **dominio exacto** del correo (lo que sigue al `@`) contra la allowlist — nunca un `endsWith` simple, que aceptaría dominios ajenos como `otraduoc.cl`.

### Flujo
1. Landing: el usuario pulsa **"Continuar con Google"**.
2. Se abre el popup de Google (`signInWithPopup` + `GoogleAuthProvider`); el usuario elige su cuenta.
3. Re-validación post-login del **dominio exacto** del correo autenticado contra la allowlist; si no cumple → `signOut` inmediato y mensaje "Solo se aceptan correos institucionales Duoc UC (@duocuc.cl, @profesor.duoc.cl o @duoc.cl)".
4. El `displayName` y `email` provienen de la cuenta Google (verificados); se usan en header, ruta del documento Firestore y PDF.

| Requisito | Detalle |
|-----------|---------|
| Librería | `firebase/auth` (SDK web modular, solo cliente; import dinámico). |
| Proveedor | Firebase Authentication, método **Google** (`GoogleAuthProvider` + `signInWithPopup`). Plan gratuito Spark. |
| Restricción de dominio | Allowlist `duocuc.cl` / `profesor.duoc.cl` / `duoc.cl` con comparación exacta de dominio, aplicada tras completar el login. |
| Garantía de identidad | Posesión demostrada de la cuenta Google institucional Duoc UC. |
| Datos usados | `displayName` y `email` de la cuenta Google: header, ruta `students/<email>` en Firestore y PDF. |
| Gate de acceso | Sin sesión válida solo se ve la landing de login. Unidades y exportación requieren sesión. |
| Persistencia de sesión | Persistencia local de Firebase (`browserLocalPersistence`): la sesión sobrevive a cierres del navegador. |
| Modo desarrollo | `PUBLIC_AUTH_DISABLED=true` permite trabajar sin proyecto Firebase (usuario ficticio `dev@duocuc.cl`); nunca activa en producción. |

> **Dependencia externa (autogestionada):** crear un proyecto Firebase gratuito con cuenta propia, habilitar el proveedor **Google**, crear la base **Cloud Firestore** con sus reglas de seguridad y registrar el dominio del sitio desplegado en *Authorized domains*. No requiere ninguna gestión con TI de Duoc UC.

### Alternativas evaluadas y descartadas
- **Email link (passwordless)**: implementado inicialmente, pero los enlaces de Firebase quedan retenidos por la cuarentena del correo institucional Duoc UC; los usuarios nunca reciben el enlace. Descartado a favor de Google OAuth.
- **App Entra multitenant propia** (botón "Iniciar sesión con Microsoft"): alto riesgo de que el tenant de Duoc UC bloquee el consentimiento a aplicaciones de terceros — destrabarlo exige un admin de Duoc UC, justo el acceso que no se tiene.
- **Declaración de identidad sin verificación** (escribir nombre/correo sin comprobar): no garantiza identidad; descartada.

## 8. Persistencia en Cloud Firestore

Colección `students`, un documento por estudiante con ID = correo institucional en minúsculas: **`students/<email>`**. El avance se sincroniza entre dispositivos (no vive en el navegador). En **modo desarrollo** (sin Firebase configurado) se usa `localStorage` con clave `gitchallenge:v1:<email>` como respaldo, mismo esquema.

```jsonc
// Documento students/<email>
{
  "version": 1,
  "student": { "name": "...", "email": "...@duocuc.cl" },
  "startedAt": "ISO-8601",
  "lastActivityAt": "ISO-8601",
  "completedAt": null,                  // ISO-8601 al terminar el viaje
  "units": {
    "u1": {
      "exercises": {
        "u1-e1": { "answer": "git config --global user.name \"Ana\"",
                    "attempts": 2, "correct": true, "score": 2.1, "maxScore": 2,
                    "answeredAt": "ISO-8601" }
      },
      "quiz": {
        "u1-q1": { "selected": "b", "correct": true, "score": 1, "maxScore": 1,
                    "answeredAt": "ISO-8601" }
      },
      "completedAt": "ISO-8601 | null"  // se setea al responder todos los ejercicios + quiz
    }
  }
}
```

- **Escritura inmediata** en cada respuesta (sin botón "guardar"), con **actualización optimista**: la UI refleja el cambio al instante y luego se confirma la escritura en Firestore.
- **Feedback de guardado** en el header: indicador "Guardando… / Guardado / Sin guardar — revisa tu conexión".
- **Manejo de error de carga**: si Firestore es inaccesible al iniciar, se muestra un mensaje con botón "Reintentar" y **no** se crea un estado vacío (evita sobrescribir datos existentes).
- **Reglas de seguridad de Firestore**: cada estudiante solo puede leer/escribir su propio documento (`request.auth.token.email == <docId>` y `email_verified == true`).
- `integrity` (sello de verificación del PDF): SHA-256 (Web Crypto) del payload + sal fija; se calcula **al exportar** y se imprime truncado en el pie del informe como evidencia disuasiva (no infalible; se documenta como tal). Ya no se almacena en el documento.
- Botón "Reiniciar mi avance" con doble confirmación (borra solo el documento del usuario actual).

## 9. Indicador de progreso

- **Header persistente:** barra de progreso global (% de ítems respondidos sobre el total: ejercicios + quiz de todas las unidades) con texto "Llevas X% — te faltan N actividades", e indicador de estado de guardado en la nube.
- **Mapa del viaje (home):** las 8 unidades como ruta/camino con estados: 🔒 bloqueada · ▶ en curso (con % interno) · ✓ completada (con puntaje obtenido/total).
- **Dentro de la unidad:** indicador de progreso de la unidad con contadores "Ejercicios X/N" y "Quiz X/M" y badge "Unidad completada" al cerrar todos los ítems.
- **Página resumen:** tabla por unidad (puntaje, %), puntaje global, nota provisoria/final y CTA de exportación **siempre habilitado** (genera informe parcial o final según avance).

## 10. Exportación a PDF

| Aspecto | Detalle |
|---------|---------|
| Librería | `jspdf` + `jspdf-autotable` (100% cliente, sin backend). |
| Habilitación | **Disponible en todo momento** desde la página resumen (y acceso en el header). El informe refleja el avance exacto al instante de exportar. |
| Variantes | **Informe final** si `completedAt != null`; **Informe parcial** en caso contrario, con banner visible "INFORME PARCIAL — Avance: X% (N de 8 unidades completadas)" en el encabezado de cada página. |
| Nota reportada | Calculada sobre el total de 100 puntos del curso (ítems no respondidos = 0), rotulada "Nota final" o "Nota provisoria al X% de avance" según corresponda (regla §6). |
| Nombre archivo | `informe-git-challenge-<apellido-nombre>-<YYYYMMDD>.pdf` (sufijo `-parcial` si el viaje está incompleto). |

### Contenido del informe
1. **Portada/encabezado:** marca Duoc UC (según normas de logo §11), título "Informe de Viaje de Aprendizaje Git", nombre y correo del estudiante, fecha de inicio, fecha de término (o "en curso"), fecha de emisión y estado de avance (% global, unidades completadas).
2. **Resumen de resultados:** tabla por unidad (estado: completada / en curso / no iniciada · puntaje obtenido / máximo / %), **puntaje total 0–100** y **nota 1.0–7.0** destacada, con leyenda "Exigencia 60% — nota 4.0 con 60 puntos. Ítems no respondidos puntúan 0".
3. **Detalle de respuestas:** por unidad iniciada, cada ejercicio (enunciado resumido, respuesta del estudiante, intentos, correcto/incorrecto, puntaje) y cada pregunta de quiz (enunciado, alternativa marcada, correcta, puntaje). Ítems pendientes listados como "sin responder".
4. **Pie de página:** código de verificación (hash de integridad truncado), `duoc.cl`, numeración de páginas.

## 11. Diseño según Manual de Identidad Corporativa Duoc UC 2024

### Sistema cromático (paleta web oficial, pág. 24 del manual)
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--duoc-amarillo` | `#F1B634` | Color primario de marca: CTA, barra de progreso, acentos, estados activos. |
| `--duoc-negro` | `#000000` | Logotipo, textos de máxima jerarquía. |
| `--duoc-negro-80` | `#1A1A1A` | Texto principal, header/footer oscuros. |
| `--duoc-gris` | `#666666` | Texto secundario, metadatos. |
| `--duoc-blanco` | `#FFFFFF` | Fondos, texto sobre fondos oscuros. |
| `--duoc-azul-escuela` | `#4E7CDD` | Azul Escuela de Informática y Telecomunicaciones: acento secundario (enlaces, iconografía de unidad, badges). Permitida variación de tono según manual. |

Regla del manual: para gráficas de escuelas se usa el color representativo de la escuela (azul = Informática y Telecomunicaciones) y **siempre** pueden acompañar los colores corporativos.

### Tipografía (set oficial para web, pág. 18)
- **Merriweather** (serif) — títulos y llamados a la acción (Regular 400, Bold 700, Heavy/Black 900 Italic).
- **Lato** (sans-serif) — cuerpo de texto y bajadas (Regular 400, Bold 700, Black 900).
- Carga self-hosted vía `@fontsource` (sin CDN externos). Fallbacks: `Georgia, serif` / `'Segoe UI', Arial, sans-serif`.
- Código/terminal: fuente monoespaciada del sistema (`ui-monospace, Consolas, monospace`) — no normada por el manual, se usa neutra.

### Normas de marca aplicadas
- **Logotipo:** versión oficial en esquina superior (izquierda en este sitio), respetando **área de reserva 2x** y **tamaño mínimo** (≥ 3 cm impreso / proporción equivalente en pantalla); jamás distorsionar, recolorear, rotar ni superponer sobre fotografías sin contraste. Sobre fondo oscuro se usa la aplicación en negativo permitida.
- **Footer obligatorio:** presencia de `duoc.cl` y acreditación en el pie de página de todas las vistas y en el PDF (norma de plantillas, págs. 42 y 57).
- **Escritura de la marca en texto:** siempre "Duoc UC" (Duoc con mayúscula inicial, UC todo en mayúsculas).
- **Activo requerido:** archivo oficial del logotipo (SVG/PNG alta) — solicitar a Comunicación y Marketing o usar el provisto por el docente; **no** redibujarlo.

### Lineamientos UI
- Layout limpio, fondos blancos, alto contraste (texto `#1A1A1A` sobre blanco).
- Amarillo `#F1B634` reservado a acción/avance (no como fondo de grandes bloques de texto: contraste insuficiente con blanco).
- Bloques de "terminal" oscuros (`#1A1A1A`) con texto claro y prompt `$`.
- Componentes con esquinas levemente redondeadas, sombras sutiles; estética sobria y juvenil acorde a "seriedad y compromiso, con dinamismo y juventud".

## 12. Requisitos no funcionales

| Categoría | Requisito |
|-----------|-----------|
| Accesibilidad | WCAG 2.1 AA: contraste, navegación por teclado, `aria-*` en quiz/acordeones, focus visible. |
| Responsivo | Mobile-first; breakpoints 360px / 768px / 1024px+. |
| Rendimiento | Sitio estático; JS solo en islas (auth, quiz, ejercicios, progreso, PDF). Lighthouse ≥ 90. |
| Idioma | 100% español de Chile. |
| Navegadores | Últimas 2 versiones de Chrome/Edge/Firefox/Safari. |
| Privacidad | El avance (respuestas, puntajes, timestamps) se guarda en Cloud Firestore asociado a la cuenta del estudiante; a Firebase Auth viajan correo y nombre de la cuenta Google. Reglas de Firestore garantizan que cada estudiante solo accede a su propio documento. Sin analytics. |
| Despliegue | Build estático (`astro build`) desplegable en GitHub Pages / Netlify / Vercel / Firebase Hosting. HTTPS obligatorio (requisito Firebase Auth). |

## 13. Criterios de aceptación (resumen)

1. Un usuario sin sesión no puede acceder a ninguna unidad; solo inician sesión cuentas Google con dominio exacto `@duocuc.cl`, `@profesor.duoc.cl` o `@duoc.cl`, y un login con cualquier otro dominio se cierra de inmediato.
2. Las unidades se desbloquean en orden (al responder todos los ejercicios + quiz de la anterior) y el progreso, guardado en Firestore, sobrevive a recargas, cierres de navegador y cambios de dispositivo.
3. Cada respuesta (ejercicio o quiz) queda en Firestore con timestamp e intentos, con confirmación visible de guardado.
4. La exportación funciona **en cualquier punto del viaje**: genera un PDF con identidad Duoc UC, detalle de lo respondido, puntaje 0–100 (no respondido = 0) y nota 1.0–7.0 correcta según fórmula de exigencia 60% (verificada con los casos: 0→1.0, 60→4.0, 100→7.0). Si el viaje está incompleto, el PDF queda rotulado como informe parcial con el % de avance; si está completo, como informe final.
5. La UI usa exclusivamente la paleta y tipografías del manual; logo con área de reserva y footer con `duoc.cl` + acreditación presentes en sitio y PDF.
6. El sitio compila estático con Astro y funciona en móvil y escritorio.
