import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';

import { EventSyncService } from './core/sync/event-sync.service';
import { CaseStore } from './core/state/case-store.service';
import { CommandPaletteComponent } from './shared/command-palette/command-palette.component';

@Component({
  imports: [RouterModule, CommandPaletteComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private syncService = inject(EventSyncService);
  store = inject(CaseStore);

  focusMode = signal(false);
  cmdPaletteOpen = signal(false);

  ngOnInit(): void {
    this.syncService.initialize();
  }

  toggleFocusMode(): void {
    this.focusMode.update(v => !v);
    if (this.focusMode()) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.cmdPaletteOpen.update(v => !v);
    }
    if (event.key === 'Escape') {
      this.cmdPaletteOpen.set(false);
    }
  }
}
