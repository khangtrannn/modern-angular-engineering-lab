import { httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { DevFestEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private apiUrl = 'http://localhost:3000/events';

  getEventsResource(query: Signal<string>) {
    return httpResource<DevFestEvent[]>(() => {
      const q = query();
      return q ? `${this.apiUrl}?q=${q}` : this.apiUrl;
    });
  }
}
