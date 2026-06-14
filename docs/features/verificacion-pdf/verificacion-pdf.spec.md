# Feature spec — Verificación de informes PDF

**Estado:** implementado · **Fecha:** 2026-06-14
**Relacionado:** [spec.md](../../spec.md) §8/§10, [plan.md](../../plan.md) §4.6

---

## 1. Objetivo

Permitir que un **docente o funcionario** Duoc UC confirme que un informe PDF de Git Challenge
es **auténtico**: que el código de verificación impreso corresponde a un informe realmente
exportado por la cuenta del estudiante indicado.

## 2. Alcance

### Incluido
- Página **`/verificar`** restringida a personal docente/funcionario (`@profesor.duoc.cl`, `@duoc.cl`).
- Contraste del **código de verificación** del PDF contra los informes registrados de la cuenta.
- Registro en Firestore de cada informe exportado (historial), para verificar informes emitidos
  en distintos momentos del viaje.

### Excluido
- Acceso de estudiantes a la herramienta (solo lectura de su propio avance).
- Edición de datos desde la verificación (la página es de solo lectura).

## 3. Actores

| Actor | Capacidad |
|-------|-----------|
| Docente / funcionario (`@profesor.duoc.cl`, `@duoc.cl`) | Verificar el código de cualquier informe. |
| Estudiante (`@duocuc.cl`) | No accede a la verificación; solo ve y exporta su propio informe. |

## 4. Comportamiento

1. El docente entra a `/verificar` e inicia sesión con su cuenta institucional (Google).
2. Si la cuenta no es de personal, ve "acceso restringido".
3. Ingresa el **correo del estudiante** y el **código de verificación** (16 caracteres del pie del PDF).
4. La página busca en los informes registrados de esa cuenta y responde:
   - **✓ Verificado:** muestra nombre, correo, porcentaje de avance reportado y fecha de exportación.
   - **✗ No coincide:** el código no corresponde a ningún informe emitido por esa cuenta (PDF alterado o ajeno a la cuenta).
   - **✗ Sin registro:** no existe avance guardado para ese correo.

## 5. Datos

Al exportar un informe, se registra en `students/<email>`:

```jsonc
{
  // …avance del estudiante…
  "lastReport": { "hash": "sha256-hex", "at": "ISO-8601", "pct": 100 },
  "reports": [ { "hash": "…", "at": "…", "pct": 60 },
               { "hash": "…", "at": "…", "pct": 100 } ]
}
```

- `lastReport`: último informe exportado.
- `reports[]`: historial de informes (permite verificar PDFs emitidos en distintos momentos).
- El **código impreso** en el PDF son los primeros 16 caracteres de `hash`.

## 6. Seguridad y acceso

- **Reglas de Firestore:** el estudiante lee/escribe solo su documento; el personal
  docente/funcionario puede **leer** (no escribir) cualquier documento, para verificar.
- La página `/verificar` valida el dominio del correo del usuario autenticado antes de permitir
  el uso.

## 7. Criterios de aceptación

1. Un docente autenticado verifica un código válido y ve los datos del estudiante.
2. Un código alterado o inexistente devuelve "no coincide".
3. Un estudiante no puede usar la herramienta.
4. Se pueden verificar informes exportados en distintos momentos del viaje (historial).
