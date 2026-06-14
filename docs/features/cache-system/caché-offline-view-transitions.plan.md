# Feature plan — Caché offline (IndexedDB/Firestore) + View Transitions

**Referencia:** [caché-offline-view-transitions.spec.md](caché-offline-view-transitions.spec.md)
**Stack afectado:** Astro `^6.4`, Preact islands, `firebase/firestore`, nanostores.

---

## 1. Decisiones técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Sincronización offline | **`persistentLocalCache` de Firestore** (IndexedDB) | El SDK ya gestiona caché, cola de escrituras offline y sync en segundo plano; no se reimplementa a mano. Reemplaza al deprecado `enableIndexedDbPersistence`. |
| Multi-pestaña | `persistentMultipleTabManager()` | Comparte la caché entre pestañas del mismo navegador sin conflictos. |
| Lectura | **`onSnapshot` con `includeMetadataChanges`** | Entrega caché → servidor y se queda escuchando cambios (sync en vivo multi-dispositivo). |
| Escritura | `setDoc` **no bloqueante** (optimista) | La UI ya refleja el cambio; la cola de Firestore sincroniza en segundo plano. |
| Navegación | **Astro View Transitions** (`<ClientRouter />`) | Elimina la recarga completa; SDK, sesión, listener y `$state` sobreviven entre páginas. |
| Ciclo de vida del listener | **Singleton de módulo keyed por email** | Sobrevive al montaje/desmontaje de islas y a las transiciones; una sola suscripción por usuario. |

## 2. Archivos afectados

```
src/lib/firebase.ts        # NUEVO (opcional): init único de app + auth + firestore con caché
src/lib/auth.ts            # usar la init compartida; sin cambios de API pública
src/lib/storage.ts         # init Firestore con persistentLocalCache; helpers de suscripción
src/lib/progress.ts        # subscribeProgress() con onSnapshot; init pasa de "leer una vez" a "suscribir"
src/components/islands/useProgress.ts  # consumir la suscripción; ready según primera emisión
src/components/islands/SaveStatus.tsx  # estado "sin conexión / pendiente de sync"
src/layouts/BaseLayout.astro           # <ClientRouter /> para View Transitions
docs/features/…            # este spec + plan
```

## 3. Fases

### Fase 1 — Caché persistente en IndexedDB (sin cambiar el modelo de lectura)
- [ ] Centralizar la inicialización de Firebase (app + auth + firestore) en un módulo único
      para evitar doble `initializeApp` entre `auth.ts` y `storage.ts`.
- [ ] Inicializar Firestore con
      `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`.
- [ ] Verificar que las lecturas actuales (`getDoc`) ahora resuelvan desde IndexedDB cuando
      hay caché (sin tocar aún la UI).
- **Hito:** tras un F5 con red cortada, `getDoc` devuelve el último avance cacheado.

### Fase 2 — Lectura reactiva con `onSnapshot`
- [ ] Añadir `subscribeProgress(email, cb)` en `storage.ts` que envuelva `onSnapshot`
      (con `includeMetadataChanges: true`) y exponga `{ data, fromCache, hasPendingWrites }`.
- [ ] En `progress.ts`, reemplazar la lectura puntual de `initProgressForUser` por una
      **suscripción de módulo** keyed por email: alimenta `$state`, aplica `reconcileCompletion`
      y persiste solo si hubo cambios.
- [ ] `useProgress.ts`: `ready` pasa a `true` en la **primera emisión** (caché o servidor),
      no al resolver una promesa.
- [ ] Manejar cierre de la suscripción al cambiar de usuario / logout.
- **Hito:** el avance se pinta desde caché al instante y se actualiza solo al llegar el
      servidor; un cambio en otra pestaña se refleja sin recargar.

### Fase 3 — Escrituras y estado de sincronización
- [ ] Confirmar que `setDoc` no se await-ea de forma bloqueante (mantener optimismo actual).
- [ ] `SaveStatus`: derivar el estado desde `hasPendingWrites` / conexión:
      **Guardando… / Guardado / Sin conexión — se sincronizará**.
