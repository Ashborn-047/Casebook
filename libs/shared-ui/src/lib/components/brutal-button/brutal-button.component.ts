import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'cb-brutal-button',
    standalone: true,
    imports: [CommonModule],
    template: `
    <button
      class="brutal-button font-bold transition-all duration-200 inline-flex items-center justify-center gap-2"
      [class]="getButtonClasses()"
      [disabled]="disabled"
      (click)="handleClick($event)"
    >
      <span *ngIf="icon" class="text-lg">{{ icon }}</span>
      <ng-content></ng-content>
    </button>
  `,
    styles: [`
    .brutal-button {
      border: 3px solid #1a1a2e;
      box-shadow: 4px 4px 0 #1a1a2e;
      transform: translate(0, 0);
    }
    
    .brutal-button:hover:not(:disabled) {
      box-shadow: 2px 2px 0 #1a1a2e;
      transform: translate(2px, 2px);
    }
    
    .brutal-button:active:not(:disabled) {
      box-shadow: 0 0 0 #1a1a2e;
      transform: translate(4px, 4px);
    }
    
    .brutal-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .brutal-button:focus-visible {
      outline: 4px dashed var(--pink, #FF6B9D);
      outline-offset: 4px;
    }
  `]
})
export class BrutalButtonComponent {
    @Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() disabled = false;
    @Input() icon?: string;
    @Output() clicked = new EventEmitter<MouseEvent>();

    handleClick(event: MouseEvent): void {
        if (!this.disabled) {
            this.clicked.emit(event);
        }
    }

    getButtonClasses(): string {
        const variantClasses = {
            primary: 'bg-yellow-400 text-brutal-dark hover:bg-yellow-300',
            secondary: 'bg-white text-brutal-dark hover:bg-gray-100',
            danger: 'bg-red-500 text-white hover:bg-red-400',
            ghost: 'bg-transparent text-brutal-dark hover:bg-gray-100',
        };

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm rounded-lg',
            md: 'px-5 py-2.5 text-base rounded-xl',
            lg: 'px-7 py-3.5 text-lg rounded-2xl',
        };

        return `${variantClasses[this.variant]} ${sizeClasses[this.size]}`;
    }
}
