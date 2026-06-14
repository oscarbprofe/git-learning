import { useState } from 'preact/hooks';
import { sendLoginLink, completeLoginIfLink, isAuthDisabled } from '../../lib/auth';
import { ALLOWED_DOMAINS_LABEL, isInstitutionalEmail } from '../../lib/domains';
import { useEffect } from 'preact/hooks';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function LoginCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    completeLoginIfLink().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión.';
      setError(
        msg.includes('DOMINIO_INVALIDO')
          ? `Tu correo no pertenece a un dominio institucional Duoc UC (${ALLOWED_DOMAINS_LABEL}).`
          : 'No pudimos completar el inicio de sesión. Vuelve a solicitar el enlace.',
      );
      setStatus('error');
    });
  }, []);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (!isInstitutionalEmail(email)) {
      setError(
        `Usa tu correo institucional Duoc UC: ${ALLOWED_DOMAINS_LABEL}.`,
      );
      return;
    }
    setStatus('sending');
    try {
      await sendLoginLink(name, email);
      setStatus('sent');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg.startsWith('DOMINIO_INVALIDO')) {
        setError(`Tu correo no es institucional Duoc UC. Permitidos: ${ALLOWED_DOMAINS_LABEL}.`);
      } else if (msg.includes('PUBLIC_FIREBASE')) {
        setError(
          'Configuración Firebase incompleta. Define las variables PUBLIC_FIREBASE_* en .env o activa PUBLIC_AUTH_DISABLED=true.',
        );
      } else {
        setError('No fue posible enviar el enlace. Inténtalo nuevamente.');
      }
      setStatus('error');
    }
  }

  return (
    <div class="login-card card">
      <h2>Inicia tu viaje</h2>
      <p class="subtitle">
        Identifícate con tu correo institucional Duoc UC. Te enviaremos un enlace de acceso a
        tu buzón.
      </p>

      {status === 'sent' ? (
        <div class="sent">
          <p>
            <strong>¡Enlace enviado!</strong> Abre tu correo institucional ({email}) y haz clic
            en el enlace de acceso <strong>desde este mismo navegador</strong>.
          </p>
          <p class="hint">
            Si no aparece en 1–2 minutos, revisa la carpeta de <em>spam</em> o
            <em> cuarentena</em>.
          </p>
          <button type="button" class="btn btn-secondary" onClick={() => setStatus('idle')}>
            Reenviar a otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} novalidate>
          <label>
            Nombre completo
            <input
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="Ej.: María González Pérez"
              autocomplete="name"
              required
            />
          </label>
          <label>
            Correo institucional
            <input
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="tunombre@duocuc.cl"
              autocomplete="email"
              required
            />
            <small>Aceptamos: {ALLOWED_DOMAINS_LABEL}.</small>
          </label>

          {error && (
            <div class="error" role="alert">
              {error}
            </div>
          )}

          {isAuthDisabled() && (
            <div class="dev-note">
              <strong>Modo desarrollo activo:</strong> el ingreso es inmediato (no se envía
              correo real).
            </div>
          )}

          <button type="submit" class="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending'
              ? 'Enviando…'
              : isAuthDisabled()
                ? 'Entrar (modo dev)'
                : 'Enviarme el enlace'}
          </button>
        </form>
      )}

      <style>{`
        .login-card {
          max-width: 480px;
          margin: var(--sp-6) auto;
        }
        .login-card h2 {
          margin-top: 0;
        }
        .subtitle {
          color: var(--color-text-soft);
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: var(--sp-4);
          font-weight: 700;
          color: var(--color-text);
        }
        label small {
          font-weight: 400;
          color: var(--color-text-soft);
          font-size: var(--fs-xs);
        }
        input {
          padding: 10px 12px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: var(--fs-base);
        }
        input:focus {
          border-color: var(--duoc-azul-escuela);
          outline: none;
        }
        .error {
          background: #ffebee;
          color: var(--color-error);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: var(--sp-3);
          font-size: var(--fs-sm);
        }
        .dev-note {
          background: #fff7e8;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: var(--sp-3);
          font-size: var(--fs-sm);
          border-left: 4px solid var(--duoc-amarillo);
        }
        .sent p { margin-bottom: var(--sp-3); }
        .sent .hint { color: var(--color-text-soft); font-size: var(--fs-sm); }
      `}</style>
    </div>
  );
}
