import { useEffect, useState } from 'preact/hooks';
import { onAuthChange, signOut, type SessionUser } from '../../lib/auth';

export default function UserMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div class="user-menu">
      <button
        type="button"
        class="user-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span class="avatar" aria-hidden="true">{initials}</span>
        <span class="name">{user.name}</span>
      </button>
      {open && (
        <div class="dropdown" role="menu">
          <div class="email">{user.email}</div>
          <a href="/resumen" role="menuitem">Ver resumen e informe</a>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              if (confirm('¿Cerrar sesión? Tu avance queda guardado en tu cuenta.')) {
                await signOut();
                setOpen(false);
                window.location.href = '/';
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
      <style>{`
        .user-menu { position: relative; }
        .user-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px 6px 6px; border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: var(--duoc-blanco);
          font-weight: 700;
          transition: background .15s ease, border-color .15s ease;
        }
        .user-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: var(--duoc-amarillo);
        }
        .avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--duoc-amarillo); color: var(--duoc-negro);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 900;
        }
        .name { font-size: 0.9rem; }
        .dropdown {
          position: absolute; right: 0; top: calc(100% + 8px);
          background: white; border: 1px solid var(--color-border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-md);
          min-width: 240px; padding: 8px; z-index: 100;
          display: flex; flex-direction: column;
        }
        .dropdown .email {
          font-size: 0.8rem; color: var(--color-text-soft);
          padding: 8px 10px; border-bottom: 1px solid var(--color-border);
          margin-bottom: 4px;
        }
        .dropdown a, .dropdown button {
          background: none; border: none; text-align: left;
          padding: 8px 10px; border-radius: var(--radius-sm);
          color: var(--color-text); text-decoration: none;
          font: inherit; cursor: pointer;
        }
        .dropdown a:hover, .dropdown button:hover { background: var(--duoc-gris-fondo); }
        @media (max-width: 640px) {
          .name { display: none; }
        }
      `}</style>
    </div>
  );
}
