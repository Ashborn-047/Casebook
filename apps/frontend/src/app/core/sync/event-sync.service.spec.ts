import { TestBed } from '@angular/core/testing';
import { EventSyncService } from './event-sync.service';
import { IndexedDBEventRepository } from '../storage/repositories/indexed-db-event-repository.service';
import { ConvexEventRepository } from '../storage/repositories/convex-event-repository.service';
import { Subject } from 'rxjs';
import { AppEvent } from '@casbook/shared-models';
import { environment } from '../../../environments/environment';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventSyncService', () => {
    let service: EventSyncService;
    let localRepoSpy: any;
    let remoteRepoSpy: any;
    let localEventSubject: Subject<AppEvent>;

    beforeEach(() => {
        localEventSubject = new Subject<AppEvent>();
        localRepoSpy = {
            getEvents: vi.fn().mockReturnValue(Promise.resolve([])),
            streamEvents: vi.fn().mockReturnValue(localEventSubject.asObservable())
        };
        remoteRepoSpy = {
            saveEvent: vi.fn().mockReturnValue(Promise.resolve())
        };

        TestBed.configureTestingModule({
            providers: [
                EventSyncService,
                { provide: IndexedDBEventRepository, useValue: localRepoSpy },
                { provide: ConvexEventRepository, useValue: remoteRepoSpy }
            ]
        });
        service = TestBed.inject(EventSyncService);

        // Enable mirroring for tests
        environment.enableMirroring = true;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should perform full sync on initialization', async () => {
        const mockEvents: AppEvent[] = [
            { id: '1', type: 'CASE_CREATED', occurredAt: '2023-01-01', payload: { caseId: 'c1' } } as any,
            { id: '2', type: 'EVIDENCE_ADDED', occurredAt: '2023-01-02', payload: { caseId: 'c1' } } as any
        ];
        localRepoSpy.getEvents.mockReturnValue(Promise.resolve(mockEvents));

        service.initialize();

        // Wait for the async runFullSync
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(remoteRepoSpy.saveEvent).toHaveBeenCalledTimes(2);
        expect(remoteRepoSpy.saveEvent).toHaveBeenCalledWith(mockEvents[0]);
        expect(remoteRepoSpy.saveEvent).toHaveBeenCalledWith(mockEvents[1]);
    });

    it('should sync new local events in real-time', () => {
        service.initialize();

        const newEvent: AppEvent = { id: '3', type: 'NOTE_ADDED', occurredAt: '2023-01-03', payload: { caseId: 'c1' } } as any;
        localEventSubject.next(newEvent);

        expect(remoteRepoSpy.saveEvent).toHaveBeenCalledWith(newEvent);
    });

    it('should not sync if mirroring is disabled', async () => {
        environment.enableMirroring = false;
        localRepoSpy.getEvents.mockReturnValue(Promise.resolve([{ id: '1' } as any]));

        service.initialize();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(remoteRepoSpy.saveEvent).not.toHaveBeenCalled();
    });

    it('should handle remote failures without crashing the sync process', async () => {
        service.initialize();

        remoteRepoSpy.saveEvent.mockReturnValue(Promise.reject('Network Error'));

        const newEvent: AppEvent = { id: '4' } as any;

        // This should not throw an unhandled rejection that stops the app
        expect(() => {
            localEventSubject.next(newEvent);
        }).not.toThrow();

        expect(remoteRepoSpy.saveEvent).toHaveBeenCalledWith(newEvent);
    });
});
