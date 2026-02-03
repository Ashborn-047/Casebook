import { Routes } from '@angular/router';
import { CaseListComponent } from './features/cases/case-list/case-list.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'cases',
        pathMatch: 'full'
    },
    {
        path: 'cases',
        component: CaseListComponent
    },
    {
        path: 'cases/:id',
        loadComponent: () => import('./features/case-detail/case-detail-container.component')
            .then(m => m.CaseDetailContainerComponent)
    },
    {
        path: '**',
        redirectTo: 'cases'
    }
];
