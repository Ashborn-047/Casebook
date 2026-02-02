import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedLogic } from './shared-logic';

describe('SharedLogic', () => {
  let component: SharedLogic;
  let fixture: ComponentFixture<SharedLogic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedLogic],
    }).compileComponents();

    fixture = TestBed.createComponent(SharedLogic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
