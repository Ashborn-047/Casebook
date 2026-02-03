import { Routes } from '@angular/router';
import { CaseListComponent } from './case-list/case-list.component';

export const CASES_ROUTES: Routes = [
    {
        path: '',
        component: CaseListComponent
    },
    {
        path: ':id',
        loadComponent: () => import('../case-detail/case-detail-container.component')
            .then(m => m.CaseDetailContainerComponent)
    }
];
