import { Injectable, signal } from '@angular/core';

@Injectable()
export class TabState {
  readonly activeTab = signal('');

  active(label: string) {
    this.activeTab.set(label);
  }
}
