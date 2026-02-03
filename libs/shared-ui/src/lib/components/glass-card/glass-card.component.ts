import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'cb-glass-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div 
      class="glass-card rounded-2xl p-6 transition-all duration-300"
      [class.cursor-pointer]="clickable"
      [class.hover:scale-[1.02]]="clickable"
      [class.hover:shadow-xl]="clickable"
      [ngClass]="additionalClasses"
      [style.backdrop-filter]="blur ? 'blur(12px)' : 'none'"
    >
      <ng-content></ng-content>
    </div>
  `,
    styles: [`
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    :host-context(.dark) .glass-card {
      background: rgba(30, 30, 30, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `]
})
export class GlassCardComponent {
    @Input() blur = true;
    @Input() clickable = false;
    @Input() additionalClasses = '';
}
