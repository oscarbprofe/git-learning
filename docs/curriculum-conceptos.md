# Currículum: conceptos por unidad y auditoría pedagógica

Este documento inventaria **todo concepto, comando de Git y comando de terminal (CLI)** que
aparece en cada unidad, y registra dónde se **introduce/explica** cada uno. Sirve para
garantizar la regla pedagógica central del curso:

> **Ningún concepto, comando de Git o de CLI debe usarse, referenciarse o evaluarse antes
> de haber sido explicado.**

Al final está la **auditoría** con los desfases detectados y su resolución.

---

## Inventario por unidad

### Unidad 1 — ¿Qué es el control de versiones?
- **Conceptos:** control de versiones; centralizado vs distribuido; historia del proyecto; autor de un cambio.
- **Git:** `git --version`, `git config --global user.name`, `git config --global user.email`, flags `--global` / `--local`, `git config --list`, `git help`, `git help <cmd>`, `git <cmd> --help`, `git config -h`.
- **CLI / entorno:** terminal, Git Bash, `cd`. *(Primer uso de comandos de terminal del curso → ver callout "Comandos de terminal que usaremos".)*
- **Diferido (mencionado, se explica después):** —

### Unidad 2 — Mi primer repositorio
- **Conceptos:** las tres áreas (working directory, staging area, repositorio `.git`); qué es un commit (instantánea + mensaje + autor/fecha + hash); etimología de "commit"; commit ≠ guardar archivo; mensajes de commit.
- **Git:** `git init`, `git status` (estado *untracked*), `git add` (archivo, `.`, `-A`), `git commit -m`, flag `-m`, `git log`, hash de commit.
- **CLI / entorno:** `echo`, redirección `>`, `mkdir`, encadenado `&&`.
- **Diferido:** `main` (ramas → U5).

### Unidad 3 — Explorando la historia
- **Conceptos:** **HEAD** (puntero al commit actual) y atajos `HEAD~1`, `HEAD~2`; diferencia "qué hubo" (log) vs "qué cambió" (diff); archivos a ignorar.
- **Git:** `git log --oneline`, `git log -n`, `--author`, `--since`, `git log --oneline --graph --all`, `git diff`, `git diff --staged`, `git diff <a> <b>`, `git show <hash>`, `.gitignore` (patrones), `git rm --cached`, `git commit --amend`.
- **Diferido:** servidor remoto / compartir historia (→ U6).

### Unidad 4 — Deshacer cambios
- **Conceptos:** cuatro formas de deshacer y cuándo usar cada una; reescribir historia vs agregar commit inverso; reset soft/mixed/hard.
- **Git:** `git restore`, `git restore --staged`, `git reset` (`--soft`/`--mixed`/`--hard`), `git revert <hash>`, `git stash`, `git stash list`, `git stash pop`, `git stash apply`.
- **Reutiliza:** HEAD y `HEAD~N` (U3).
- **Diferido:** peligro de reescribir historia compartida (→ U6).

### Unidad 5 — Ramas (branches)
- **Conceptos:** qué es una rama (puntero a un commit); línea de desarrollo paralela; fast-forward vs three-way merge; commit de merge (dos padres); conflictos y marcadores `<<<<<<< ======= >>>>>>>`.
- **Git:** `git branch` (listar), `git branch <nombre>`, `git switch`, `git switch -c`, `git checkout`, `git checkout -b`, `git merge`, resolución de conflicto (`git add` + `git commit`), `git branch -d`, `git branch -D`.

### Unidad 6 — Repositorios remotos
- **Conceptos:** repositorio remoto; GitHub; local + remoto; alias `origin`; tracking branches; autenticación moderna.
- **Git:** `git clone`, `git remote add`, `git remote -v`, `git push`, `git push -u origin <rama>`, `git push --force` (advertencia), `git pull`, `git pull origin <rama>`, `git fetch`, `git log origin/main`, `git branch -vv`, **`git branch -r`** (listar ramas remotas).
- **CLI / herramientas:** PAT, SSH (`ssh-keygen`), GitHub CLI (`gh auth login`).

### Unidad 7 — Colaboración en equipo
- **Conceptos:** fork; Pull Request; code review; GitHub Flow; issues; `Closes #N`; README.md.
- **Git:** reutiliza `git switch -c`, `git push -u`, `git pull origin <rama>`, `git branch -r` (todos de U5/U6).

