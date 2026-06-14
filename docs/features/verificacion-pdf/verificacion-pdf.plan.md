# Feature plan — Verificación de informes PDF

**Referencia:** [verificacion-pdf.spec.md](verificacion-pdf.spec.md)

---

## 1. Decisiones

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Acceso | Solo personal docente/funcionario (`@profesor.duoc.cl`, `@duoc.cl`) | No exponer datos de estudiantes; el docente se autentica con Google. |
| Sin backend | Verificación 100 % cliente + Firestore | Aprovecha el avance ya guardado; sin Cloud Functions ni costo. |
| Datos de verificación | Historial `reports[]` en `students/<email>` | Permite verificar cualquier PDF emitido, no solo el último. |
| Lectura por personal | Reglas de Firestore (`isStaff()` puede leer) | Control de acceso por dominio de correo, sin servidor propio. |

## 2. Implementado

- [x] `domains.ts`: `isStaffEmail()`, `STAFF_DOMAINS`, `STAFF_DOMAINS_LABEL`.
- [x] `storage.ts`:
  - Tipo `ReportRecord` (`hash`, `at`, `pct`); campos `lastReport` y `reports[]` en `ProgressState`.
  - `recordReport(email, record)`: guarda el último informe y lo agrega al historial (`arrayUnion`).
  - `fetchStudentReport(email)`: lee los informes de un estudiante para la verificación.
- [x] `SummaryView.tsx`: al exportar el PDF, llama a `recordReport()` con `{ hash, at, pct }`.
- [x] `components/islands/VerifyReport.tsx`: isla con gate de personal, formulario (correo + código)
      y resultado (verificado / no coincide / sin registro).
- [x] `pages/verificar.astro`: página `/verificar`.
- [x] `Footer.astro`: enlace "Verificar informe (docentes)".
- [x] Reglas de Firestore: lectura para personal docente, escritura solo del dueño.

## 3. Archivos

```
src/lib/domains.ts                      # isStaffEmail + dominios de personal
src/lib/storage.ts                      # ReportRecord, recordReport, fetchStudentReport
src/components/islands/SummaryView.tsx  # registra el informe al exportar
src/components/islands/VerifyReport.tsx # UI de verificación (gate a personal)
src/pages/verificar.astro               # página /verificar
src/components/astro/Footer.astro       # enlace a la verificación
```

## 4. Reglas de Firestore (aplicar en consola)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isVerified() { return request.auth != null && request.auth.token.email_verified == true; }
    function isOwner(email) { return isVerified() && request.auth.token.email == email; }
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

## 5. Pruebas

- [ ] Docente (`@profesor.duoc.cl`) verifica un código válido → datos correctos.
- [ ] Código alterado o inexistente → "no coincide".
- [ ] Estudiante (`@duocuc.cl`) entra a `/verificar` → "acceso restringido".
- [ ] Verificar un informe exportado en un punto anterior del viaje (historial).
- [ ] Lectura cruzada de un estudiante sobre otro documento → denegada por reglas.
