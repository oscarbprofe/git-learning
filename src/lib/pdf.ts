/** Generación de informe PDF (jsPDF + autotable) — totalmente cliente.
 * Refleja el avance al momento de exportar (parcial o final).
 */

import type { ProgressState } from './storage';
import type { UnitMeta, UnitSummary } from './progress';
import { pctToNota } from './scoring';

export interface ActivityCatalog {
  exercises: Record<string, { id: string; unit: string; prompt: string; value: number }>;
  quiz: Record<
    string,
    {
      id: string;
      unit: string;
      prompt: string;
      value: number;
      options: { key: string; label: string }[];
      correct: string;
    }
  >;
}

function fileSafe(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function todayStamp(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export async function exportReport(opts: {
  state: ProgressState;
  metas: UnitMeta[];
  summaries: UnitSummary[];
  catalog: ActivityCatalog;
  totalScore: number;
  totalMax: number;
  integrityHash?: string;
}): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void })
    .default;

  const { state, metas, summaries, catalog, totalScore, totalMax } = opts;
  const completed = Boolean(state.completedAt);
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const nota = pctToNota(pct);
  const completedUnits = summaries.filter((s) => s.status === 'completed').length;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 48;

  /* ---------- ENCABEZADO + BANNER ---------- */
  const writeHeader = () => {
    // Marca Duoc UC (texto, jamás redibujado)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 26);
    doc.text('Duoc UC', MARGIN, MARGIN);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text('Escuela de Informática y Telecomunicaciones', MARGIN, MARGIN + 14);

    if (!completed) {
      // Banner amarillo de informe parcial
      doc.setFillColor(241, 182, 52);
      doc.rect(MARGIN, MARGIN + 26, PAGE_W - MARGIN * 2, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(26, 26, 26);
      doc.text(
        `INFORME PARCIAL · Avance: ${pct}% · Unidades completadas: ${completedUnits}/${metas.length}`,
        MARGIN + 10,
        MARGIN + 41,
      );
    }
  };

  const writeFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(102, 102, 102);
      const verif = (opts.integrityHash ?? '').slice(0, 16);
      doc.text(`duoc.cl · Verificación: ${verif || 'sin-firma'}`, MARGIN, pageH - 24);
      doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, pageH - 24, { align: 'right' });
    }
  };

  writeHeader();
  let y = MARGIN + (completed ? 26 : 62);

  /* ---------- TÍTULO ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('Informe de Viaje de Aprendizaje Git', MARGIN, y);
  y += 24;

  /* ---------- DATOS ESTUDIANTE ---------- */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  const lines = [
    `Estudiante: ${state.student.name}`,
    `Correo: ${state.student.email}`,
    `Fecha de inicio: ${fmtDate(state.startedAt)}`,
    `Fecha de término: ${state.completedAt ? fmtDate(state.completedAt) : 'en curso'}`,
    `Fecha de emisión: ${fmtDate(new Date().toISOString())}`,
    `Estado: ${completed ? 'Viaje completo' : 'En curso'} · Avance ${pct}% · ${completedUnits} de ${metas.length} unidades completadas`,
  ];
  for (const l of lines) {
    doc.text(l, MARGIN, y);
    y += 16;
  }
  y += 8;

  /* ---------- RECUADRO DE NOTA ---------- */
  doc.setDrawColor(241, 182, 52);
  doc.setLineWidth(2);
  doc.setFillColor(255, 252, 240);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 64, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.text(completed ? 'NOTA FINAL' : 'NOTA PROVISORIA', MARGIN + 16, y + 22);

  doc.setFontSize(28);
  doc.text(nota.toFixed(1), MARGIN + 16, y + 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(
    `Puntaje obtenido: ${totalScore.toFixed(1)} / ${totalMax} (${pct}%)`,
    MARGIN + 140,
    y + 30,
  );
  doc.text(
    'Exigencia 60% — nota 4.0 con 60 puntos. Ítems no respondidos puntúan 0.',
    MARGIN + 140,
    y + 48,
  );
  y += 82;

  /* ---------- TABLA RESUMEN ---------- */
  const statusLabel = (s: UnitSummary['status']): string => {
    if (s === 'completed') return 'Completada';
    if (s === 'in-progress') return 'En curso';
    if (s === 'locked') return 'Bloqueada';
    return 'No iniciada';
  };

  autoTable(doc, {
    startY: y,
    head: [['#', 'Unidad', 'Estado', 'Puntaje', 'Máx.', '%']],
    body: summaries.map((s) => [
      String(s.meta.order),
      s.meta.title,
      statusLabel(s.status),
      s.score.toFixed(1),
      String(s.maxScore),
      `${s.percent}%`,
    ]),
    foot: [['', 'TOTAL', '', totalScore.toFixed(1), String(totalMax), `${pct}%`]],
    margin: { left: MARGIN, right: MARGIN },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [26, 26, 26], textColor: 255 },
    footStyles: { fillColor: [241, 182, 52], textColor: 26, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 244, 244] },
  });

  /* ---------- DETALLE POR UNIDAD ---------- */
  for (const s of summaries) {
    if (!s.unit) continue;
    if (s.status === 'locked' || s.status === 'not-started') continue;

    doc.addPage();
    writeHeader();
    let yy = MARGIN + (completed ? 26 : 62);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Unidad ${s.meta.order} — ${s.meta.title}`, MARGIN, yy);
    yy += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(
      `Estado: ${statusLabel(s.status)} · Puntaje: ${s.score.toFixed(1)}/${s.maxScore} (${s.percent}%)`,
      MARGIN,
      yy,
    );
    yy += 18;

    /* Ejercicios */
    const exRows: string[][] = [];
    for (const ex of Object.values(catalog.exercises).filter((e) => e.unit === s.meta.slug)) {
      const res = s.unit.exercises[ex.id];
      if (res) {
        exRows.push([
          truncate(ex.prompt, 70),
          truncate(res.answer || '(vacío)', 50),
          String(res.attempts),
          res.correct ? 'Sí' : 'No',
          `${res.score.toFixed(1)}/${ex.value}`,
        ]);
      } else {
        exRows.push([truncate(ex.prompt, 70), 'sin responder', '0', '—', `0/${ex.value}`]);
      }
    }
    if (exRows.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text('Ejercicios', MARGIN, yy);
      yy += 6;
      autoTable(doc, {
        startY: yy,
        head: [['Enunciado', 'Respuesta', 'Intentos', 'Correcto', 'Puntaje']],
        body: exRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
        headStyles: { fillColor: [78, 124, 221], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 200 },
          1: { cellWidth: 160 },
          2: { halign: 'center', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 55 },
          4: { halign: 'right', cellWidth: 55 },
        },
      });
      const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      yy = (last?.finalY ?? yy) + 14;
    }

    /* Quiz */
    const qRows: string[][] = [];
    for (const q of Object.values(catalog.quiz).filter((qq) => qq.unit === s.meta.slug)) {
      const res = s.unit.quiz[q.id];
      const correctLabel = q.options.find((o) => o.key === q.correct)?.key.toUpperCase() ?? q.correct.toUpperCase();
      if (res) {
        qRows.push([
          truncate(q.prompt, 80),
          res.selected.toUpperCase(),
          correctLabel,
          res.correct ? 'Sí' : 'No',
          `${res.score}/${q.value}`,
        ]);
      } else {
        qRows.push([truncate(q.prompt, 80), 'sin responder', correctLabel, '—', `0/${q.value}`]);
      }
    }
    if (qRows.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text('Preguntas de quiz', MARGIN, yy);
      yy += 6;
      autoTable(doc, {
        startY: yy,
        head: [['Enunciado', 'Marcó', 'Correcta', 'Correcto', 'Puntaje']],
        body: qRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
        headStyles: { fillColor: [78, 124, 221], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 260 },
          1: { halign: 'center', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 60 },
          3: { halign: 'center', cellWidth: 55 },
          4: { halign: 'right', cellWidth: 55 },
        },
      });
    }
  }

  writeFooter();

  const surname = state.student.name.split(/\s+/).slice(-1)[0] ?? 'estudiante';
  const givenName = state.student.name.split(/\s+/).slice(0, -1).join('-') || 'sin-nombre';
  const suffix = completed ? '' : '-parcial';
  const filename = `informe-git-challenge-${fileSafe(surname)}-${fileSafe(givenName)}-${todayStamp()}${suffix}.pdf`;

  doc.save(filename);
}
