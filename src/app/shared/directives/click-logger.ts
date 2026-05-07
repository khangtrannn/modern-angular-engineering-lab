import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appClickLogger]',
  host: {
    '(click)': 'onClick()',
  },
})
export class ClickLogger {
  readonly eventName = input<string>('unknown_event');

  onClick() {
    console.log('[Analytics] Card Clicked', this.eventName());
  }
}
