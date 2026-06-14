import { useState } from 'preact/hooks';
import { signInWithGoogle, isAuthDisabled } from '../../lib/auth';
import { ALLOWED_DOMAINS_LABEL } from '../../lib/domains';

type Status = 'idle' | 'loading' | 'error';

export default function LoginCard() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setStatus('loading');
    try {
      await signInWithGoogle();
      // onAuthChange en el layout detecta el cambio y redirige
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg.includes('DOMINIO_INVALIDO')) {
        setError(`Solo se aceptan correos institucionales Duoc UC: ${ALLOWED_DOMAINS_LABEL}.`);
      } else if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setError(null); // el usuario cerró el popup, no es un error real
      } else if (msg.includes('PUBLIC_FIREBASE')) {
        setError('Configuración Firebase incompleta. Define las variables PUBLIC_FIREBASE_* en .env.');
      } else {
        setError('No fue posible iniciar sesión. Inténtalo nuevamente.');
      }
      setStatus('error');
    }
  }

  return (
    <div class="login-card card">
      <h2>Inicia tu viaje</h2>
      <p class="subtitle">
        Ingresa con tu cuenta institucional Duoc UC ({ALLOWED_DOMAINS_LABEL}). Tu avance se
        guarda en tu cuenta y te sigue en cualquier dispositivo.
      </p>

      {isAuthDisabled() && (
        <div class="dev-note">
          <strong>Modo desarrollo:</strong> el ingreso es inmediato, sin Google real.
        </div>
      )}

      {error && (
        <div class="error" role="alert">{error}</div>
      )}

      <button
        class="btn-google"
        onClick={handleGoogle}
        disabled={status === 'loading'}
        type="button"
      >
        <GoogleIcon />
        {status === 'loading' ? 'Conectando…' : isAuthDisabled() ? 'Entrar (modo dev)' : 'Continuar con Google'}
      </button>

      <p class="hint">
        Selecciona tu cuenta <strong>@duocuc.cl</strong> en el popup de Google.
      </p>

      <style>{`
        .login-card {
          max-width: 440px;
          margin: var(--sp-6) auto;
          text-align: center;
        }
        .login-card h2 { margin-top: 0; }
        .subtitle {
          color: var(--color-text-soft);
          margin-bottom: var(--sp-5);
        }
        .btn-google {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          background: #fff;
          color: #3c4043;
          font-size: var(--fs-base);
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          justify-content: center;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .btn-google:hover:not(:disabled) {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border-color: #aaa;
        }
        .btn-google:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error {
          background: #ffebee;
          color: var(--color-error);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: var(--sp-3);
          font-size: var(--fs-sm);
          text-align: left;
        }
        .dev-note {
          background: #fff7e8;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: var(--sp-4);
          font-size: var(--fs-sm);
          border-left: 4px solid var(--duoc-amarillo);
          text-align: left;
        }
        .hint {
          margin-top: var(--sp-3);
          font-size: var(--fs-sm);
          color: var(--color-text-soft);
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}
