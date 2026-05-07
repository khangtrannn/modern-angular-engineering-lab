import { inject, InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

export const TICKETS_URL = new InjectionToken<string>('TICKETS_URL', {
  providedIn: 'root',
  factory: () => {
    const api = inject(API_URL);
    return `${api}/tickets`;
  },
});
