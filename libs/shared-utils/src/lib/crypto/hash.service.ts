import { Injectable } from '@angular/core';

/**
 * HashService
 * 
 * Provides forensic-grade hashing for evidence files using the Web Crypto API.
 * 
 * Why hashing?
 * In a forensic system, the SHA-256 hash serves as a unique digital fingerprint.
 * By calculating the hash BEFORE the event is created and storing it IN the 
 * event payload, we create an immutable record that proves the evidence 
 * has not been tampered with since the moment of upload (Chain of Custody).
 */
@Injectable({ providedIn: 'root' })
export class HashService {

    /**
     * Computes the SHA-256 hash of a file
     * @param file The file to hash
     * @returns A promise that resolves to the hex string of the hash
     */
    async computeSHA256(file: File): Promise<string> {
        try {
            if (!file || file.size === 0) {
                throw new Error('Invalid file: File is empty or missing.');
            }

            // Read the file as an ArrayBuffer using FileReader for better compatibility
            const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(new Error('Failed to read file.'));
                reader.readAsArrayBuffer(file);
            });

            // Compute the hash using the Web Crypto API
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

            // Convert the ArrayBuffer to a hex string
            return this.bufferToHex(hashBuffer);
        } catch (error) {
            console.error('Forensic Hash Error:', error);
            throw new Error(`Failed to compute forensic hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Converts an ArrayBuffer to a hex string (lowercase)
     */
    private bufferToHex(buffer: ArrayBuffer): string {
        const hashArray = Array.from(new Uint8Array(buffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
