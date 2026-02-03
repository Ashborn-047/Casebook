/**
 * Export Format Options
 * Exports in Casebook are always derived from the immutable event stream.
 */
export enum ExportFormat {
    JSON = 'json',
    PDF = 'pdf'
}

/**
 * Audit Export Options
 * Controls what information is included in the exported package.
 * Since Casebook is audit-first, the timeline is always the canonical source.
 */
export interface ExportOptions {
    /** The format of the export */
    format: ExportFormat;

    /** Include the full chronological event timeline */
    includeTimeline: boolean;

    /** Include detailed evidence meta-data and hashes */
    includeEvidence: boolean;

    /** Include board layout and visual connections */
    includeBoardLayout: boolean;

    /** Include developer-level audit trail (IPs, user agents if available) */
    includeAuditTrail: boolean;

    /** Case ID to export */
    caseId: string;
}

/**
 * Result of the export process
 */
export interface ExportResult {
    blob: Blob;
    filename: string;
    mimeType: string;
}
