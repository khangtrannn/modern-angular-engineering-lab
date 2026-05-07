import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-venue-map',
  imports: [NgOptimizedImage],
  template: `
    <div class="h-140 bg-gray-200 rounded mb-4 overflow-hidden relative">
      <img
        [ngSrc]="'/images/venue-map.png'"
        width="500"
        height="600"
        class="w-full h-full object-cover"
      />
    </div>
  `,
})
export class VenueMap {}
