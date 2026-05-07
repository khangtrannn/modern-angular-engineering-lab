import { Routes } from '@angular/router';
import { EventList } from './features/events/event-list';
import { EventDetails } from './features/events/event-details';
import { CreateEvent } from './features/admin/create-event';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: EventList },
  { path: 'event/:id', component: EventDetails },
  {
    path: 'admin/create',
    loadComponent: () => import('./features/admin/create-event').then((m) => m.CreateEvent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
