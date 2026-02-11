import {
    Component,
    Input,
    Output,
    EventEmitter,
    signal,
    inject,
    ViewChild,
    ElementRef,
    AfterViewInit,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaseStore } from '../../core/state/case-store.service';

interface CommandItem {
    icon: string;
    label: string;
    shortcut?: string;
    action: () => void;
}

@Component({
    selector: 'cb-command-palette',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div
      class="cmd-palette-overlay"
      [class.active]="isOpen"
      (click)="onOverlayClick($event)"
    >
      <div class="cmd-palette-box">
        <input
          #searchInput
          type="text"
          class="cmd-input"
          placeholder="Type a command or search..."
          [value]="query()"
          (input)="onSearch($event)"
          (keydown.escape)="close()"
          (keydown.arrowdown)="moveSelection(1)"
          (keydown.arrowup)="moveSelection(-1)"
          (keydown.enter)="executeSelected()"
        />
        <div class="cmd-results">
          <div
            *ngFor="let item of filteredItems(); let i = index"
            class="cmd-item"
            [style.background]="selectedIndex() === i ? 'var(--lime)' : ''"
            (click)="executeItem(item)"
            (mouseenter)="selectedIndex.set(i)"
          >
            <span>{{ item.icon }} {{ item.label }}</span>
            <span *ngIf="item.shortcut" class="cmd-shortcut">{{ item.shortcut }}</span>
          </div>
          <div
            *ngIf="filteredItems().length === 0"
            class="cmd-item"
            style="color: #999; cursor: default;"
          >
            No results found
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CommandPaletteComponent implements AfterViewInit {
    @Input() isOpen = false;
    @Output() closed = new EventEmitter<void>();
    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    private router = inject(Router);
    private store = inject(CaseStore);

    query = signal('');
    selectedIndex = signal(0);

    private commands: CommandItem[] = [
        { icon: '🏠', label: 'Go to Dashboard', shortcut: 'G D', action: () => this.router.navigate(['/cases']) },
        { icon: '👁️', label: 'Toggle Focus Mode', shortcut: '⌘⇧F', action: () => document.body.classList.toggle('focus-mode') },
    ];

    filteredItems = computed<CommandItem[]>(() => {
        const q = this.query().toLowerCase();
        const items: CommandItem[] = [...this.commands];

        // Add dynamic case items
        const cases = this.store.caseSummaries();
        for (const c of cases) {
            items.push({
                icon: '📁',
                label: `Case: ${c.title}`,
                action: () => {
                    this.store.selectCase(c.id);
                    this.close();
                },
            });
        }

        if (!q) return items;
        return items.filter(item => item.label.toLowerCase().includes(q));
    });

    ngAfterViewInit(): void {
        // Focus input when opened
        setTimeout(() => {
            if (this.isOpen && this.searchInput) {
                this.searchInput.nativeElement.focus();
            }
        });
    }

    ngOnChanges(): void {
        if (this.isOpen) {
            this.query.set('');
            this.selectedIndex.set(0);
            setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
        }
    }

    onSearch(event: Event): void {
        this.query.set((event.target as HTMLInputElement).value);
        this.selectedIndex.set(0);
    }

    moveSelection(delta: number): void {
        const items = this.filteredItems();
        const newIndex = this.selectedIndex() + delta;
        if (newIndex >= 0 && newIndex < items.length) {
            this.selectedIndex.set(newIndex);
        }
    }

    executeSelected(): void {
        const items = this.filteredItems();
        if (items[this.selectedIndex()]) {
            this.executeItem(items[this.selectedIndex()]);
        }
    }

    executeItem(item: CommandItem): void {
        item.action();
        this.close();
    }

    close(): void {
        this.closed.emit();
    }

    onOverlayClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('cmd-palette-overlay')) {
            this.close();
        }
    }
}
