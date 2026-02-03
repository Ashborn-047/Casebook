import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleBadgeComponent } from './role-badge.component';

describe('RoleBadgeComponent', () => {
    let component: RoleBadgeComponent;
    let fixture: ComponentFixture<RoleBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoleBadgeComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RoleBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should default to viewer role', () => {
        expect(component.role).toBe('viewer');
    });

    it('should return correct icon for each role', () => {
        component.role = 'investigator';
        expect(component.getRoleIcon()).toBe('🔍');

        component.role = 'supervisor';
        expect(component.getRoleIcon()).toBe('⭐');
    });
});
