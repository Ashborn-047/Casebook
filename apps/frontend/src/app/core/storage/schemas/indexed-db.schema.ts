export const IndexedDBSchema = {
    name: 'casbook-events',
    version: 1,
    stores: {
        events: {
            keyPath: 'id',
            indexes: [
                { name: 'caseId', keyPath: 'payload.caseId', unique: false },
                { name: 'type', keyPath: 'type', unique: false },
                { name: 'occurredAt', keyPath: 'occurredAt', unique: false },
                { name: 'actorId', keyPath: 'actorId', unique: false },
            ]
        },
        snapshots: {
            keyPath: 'caseId'
        },
        metadata: {
            keyPath: 'key'
        }
    }
} as const;

export type IndexedDBSchemaType = typeof IndexedDBSchema;
