import { Component, computed, inject, input } from '@angular/core';
import { TabState } from './tab-state';

@Component({
  selector: 'app-tab',
  template: `
    @if (isActive()) {
      <div class="py-6 animate-in fade-in duration-300">
        <ng-content />
      </div>
    }
  `,
})
export class Tab {
  #state = inject(TabState);

  readonly label = input.required<string>();

  readonly isActive = computed(() => this.#state.activeTab() === this.label());
}
