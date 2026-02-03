import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRole } from '@casbook/shared-models';

@Component({
    selector: 'cb-role-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span 
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border-2"
      [ngClass]="getBadgeClasses()"
    >
      <span class="text-base">{{ getRoleIcon() }}</span>
      {{ getRoleLabel() }}
    </span>
  `,
    styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class RoleBadgeComponent {
    @Input() role: UserRole = 'viewer';
    @Input() showLabel = true;

    getBadgeClasses(): string {
        const classes: Record<UserRole, string> = {
            viewer: 'bg-gray-100 text-gray-700 border-gray-300',
            investigator: 'bg-blue-100 text-blue-700 border-blue-300',
            supervisor: 'bg-purple-100 text-purple-700 border-purple-300',
        };
        return classes[this.role];
    }

    getRoleIcon(): string {
        const icons: Record<UserRole, string> = {
            viewer: '👁️',
            investigator: '🔍',
            supervisor: '⭐',
        };
        return icons[this.role];
    }

    getRoleLabel(): string {
        if (!this.showLabel) return '';
        const labels: Record<UserRole, string> = {
            viewer: 'Viewer',
            investigator: 'Investigator',
            supervisor: 'Supervisor',
        };
        return labels[this.role];
    }
}