- [ ] Probar escritura offline → reconexión → aparece en Firestore.
- **Hito:** responder offline no pierde datos; el indicador refleja el estado real.

### Fase 4 — View Transitions
- [ ] Agregar `<ClientRouter />` en `BaseLayout.astro`.
- [ ] Verificar que los islands del header (`HeaderProgress`, `SaveStatus`, `UserMenu`) y el
      listener de progreso **no se reinicialicen** en cada navegación (singleton de módulo).
- [ ] Revisar `client:load` vs `transition:persist` donde aplique para conservar estado.
- [ ] Probar navegación mapa ↔ unidad ↔ resumen sin recarga ni "Cargando".
- **Hito:** navegación en sesión instantánea, sin parpadeos.

### Fase 5 — QA y modo desarrollo
- [ ] Validar que `PUBLIC_AUTH_DISABLED=true` (sin Firebase) siga funcionando con `localStorage`.
- [ ] Revisar los 6 criterios de aceptación del spec (§8).
- [ ] Probar en Chrome/Edge/Firefox; multi-pestaña; con y sin red.
- **Hito:** criterios de aceptación cumplidos.

## 4. Detalles de implementación clave

### 4.1 Init Firestore con caché persistente
```ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const app = getApps().length ? getApp() : initializeApp(config);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```
> `initializeFirestore` debe llamarse **antes** de cualquier `getFirestore(app)`.

### 4.2 Suscripción reactiva
```ts
import { doc, onSnapshot } from 'firebase/firestore';

export function subscribeProgress(email, cb) {
  const ref = doc(db, 'students', email.toLowerCase());
  return onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
    cb({
      data: snap.exists() ? (snap.data()) : null,
      fromCache: snap.metadata.fromCache,
      hasPendingWrites: snap.metadata.hasPendingWrites,
    });
  });
}
```

### 4.3 Listener singleton por email (progress.ts)
```ts
let _unsub = null;
let _email = null;

export function startProgressSync(user, units) {
  if (_email === user.email && _unsub) return;     // ya suscrito
  _unsub?.();                                       // cierra anterior
  _email = user.email;
  _unsub = subscribeProgress(user.email, ({ data }) => {
    const st = data ?? emptyState(user);
    reconcileCompletion(st, units);
    $state.set(st);
  });
}

export function stopProgressSync() { _unsub?.(); _unsub = null; _email = null; $state.set(null); }
```

## 5. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Listener se duplica o se pierde con View Transitions | Fugas o datos desactualizados | Singleton de módulo keyed por email; cerrar en logout/cambio de usuario. |
| `persistentLocalCache` falla en navegadores sin IndexedDB / modo incógnito restringido | Sin caché offline | Firestore degrada a memoria; capturar y continuar sin romper. |
| Islas se reinicializan en cada transición | Reaparece el "Cargando" | Estado vive en stores/módulos, no en estado local de isla; usar `transition:persist` donde aplique. |
| Cold start sigue lento (SDK + auth) | Primer pintado no instantáneo | Aceptado en esta feature; mejora futura con `localStorage` síncrono (spec §7). |
| Escritura offline genera expectativa de "guardado" | Confusión | Indicador explícito "Sin conexión — se sincronizará". |
| Doble `initializeApp` entre auth y storage | Error de init / caché no aplicada | Centralizar init en módulo único (Fase 1). |

## 6. Estimación

| Fase | Esfuerzo aprox. |
|------|-----------------|
| 1 — Caché IndexedDB | 0.5 día |
| 2 — onSnapshot reactivo | 1 día |
| 3 — Escrituras + estado sync | 0.5 día |
| 4 — View Transitions | 0.5–1 día (depende de ajustes de islas) |
| 5 — QA | 0.5 día |
| **Total** | **~3 días** |

## 7. Rollback

- View Transitions y caché son independientes: si una causa problemas, se revierte sin
  afectar la otra.
- Quitar `<ClientRouter />` restaura el MPA clásico.
- Volver de `onSnapshot` a `getDoc` deja la lectura puntual previa; la caché IndexedDB puede
  permanecer activa sin daño.
