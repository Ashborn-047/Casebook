import { Injectable } from '@angular/core';
import { Evidence } from '@casbook/shared-models';

// ===== TYPES =====

export interface EntityMap {
    readonly nodeId: string;
    readonly dataId: string;
    readonly tokens: Set<string>;
    readonly timestamp: string;
}

export interface SuggestedLink {
    readonly sourceDataId: string;
    readonly targetDataId: string;
    readonly sharedTokens: string[];
    readonly score: number;
    readonly hasTemporalBonus: boolean;
}

// ===== MIND PALACE SERVICE =====

/**
 * Stateless, pure-logic intelligence engine.
 * Scans evidence for overlapping tokens and suggests possible connections.
 * No UI coupling. No side effects. Deterministic.
 */
@Injectable({ providedIn: 'root' })
export class MindPalaceService {

    /** Configurable temporal window in minutes */
    private readonly TEMPORAL_WINDOW_MINUTES = 30;
    private readonly TEMPORAL_BONUS = 20;
    private readonly TOKEN_SCORE_MULTIPLIER = 25;
    private readonly MAX_SCORE = 100;

    /**
     * Discover potential links between evidence items.
     * Returns suggested connections based on shared tokens.
     */
    discoverLinks(
        evidenceList: readonly Evidence[],
        existingConnectionPairs: Set<string>
    ): SuggestedLink[] {
        if (evidenceList.length < 2) return [];

        // Step 1: Build entity maps for all evidence
        const entityMaps: EntityMap[] = evidenceList.map(ev => ({
            nodeId: ev.id,
            dataId: ev.id,
            tokens: this.extractTokens(ev),
            timestamp: ev.submittedAt,
        }));

        // Step 2: Compare all pairs
        const suggestions: SuggestedLink[] = [];

        for (let i = 0; i < entityMaps.length; i++) {
            for (let j = i + 1; j < entityMaps.length; j++) {
                const a = entityMaps[i];
                const b = entityMaps[j];

                // Skip if already connected
                const pairKey = this.makePairKey(a.dataId, b.dataId);
                if (existingConnectionPairs.has(pairKey)) continue;

                // Compute intersection
                const shared = this.intersect(a.tokens, b.tokens);
                if (shared.length === 0) continue;

                // Compute score
                const hasTemporalBonus = this.isTemporallyClose(a.timestamp, b.timestamp);
                const baseScore = shared.length * this.TOKEN_SCORE_MULTIPLIER;
                const temporalAddition = hasTemporalBonus ? this.TEMPORAL_BONUS : 0;
                const score = Math.min(this.MAX_SCORE, baseScore + temporalAddition);

                suggestions.push({
                    sourceDataId: a.dataId,
                    targetDataId: b.dataId,
                    sharedTokens: shared,
                    score,
                    hasTemporalBonus,
                });
            }
        }

        // Sort by score descending
        return suggestions.sort((a, b) => b.score - a.score);
    }

    /**
     * Extract meaningful tokens from evidence content.
     * Tokenizes content + description + tags, normalizes to lowercase.
     * Filters out common stop words and very short tokens.
     */
    extractTokens(evidence: Evidence): Set<string> {
        const rawText = [
            evidence.content || '',
            evidence.description || '',
            ...(evidence.tags || []),
        ].join(' ');

        const tokens = rawText
            .toLowerCase()
            .replace(/[^a-z0-9@._:/-]/g, ' ')  // Keep meaningful chars
            .split(/\s+/)
            .filter(token => token.length > 2)  // Skip tiny tokens
            .filter(token => !STOP_WORDS.has(token));

        return new Set(tokens);
    }

    /**
     * Compute set intersection between two token sets.
     */
    private intersect(setA: Set<string>, setB: Set<string>): string[] {
        const result: string[] = [];
        for (const token of setA) {
            if (setB.has(token)) {
                result.push(token);
            }
        }
        return result;
    }

    /**
     * Check if two timestamps are within the temporal window.
     */
    private isTemporallyClose(tsA: string, tsB: string): boolean {
        const timeA = new Date(tsA).getTime();
        const timeB = new Date(tsB).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return false;
        const diffMinutes = Math.abs(timeA - timeB) / (1000 * 60);
        return diffMinutes <= this.TEMPORAL_WINDOW_MINUTES;
    }

    /**
     * Create a consistent pair key (sorted) for deduplication.
     */
    makePairKey(idA: string, idB: string): string {
        return [idA, idB].sort().join('::');
    }
}

// ===== STOP WORDS =====
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
    'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has',
    'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see',
    'way', 'who', 'did', 'get', 'let', 'say', 'she', 'too',
    'use', 'this', 'that', 'with', 'have', 'from', 'they',
    'been', 'said', 'each', 'which', 'their', 'will', 'other',
    'about', 'many', 'then', 'them', 'these', 'some', 'would',
    'make', 'like', 'into', 'time', 'very', 'when', 'come',
    'could', 'more', 'what', 'also', 'after', 'know',
]);
