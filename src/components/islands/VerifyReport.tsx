import { useState } from 'preact/hooks';
import { signInWithGoogle } from '../../lib/auth';
import { isStaffEmail, STAFF_DOMAINS_LABEL } from '../../lib/domains';
import { fetchStudentReport, type ReportRecord } from '../../lib/storage';
import { useSessionState } from './useProgress';

type Result =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'ok'; name: string; email: string; report: ReportRecord }
  | { kind: 'mismatch'; email: string; count: number }
  | { kind: 'notfound'; email: string }
  | { kind: 'error'; message: string };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function VerifyReport() {
  const { user, checked } = useSessionState();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  if (!checked) return <p class="vr-loading">Cargando…</p>;

  if (!user) {
    return (
      <div class="vr-card card">
        <h2>Verificación de informes</h2>
        <p>Esta herramienta es solo para docentes y funcionarios Duoc UC ({STAFF_DOMAINS_LABEL}).</p>
        <button class="btn btn-primary" type="button" onClick={() => signInWithGoogle().catch(() => {})}>
          Continuar con Google
        </button>
      </div>
    );
  }

  if (!isStaffEmail(user.email)) {
    return (
      <div class="vr-card card">
        <h2>Acceso restringido</h2>
        <p>
          Tu cuenta ({user.email}) no es de docente/funcionario. La verificación de informes
          está disponible solo para {STAFF_DOMAINS_LABEL}.
        </p>
        <a href="/" class="btn btn-secondary">Volver al inicio</a>
      </div>
    );
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    const c = code.trim().toLowerCase();
    if (!mail || !c) return;
    setResult({ kind: 'searching' });
    try {
      const data = await fetchStudentReport(mail);
      if (!data) {
        setResult({ kind: 'notfound', email: mail });
        return;
      }
      const match = data.reports.find((r) => r.hash.slice(0, 16) === c);
      if (match) {
        setResult({ kind: 'ok', name: data.name, email: data.email, report: match });
      } else {
        setResult({ kind: 'mismatch', email: data.email, count: data.reports.length });
      }
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div class="vr-card card">
      <h2>Verificación de informes</h2>
      <p class="vr-sub">
        Ingresa el <strong>correo del estudiante</strong> y el <strong>código de verificación</strong>
        que aparece en el pie del PDF. Confirmaremos si ese código fue emitido por esa cuenta.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Correo del estudiante
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="estudiante@duocuc.cl"
            autocomplete="off"
            required
          />
        </label>
        <label>
          Código de verificación (16 caracteres)
          <input
            type="text"
            value={code}
            onInput={(e) => setCode((e.target as HTMLInputElement).value)}
            placeholder="ej.: a1b2c3d4e5f6a7b8"
            spellcheck={false}
            required
          />
        </label>
        <button class="btn btn-primary" type="submit" disabled={result.kind === 'searching'}>
          {result.kind === 'searching' ? 'Verificando…' : 'Verificar'}
        </button>
      </form>

      {result.kind === 'ok' && (
        <div class="vr-result vr-ok" role="status">
          <strong>✓ Informe verificado</strong>
          <dl>
            <dt>Estudiante</dt><dd>{result.name}</dd>
            <dt>Correo</dt><dd>{result.email}</dd>
            <dt>Avance reportado</dt><dd>{result.report.pct}%</dd>
            <dt>Fecha de exportación</dt><dd>{fmtDate(result.report.at)}</dd>
          </dl>
          <p class="vr-note">
            El código corresponde a un informe realmente exportado por esta cuenta.
          </p>
        </div>
      )}

      {result.kind === 'mismatch' && (
        <div class="vr-result vr-fail" role="alert">
          <strong>✗ Código no coincide</strong>
          <p>
            Para {result.email} {result.count > 0
              ? `existen ${result.count} informe(s) emitido(s), pero ninguno tiene ese código.`
              : 'no hay informes exportados.'} El PDF podría estar alterado o no corresponder a esta cuenta.
          </p>
        </div>
      )}

      {result.kind === 'notfound' && (
        <div class="vr-result vr-fail" role="alert">
          <strong>✗ Sin registro</strong>
          <p>No existe ningún avance guardado para {result.email}.</p>
        </div>
      )}

      {result.kind === 'error' && (
        <div class="vr-result vr-fail" role="alert">
          <strong>Error</strong>
          <p>No se pudo verificar: {result.message}</p>
        </div>
      )}

      <p class="vr-disclaimer">
        Esta verificación confirma que el código fue <em>emitido por la cuenta indicada</em> y que
        el informe corresponde a un PDF realmente exportado desde la plataforma.
      </p>

      <style>{`
        .vr-card { max-width: 560px; margin: 0 auto; }
        .vr-sub { color: var(--color-text-soft); }
        form { display: flex; flex-direction: column; gap: var(--sp-3); margin: var(--sp-4) 0; }
        label { display: flex; flex-direction: column; gap: 4px; font-weight: 700; }
        input {
          padding: 10px 12px; border: 2px solid var(--color-border);
          border-radius: var(--radius-md); font-size: var(--fs-base); font-family: var(--font-mono);
        }
        input:focus { border-color: var(--duoc-azul-escuela); outline: none; }
        .vr-result { margin-top: var(--sp-4); padding: var(--sp-4); border-radius: var(--radius-md); }
        .vr-ok { background: #e8f5e9; color: #2e7d32; }
        .vr-fail { background: #ffebee; color: var(--color-error); }
        .vr-result dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: var(--sp-3) 0 0; }
        .vr-result dt { font-weight: 700; }
        .vr-result dd { margin: 0; }
        .vr-note { margin-top: var(--sp-3); font-size: var(--fs-sm); }
        .vr-disclaimer { margin-top: var(--sp-4); font-size: var(--fs-xs); color: var(--color-text-soft); font-style: italic; }
        .vr-loading { text-align: center; color: var(--color-text-soft); }
      `}</style>
    </div>
  );
}
