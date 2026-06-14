# Feature spec — Caché offline (IndexedDB/Firestore) + View Transitions

**Estado:** propuesto · **Fecha:** 2026-06-14 · **Relacionado:** [spec.md](../../spec.md), [plan.md](../../plan.md)

---

## 1. Problema

La app es un **MPA Astro**: cada navegación recarga la página completa. En cada recarga
se reinicializa el SDK de Firebase, se resuelve la sesión de forma asíncrona y se lee el
progreso desde Firestore por red. El usuario percibe, al volver al mapa o entrar a una
unidad, una secuencia de estados de carga ("Cargando tu avance…") cada vez, aunque ya haya
cargado esos datos segundos antes.

El objetivo es que **la lectura del avance sea instantánea en la navegación habitual** y
que los datos se mantengan **sincronizados en segundo plano**, sin sacrificar la
sincronización entre dispositivos ni la persistencia en la nube.

## 2. Objetivos

| # | Objetivo |
|---|----------|
| O1 | Que volver al mapa o entrar a una unidad dentro de la misma sesión sea **instantáneo** (sin recarga ni re-lectura). |
| O2 | Que en un arranque en frío o recarga (F5, nueva pestaña) el avance se pinte **desde caché local (IndexedDB)** sin esperar la red. |
| O3 | Que los cambios se **sincronicen en segundo plano** con Firestore, incluyendo escrituras offline encoladas. |
| O4 | Que el avance editado en **otro dispositivo/pestaña** se refleje automáticamente (listener en vivo). |
| O5 | No introducir backend propio ni romper las reglas de seguridad existentes. |

## 3. Alcance

### Incluido
- **Navegación client-side** con Astro View Transitions (`<ClientRouter />`): sin recarga
  completa entre páginas del sitio.
- **Caché persistente de Firestore en IndexedDB** (`persistentLocalCache` con soporte
  multi-pestaña).
- **Lectura reactiva con `onSnapshot`**: entrega primero la copia de IndexedDB y luego la
  del servidor, y queda escuchando cambios.
- **Escrituras no bloqueantes**: `setDoc` va a la cola local y sincroniza en segundo plano;
  si está offline, se encola y se sube al reconectar.
- **Listener a nivel de módulo** (singleton por email) para que sobreviva al montaje/
  desmontaje de islas y a las View Transitions.

### Excluido (fuera de alcance de esta feature)
- Capa adicional de `localStorage` síncrono para el primer pintado en frío (posible mejora
  futura; ver §7).
- Resolución de conflictos custom (se usa la de Firestore: *last-write-wins* por documento).
- Cambios en el modelo de datos o en las reglas de seguridad de Firestore.

## 4. Comportamiento esperado

### 4.1 Navegación en sesión (View Transitions)
- Al hacer clic en enlaces internos (mapa ↔ unidad ↔ resumen) **no hay recarga completa**.
- El SDK de Firebase, la sesión y el store `$state` permanecen en memoria.
- Resultado: la pantalla destino aparece **sin estados de carga** porque el dato ya está.

### 4.2 Arranque en frío / recarga
1. Se carga el SDK y se resuelve la auth (costo inevitable, asíncrono).
2. El listener `onSnapshot` se suscribe al documento `students/<email>`.
3. **Primera emisión:** datos desde IndexedDB (`metadata.fromCache === true`) → se pinta
   el avance de inmediato, sin esperar la red.
4. **Segunda emisión:** datos del servidor → se actualiza `$state` si difieren.

### 4.3 Escritura de una respuesta
1. Actualización optimista de `$state` (ya implementada) → UI inmediata.
2. `setDoc` escribe en la caché de IndexedDB y encola la sincronización.
3. Indicador de guardado:
   - **Guardando…** mientras hay escrituras pendientes (`metadata.hasPendingWrites`).
   - **Guardado** cuando la escritura llega al servidor.
   - **Sin conexión — se sincronizará** si está offline (los datos NO se pierden; se suben
     al reconectar).

### 4.4 Multi-dispositivo / multi-pestaña
- Un cambio confirmado en el servidor desde otro dispositivo dispara una nueva emisión del
  `onSnapshot` y actualiza la pantalla automáticamente.
- Multi-pestaña en el mismo navegador comparte la caché (`persistentMultipleTabManager`).

## 5. Estados de carga (UX)

| Situación | Qué ve el usuario |
|-----------|-------------------|
| Navegación en sesión (View Transitions) | Transición fluida, sin "Cargando" |
| Recarga con caché disponible | Avance al instante (desde IndexedDB) |
| Recarga sin caché (primer ingreso del navegador) | "Cargando tu avance…" hasta la 1ª emisión |
| Auth aún resolviendo | "Cargando…" (bandera `authChecked`, ya implementada) |
| Sin red, con caché | Avance visible + indicador "Sin conexión — se sincronizará" |
| Sin red, sin caché | Mensaje de error con "Reintentar" |

## 6. Requisitos no funcionales

- Sin backend propio; acceso directo cliente→Firestore con reglas existentes.
- No degradar el modo desarrollo (`PUBLIC_AUTH_DISABLED=true`): debe seguir funcionando con
  `localStorage` y sin Firebase.
- No aumentar significativamente el bundle inicial (Firebase ya se importa de forma
  dinámica; mantener ese patrón).
- Accesibilidad y responsive sin cambios respecto al estado actual.

## 7. Mejora futura (no en esta feature)

Capa de **`localStorage` síncrona stale-while-revalidate** para que incluso el **primer
pintado en frío** (antes de cargar el SDK) sea instantáneo. IndexedDB no cubre ese instante
porque requiere el SDK cargado. Se documenta como evolución posible si el cold start sigue
sintiéndose lento.

## 8. Criterios de aceptación

1. Volver al mapa desde una unidad dentro de la sesión no produce recarga ni "Cargando".
2. Tras un F5, el avance aparece desde IndexedDB sin esperar la red (verificable cortando la
   red tras una carga previa).
3. Responder un ejercicio offline no pierde el dato: al reconectar, aparece en Firestore.
4. Editar el avance en otra pestaña/dispositivo se refleja sin recargar.
5. El modo desarrollo sin Firebase sigue funcionando igual.
6. Las reglas de seguridad de Firestore no cambian y siguen restringiendo cada documento a
   su dueño.
