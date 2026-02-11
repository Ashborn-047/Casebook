/**
 * Contrast utility for neo-brutalist color accessibility.
 * Returns 'black' or 'white' based on the luminance of the background color.
 */
export function getContrastColor(hexBg: string): 'black' | 'white' {
    const hex = hexBg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Relative luminance formula (WCAG 2.0)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Returns the CSS variable for a severity level.
 */
export function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'critical': return 'var(--severity-critical)';
        case 'high': return 'var(--severity-high)';
        case 'medium': return 'var(--severity-medium)';
        case 'low': return 'var(--severity-low)';
        default: return 'var(--lavender)';
    }
}
