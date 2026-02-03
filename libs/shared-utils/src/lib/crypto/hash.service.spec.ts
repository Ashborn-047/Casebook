import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HashService } from './hash.service';
describe('HashService', () => {
    let service: HashService;

    beforeEach(() => {
        // Mock crypto.subtle.digest using real node:crypto for accuracy
        const mockDigest = vi.fn().mockImplementation(async (algo: any, data: ArrayBuffer) => {
            const { createHash } = require('node:crypto');
            // Buffer.from works with ArrayBuffer
            const hash = createHash('sha256').update(Buffer.from(data)).digest();
            // Return as ArrayBuffer
            const arrayBuffer = new ArrayBuffer(hash.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < hash.length; ++i) {
                view[i] = hash[i];
            }
            return arrayBuffer;
        });

        vi.stubGlobal('crypto', {
            subtle: {
                digest: mockDigest
            }
        });

        TestBed.configureTestingModule({
            providers: [HashService]
        });
        service = TestBed.inject(HashService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should produce a stable SHA-256 hex string for a file', async () => {
        const content = 'Hello forensic world';
        const file = new File([content], 'test.txt', { type: 'text/plain' });

        const hash = await service.computeSHA256(file);

        expect(hash).toBeDefined();
        expect(hash.length).toBe(64); // SHA-256 hex is 64 chars
        expect(typeof hash).toBe('string');

        // Re-hashing same content should produce same result
        const hash2 = await service.computeSHA256(new File([content], 'test2.txt'));
        expect(hash).toBe(hash2);
    });

    it('should produce different hashes for different content', async () => {
        const file1 = new File(['content 1'], 'file1.txt');
        const file2 = new File(['content 2'], 'file2.txt');

        const hash1 = await service.computeSHA256(file1);
        const hash2 = await service.computeSHA256(file2);

        expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty file', async () => {
        const emptyFile = new File([], 'empty.txt');
        await expect(service.computeSHA256(emptyFile)).rejects.toThrow('Invalid file');
    });

    it('should be deterministic (known hash test)', async () => {
        // "abc" SHA-256: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
        const file = new File(['abc'], 'abc.txt');
        const hash = await service.computeSHA256(file);
        expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });
});
