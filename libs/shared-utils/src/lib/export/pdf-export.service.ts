import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { AppEvent } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';
import { ExportOptions, ExportResult } from './export.types';

/**
 * PdfExportService
 * 
 * Generates a formal PDF audit report for a case.
 * Adheres to forensic integrity principles by deriving all content from the event stream.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {

    /**
     * Export a case to PDF
     * @param caseId The ID of the case to export
     * @param events The full event stream for this case
     * @param options Export configuration
     */
    export(caseId: string, events: AppEvent[], options: Partial<ExportOptions> = {}): ExportResult {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 30;

        // 1. Sort events
        const sortedEvents = [...events].sort(
            (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
        );

        // 2. Compute state
        const derivedState = reduceEvents(sortedEvents);

        // --- COVER PAGE ---
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);
        doc.text('CASE AUDIT REPORT', pageWidth / 2, y, { align: 'center' });

        y += 20;
        doc.setFontSize(14);
        doc.text(`Case ID: ${caseId}`, pageWidth / 2, y, { align: 'center' });

        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Exported At: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

        y += 30;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);

        // --- CASE SUMMARY (DERIVED) ---
        y += 20;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Case Summary (Derived View)', margin, y);

        y += 10;
        doc.setFontSize(12);
        doc.text(`Title: ${derivedState.title}`, margin, y);

        y += 7;
        doc.text(`Status: ${derivedState.status.toUpperCase()}`, margin, y);

        y += 7;
        doc.text(`Evidence Count: ${derivedState.evidenceCount}`, margin, y);

        y += 7;
        doc.text(`Severity: ${derivedState.severity}`, margin, y);

        // --- TIMELINE TABLE ---
        if (options.includeTimeline ?? true) {
            doc.addPage();
            y = 20;
            doc.setFontSize(16);
            doc.text('Chronological Timeline (Canonical Source)', margin, y);

            y += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');

            // Header
            doc.text('Timestamp', margin, y);
            doc.text('Event Type', margin + 45, y);
            doc.text('Actor', margin + 110, y);
            doc.text('Role', margin + 150, y);

            y += 5;
            doc.line(margin, y, pageWidth - margin, y);

            doc.setFont('helvetica', 'normal');
            sortedEvents.forEach((event) => {
                y += 8;

                // Add new page if needed
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                const dateStr = new Date(event.occurredAt).toLocaleDateString();
                const timeStr = new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                doc.text(`${dateStr} ${timeStr}`, margin, y);
                doc.text(event.type.replace(/_/g, ' '), margin + 45, y);
                doc.text(event.actorId.substring(0, 12), margin + 110, y);
                doc.text(event.actorRole, margin + 150, y);
            });
        }

        // --- APPENDIX: EVIDENCE HASHES ---
        if (options.includeEvidence ?? true) {
            doc.addPage();
            y = 20;
            doc.setFontSize(16);
            doc.text('Appendix: Evidence Integrity Log', margin, y);

            y += 15;
            doc.setFontSize(9);
            derivedState.evidence.forEach((ev) => {
                y += 10;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFont('helvetica', 'bold');
                doc.text(`Evidence ID: ${ev.id}`, margin, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.text(`SHA-256 Hash: ${ev.hash}`, margin, y);
                y += 5;
                doc.text(`Description: ${ev.description.substring(0, 80)}...`, margin, y);
            });
        }

        // --- FOOTER ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
            doc.text('CASBOOK FORENSIC AUDIT - CONFIDENTIAL', margin, 285);
        }

        return {
            blob: doc.output('blob'),
            filename: `case-audit-${caseId}-${new Date().getTime()}.pdf`,
            mimeType: 'application/pdf'
        };
    }
}
