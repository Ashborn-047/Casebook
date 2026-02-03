import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineEntry, UserRole } from '@casbook/shared-models';
import { RoleBadgeComponent } from '../role-badge';
import { GlassCardComponent } from '../glass-card';

@Component({
    selector: 'cb-timeline-item',
    standalone: true,
    imports: [CommonModule, RoleBadgeComponent, GlassCardComponent],
    template: `
    <div class="relative flex gap-4">
      <!-- Timeline line -->
      <div class="flex flex-col items-center">
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 bg-white"
          [ngClass]="entry.colorClass"
        >
          {{ getIcon() }}
        </div>
        <div *ngIf="!isLast" class="w-0.5 flex-1 bg-gray-200 my-2"></div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 pb-6">
        <cb-glass-card [blur]="false" additionalClasses="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-semibold text-brutal-dark">{{ entry.title }}</h4>
                <cb-role-badge [role]="entry.actorRole" [showLabel]="false"></cb-role-badge>
                <span *ngIf="entry.metadata?.isMindPalace" class="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  🧠 Mind Palace
                </span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ entry.description }}</p>
            </div>
            <time class="text-xs text-gray-400 whitespace-nowrap">
              {{ formatTime(entry.occurredAt) }}
            </time>
          </div>
        </cb-glass-card>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class TimelineItemComponent {
    @Input() entry!: TimelineEntry;
    @Input() isLast = false;

    getIcon(): string {
        const iconMap: Record<string, string> = {
            'add_circle': '➕',
            'attach_file': '📎',
            'lock': '🔒',
            'note': '📝',
            'link': '🔗',
            'lightbulb': '💡',
            'check_circle': '✅',
            'event': '📅',
            'person': '👤',
            'close': '❌',
            'refresh': '🔄',
        };
        return iconMap[this.entry.icon] || '📌';
    }

    formatTime(isoString: string): string {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}
