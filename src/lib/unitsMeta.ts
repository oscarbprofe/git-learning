/** Metadatos estáticos de las 8 unidades del viaje.
 * Replicado en cliente y servidor; debe coincidir exactamente con los archivos
 * de content/units/ y content/activities/.
 */

import type { UnitMeta } from './progress';

export const UNITS_META: UnitMeta[] = [
  {
    slug: 'u1',
    order: 1,
    title: '¿Qué es el control de versiones?',
    description:
      'El problema que resuelve Git, instalación, configuración inicial y dónde encontrar ayuda.',
    points: 10,
    exerciseCount: 3,
    quizCount: 5,
  },
  {
    slug: 'u2',
    order: 2,
    title: 'Mi primer repositorio',
    description: 'init, working directory, staging area, repositorio, status, add, commit, log.',
    points: 12,
    exerciseCount: 4,
    quizCount: 5,
  },
  {
    slug: 'u3',
    order: 3,
    title: 'Explorando la historia',
    description: 'log con filtros, diff, show, .gitignore, amend.',
    points: 12,
    exerciseCount: 4,
    quizCount: 5,
  },
  {
    slug: 'u4',
    order: 4,
    title: 'Deshacer cambios',
    description: 'restore, reset (soft/mixed/hard), revert, stash. Cuándo usar cada uno.',
    points: 14,
    exerciseCount: 4,
    quizCount: 6,
  },
  {
    slug: 'u5',
    order: 5,
    title: 'Ramas (branches)',
    description: 'branch, switch/checkout, merge fast-forward vs three-way, resolución de conflictos.',
    points: 14,
    exerciseCount: 4,
    quizCount: 6,
  },
  {
    slug: 'u6',
    order: 6,
    title: 'Repositorios remotos',
    description: 'GitHub, clone, remote, push, pull, fetch, tracking branches, autenticación.',
    points: 13,
    exerciseCount: 4,
    quizCount: 5,
  },
  {
    slug: 'u7',
    order: 7,
    title: 'Colaboración en equipo',
    description: 'Fork, Pull Request, code review, GitHub Flow, issues, README.',
    points: 13,
    exerciseCount: 4,
    quizCount: 5,
  },
  {
    slug: 'u8',
    order: 8,
    title: 'Buenas prácticas y nivel pro',
    description: 'rebase, tags, Conventional Commits, cherry-pick, alias, flujo profesional.',
    points: 12,
    exerciseCount: 4,
    quizCount: 5,
  },
];

export const TOTAL_POINTS = UNITS_META.reduce((sum, u) => sum + u.points, 0);
// Verificación en tiempo de carga: el total debe ser exactamente 100.
if (TOTAL_POINTS !== 100) {
  // eslint-disable-next-line no-console
  console.warn(`[git-challenge] Puntaje total no suma 100: ${TOTAL_POINTS}`);
}
