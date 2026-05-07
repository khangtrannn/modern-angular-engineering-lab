import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';

import { routes } from './app.routes';
import { API_URL } from './core/tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    provideHttpClient(withFetch()),

    { provide: API_URL, useValue: 'http://localhost:3000' },

    // https://khangtran.dev/cdn-cgi/image/width=500,format=auto/https://storage.googleapis.com/dev-sandbox-09.firebasestorage.app/angular-keynote.png
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => {
        const src = config.src.replace('/images/', '');
        return `https://khangtran.dev/cdn-cgi/image/width=${config.width},format=auto/https://storage.googleapis.com/dev-sandbox-09.firebasestorage.app/${src}`;
      },
    },
  ],
};
