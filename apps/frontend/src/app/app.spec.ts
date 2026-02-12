import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { CaseStore } from './core/state/case-store.service';
import { EventSyncService } from './core/sync/event-sync.service';

describe('App', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCaseStore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockEventSyncService: any;

  beforeEach(async () => {
    mockCaseStore = {
      uiState: signal({ isLoading: false, storageInfo: { isInitialized: true } }),
      currentUser: signal({ name: 'Test User' }),
      caseSummaries: signal([]),
      selectCase: vi.fn()
    };

    mockEventSyncService = {
      initialize: vi.fn(),
      watchCase: vi.fn(),
      unwatchCase: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: CaseStore, useValue: mockCaseStore },
        { provide: EventSyncService, useValue: mockEventSyncService }
      ]
    }).compileComponents();
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render logo text', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent).toContain(
      'CASEBOOK',
    );
  });
});