### Unidad 8 — Buenas prácticas y nivel pro
- **Conceptos:** historia lineal; regla de oro del rebase; tags y releases; Conventional Commits; cherry-pick; alias.
- **Git:** `git rebase <rama>`, `git rebase -i HEAD~N` (pick/squash/reword/drop), `git tag`, `git tag -a -m`, `git push origin <tag>`, `git push --tags`, `git cherry-pick <hash>`, `git config --global alias.<x>`.

---

## Conceptos transversales: primera aparición vs primera explicación

| Concepto | Primera vez que aparece | Dónde se explica |
|----------|-------------------------|------------------|
| `main` / rama | U2 (`On branch main`) | U2 lo señala como diferido; se explica en U5 |
| **HEAD** | U2/U3 (salida de `git log`) | **U3** (callout dedicado) |
| commit (concepto) | U1 (autor de un cambio) | U2 (sección dedicada) |
| remoto / `origin/main` | U3/U4 (mención de "compartir") | U6 |
| `cd`, `mkdir`, `echo`, `>` | U1/U2 (ejemplos) | U1 (callout "comandos de terminal") |

---

## Auditoría de desfases (concepto usado antes de explicarse)

| # | Hallazgo | Severidad | Estado |
|---|----------|-----------|--------|
| 1 | `HEAD` se mostraba en la salida de `git log` (U2/U3) pero se definía recién en U4. | Alta | ✅ Resuelto: callout "¿Qué es HEAD?" en U3, y U4 ahora solo lo referencia. |
| 2 | `git branch -r` se **evaluaba** en el ejercicio `u7-e4` pero no se enseñaba en ninguna unidad. | Alta | ✅ Resuelto: se agregó `git branch -r` a la sección "Tracking branches" de U6. |
| 3 | Comandos de terminal (`cd`, `mkdir`, `echo`, `>`, `&&`) usados en ejemplos de U1/U2 sin explicación previa. | Media | ✅ Resuelto: callout "Comandos de terminal que usaremos" en U1. |
| 4 | `git pull origin <rama>` evaluado en `u7-e3`; U6 solo mostraba `git pull` a secas. | Baja | ✅ Resuelto: U6 incluye la forma explícita `git pull origin <rama>`. |
| 5 | Aceptación tolerante de `git checkout -- <archivo>` (`u4-e1`) y `git reset HEAD <archivo>` (`u4-e2`), formas no enseñadas aún. | Baja | Aceptado como **tolerancia opcional**: el comando pedido y la pista usan la forma enseñada (`restore`/`restore --staged`); estas variantes solo suman si el estudiante ya las conoce. No se exige ni se sugiere lo no enseñado. |
| 6 | Términos mencionados al pasar como distractores o paréntesis: `git merge --abort` (distractor en `u5-q3`), CI, WIP, `--force-with-lease`. | Informativa | Aceptado: aparecen como opción incorrecta o aclaración entre paréntesis, no requieren conocimiento previo para responder. |
| 7 | "feature" y "bugfix" usados desde U5 (definición de rama y nombres `feature/login`) sin glosa, asumiendo el anglicismo conocido. | Media | ✅ Resuelto: callout "Vocabulario: feature y bugfix" en U5, con la convención de nombres de rama. |

> **Bug de contenido corregido de paso:** en `u6-e4` el escenario tenía `pushea**ron**`
> (asteriscos de Markdown que se renderizaban como texto plano); se corrigió la redacción.

---

## Cómo mantener esta garantía al editar contenido

1. Al introducir un comando o concepto en una unidad, agrégalo al inventario de arriba.
2. Antes de **usarlo en un ejemplo, ejercicio o quiz**, confirma que su unidad de
   introducción sea **anterior o igual** a la unidad donde se usa.
3. Si necesitas mencionar algo que se enseña después, márcalo explícitamente como diferido
   (como se hace con `main` y "remoto") en lugar de asumir que el estudiante ya lo conoce.
4. Las respuestas aceptadas (`accept`) de un ejercicio no deberían **exigir** comandos no
   enseñados; como tolerancia opcional están permitidas, pero la pista (`hint`) y el
   `expectedHint` deben usar siempre la forma ya enseñada.
