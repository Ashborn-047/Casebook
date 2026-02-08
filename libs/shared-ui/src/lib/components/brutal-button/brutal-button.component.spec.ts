import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BrutalButtonComponent } from './brutal-button.component';

describe('BrutalButtonComponent', () => {
    let component: BrutalButtonComponent;
    let fixture: ComponentFixture<BrutalButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BrutalButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(BrutalButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have primary variant by default', () => {
        expect(component.variant).toBe('primary');
    });

    it('should emit clicked event when clicked', () => {
        const spy = vi.spyOn(component.clicked, 'emit');
        const button = fixture.nativeElement.querySelector('button');
        button.click();
        expect(spy).toHaveBeenCalled();
    });

    it('should not emit clicked event when disabled', () => {
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();
        const spy = vi.spyOn(component.clicked, 'emit');
        const button = fixture.nativeElement.querySelector('button');
        button.click();
        expect(spy).not.toHaveBeenCalled();
    });
});
