import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { EventSyncService } from './core/sync/event-sync.service';

@Component({
  imports: [NxWelcome, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'frontend';
  private syncService = inject(EventSyncService);

  ngOnInit(): void {
    this.syncService.initialize();
  }
}
