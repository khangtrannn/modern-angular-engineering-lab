import { Routes } from '@angular/router';
import { EventList } from './features/events/event-list';
import { EventDetails } from './features/events/event-details';
import { CreateEvent } from './features/admin/create-event';

export const routes: Routes = [
  { path: '', component: EventList },
  { path: 'event/:id', component: EventDetails },
  { path: 'admin/create', component: CreateEvent },
  { path: '**', redirectTo: '' },
];
