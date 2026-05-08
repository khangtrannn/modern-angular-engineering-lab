import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';

import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from './store-features/request-status.feature';
import { TICKETS_URL } from './tokens';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { TicketEntry } from './cart.service';

interface CartState {
  ticketIds: string[];
}

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>({
    ticketIds: [],
  }),
  withComputed(({ ticketIds }) => ({
    count: () => ticketIds().length,
  })),
  withRequestStatus(),
  withMethods((store) => {
    const http = inject(HttpClient);
    const ticketsUrl = inject(TICKETS_URL);

    return {
      _load: rxMethod<void>(
        pipe(
          tap(() => patchState(store, setPending())),
          switchMap(() =>
            http.get<TicketEntry[]>(ticketsUrl).pipe(
              tapResponse({
                next: (tickets) =>
                  patchState(store, { ticketIds: tickets.map((t) => t.eventId) }, setFulfilled()),
                error: (err: any) => patchState(store, setError(err.message)),
              }),
            ),
          ),
        ),
      ),

      // METHOD 2: Checkout (Write)
      // Strategy: exhaustMap (Ignore clicks while one is processing)
      addToCart: rxMethod<{ eventId: string }>(
        exhaustMap(({ eventId }) => {
          patchState(
            store,
            (state) => ({ ticketIds: [...state.ticketIds, eventId] }),
            setPending(),
          );
          return http.post(ticketsUrl, { eventId }).pipe(
            tapResponse({
              next: () => {
                patchState(store, setFulfilled());
                console.log('Transaction Confirmed');
              },
              error: (err: any) => {
                console.error('Transaction Failed - Rolling Back');

                // CRITICAL: ROLLBACK LOGIC
                // We optimistically added the ID. Now we must remove ONE instance of it.
                patchState(
                  store,
                  (state) => {
                    const index = state.ticketIds.lastIndexOf(eventId);
                    if (index === -1) return state;

                    const newIds = [...state.ticketIds];
                    newIds.splice(index, 1);
                    return { ticketIds: newIds };
                  },
                  setError(err.message),
                );
              },
            }),
          );
        }),
      ),
    };
  }),
  withHooks({
    onInit(store) {
      // Automatically load data when the store is first injected
      store._load();
    },
  }),
);
