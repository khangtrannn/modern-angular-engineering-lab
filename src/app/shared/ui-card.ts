import { Component } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  template: `
    <div
      class="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl h-full flex flex-col"
    >
      <div class="border-b border-gray-100">
        <ng-content select="[card-header]" />
      </div>

      <div class="p-6 flex-grow">
        <ng-content />
      </div>

      <div class="p-4 bg-gray-50 border-t border-gray-100">
        <ng-content select="[card-footer]" />
      </div>
    </div>
  `,
})
export class UiCard {}
