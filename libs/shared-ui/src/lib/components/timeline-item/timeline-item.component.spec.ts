import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineItemComponent } from './timeline-item.component';
import { TimelineEntry } from '@casbook/shared-models';

describe('TimelineItemComponent', () => {
    let component: TimelineItemComponent;
    let fixture: ComponentFixture<TimelineItemComponent>;

    const mockEntry: TimelineEntry = {
        id: 'test-1',
        eventId: 'event-1',
        type: 'CASE_CREATED',
        title: 'Test Event',
        description: 'Test description',
        actorId: 'user-1',
        actorRole: 'investigator',
        occurredAt: new Date().toISOString(),
        icon: 'add_circle',
        colorClass: 'text-yellow-500',
        payload: {},
        isVisibleTo: ['viewer', 'investigator', 'supervisor'],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimelineItemComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimelineItemComponent);
        component = fixture.componentInstance;
        component.entry = mockEntry;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should format recent time as "Just now"', () => {
        expect(component.formatTime(new Date().toISOString())).toBe('Just now');
    });

    it('should return correct icon', () => {
        expect(component.getIcon()).toBe('➕');
    });
});
