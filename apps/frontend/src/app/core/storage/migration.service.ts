import { Injectable } from '@angular/core';

export interface Migration {
    version: number;
    description: string;
    migrate: (db: IDBDatabase) => Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class MigrationService {
    private migrations: Migration[] = [
        {
            version: 1,
            description: 'Initial schema creation',
            migrate: async (db: IDBDatabase) => {
                console.log('Migration 1: Initial schema created');
            }
        }
    ];

    async runMigrations(db: IDBDatabase): Promise<void> {
        try {
            const transaction = db.transaction(['metadata'], 'readwrite');
            const metadataStore = transaction.objectStore('metadata');

            const versionRequest = metadataStore.get('version');
            const currentVersion = await new Promise<number>((resolve) => {
                versionRequest.onsuccess = () => {
                    resolve(versionRequest.result?.value || 0);
                };
                versionRequest.onerror = () => {
                    resolve(0);
                };
            });

            for (const migration of this.migrations) {
                if (migration.version > currentVersion) {
                    console.log(`Running migration ${migration.version}: ${migration.description}`);
                    await migration.migrate(db);

                    await new Promise<void>((resolve, reject) => {
                        const tx = db.transaction(['metadata'], 'readwrite');
                        const store = tx.objectStore('metadata');
                        const updateRequest = store.put({ key: 'version', value: migration.version });
                        updateRequest.onsuccess = () => resolve();
                        updateRequest.onerror = () => reject(updateRequest.error);
                    });
                }
            }

            const latestVersion = this.migrations.length > 0
                ? this.migrations[this.migrations.length - 1].version
                : 0;
            console.log(`Migrations complete. Current version: ${latestVersion}`);
        } catch (error) {
            console.warn('Migration check skipped (metadata store may not exist yet)');
        }
    }
}
