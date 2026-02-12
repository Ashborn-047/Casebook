import { TestBed } from '@angular/core/testing';
import { MindPalaceService } from './mind-palace.service';
import { Evidence } from '@casbook/shared-models';

describe('MindPalaceService', () => {
    let service: MindPalaceService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MindPalaceService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('extractTokens', () => {
        it('should extract lowercased tokens longer than 2 chars', () => {
            const evidence: Partial<Evidence> = {
                content: 'The quick brown fox',
                description: 'Jumps over a lazy dog',
                tags: ['animal', 'forest']
            };

            const tokens = service.extractTokens(evidence as Evidence);

            expect(tokens).toContain('quick');
            expect(tokens).toContain('brown');
            expect(tokens).toContain('fox');
            expect(tokens).toContain('jumps');
            expect(tokens).toContain('lazy');
            expect(tokens).toContain('dog');
            expect(tokens).toContain('animal');
            expect(tokens).toContain('forest');
            expect(tokens).not.toContain('the'); // Stop word
            expect(tokens).not.toContain('this'); // Stop word
            expect(tokens).not.toContain('a'); // < 3 chars
        });
    });

    describe('discoverLinks', () => {
        const ev1: Partial<Evidence> = {
            id: 'ev1',
            content: 'Theft at Baker Street',
            description: 'Occurred at 9:00 PM',
            submittedAt: '2026-02-12T09:00:00Z',
            tags: ['robbery']
        };

        const ev2: Partial<Evidence> = {
            id: 'ev2',
            content: 'Suspect seen at Baker Street',
            description: 'Phone pinged at 9:15 PM',
            submittedAt: '2026-02-12T09:15:00Z',
            tags: ['tracking']
        };

        const ev3: Partial<Evidence> = {
            id: 'ev3',
            content: 'Vandalism at Broadway',
            description: 'Morning incident',
            submittedAt: '2026-02-12T08:00:00Z',
            tags: ['graffiti']
        };

        it('should suggest links between items sharing tokens', () => {
            const suggestions = service.discoverLinks([ev1, ev2, ev3] as Evidence[], new Set());

            expect(suggestions.length).toBeGreaterThan(0);
            const link = suggestions.find(s =>
                (s.sourceDataId === 'ev1' && s.targetDataId === 'ev2') ||
                (s.sourceDataId === 'ev2' && s.targetDataId === 'ev1')
            );

            expect(link).toBeTruthy();
            expect(link?.sharedTokens).toContain('baker');
            expect(link?.sharedTokens).toContain('street');
            expect(link?.hasTemporalBonus).toBe(true);
            expect(link?.score).toBeGreaterThan(50);
        });

        it('should not suggest already existing links', () => {
            const existing = new Set([service.makePairKey('ev1', 'ev2')]);
            const suggestions = service.discoverLinks([ev1, ev2, ev3] as Evidence[], existing);

            const link = suggestions.find(s =>
                (s.sourceDataId === 'ev1' && s.targetDataId === 'ev2') ||
                (s.sourceDataId === 'ev2' && s.targetDataId === 'ev1')
            );

            expect(link).toBeUndefined();
        });

        it('should not suggest links with zero intersection', () => {
            const suggestions = service.discoverLinks([ev1, ev3] as Evidence[], new Set());
            expect(suggestions.length).toBe(0);
        });
    });
});
