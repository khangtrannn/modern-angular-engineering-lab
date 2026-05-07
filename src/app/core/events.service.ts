import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { DevFestEvent } from '../models/event.model';
import { API_URL } from './tokens';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private url = inject(API_URL);
  private apiUrl = `${this.url}/events`;
  #http = inject(HttpClient);

  getEventsResource(query: Signal<string>) {
    return httpResource<DevFestEvent[]>(() => {
      const q = query();
      return q ? `${this.apiUrl}?q=${q}` : this.apiUrl;
    });
  }

  getEventResource(id: Signal<string>) {
    return httpResource<DevFestEvent>(() => `${this.apiUrl}/${id()}`);
  }

  deleteEvent(id: string) {
    return this.#http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createEvent(event: Omit<DevFestEvent, 'id'>) {
    return this.#http.post<DevFestEvent>(this.apiUrl, event);
  }
}
