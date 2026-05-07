- Using square brackets in the template tells Angular to evaluate the value as an expression or property reference.
- Aliasing

## provideClientHydration

Typically, historically, you if you were ever used like Angular Universal or other server-side rendered parts, it will create you HTML, the styles and everything on the server. In your index file, you will get it all pre-created. But then Angular post kicks in and it's destroys existing DOM and re-creates the new one for you, so you would have that some call it flash, little flash too, it's like very fast, but it basically destroyed the existing DOM that you saw initially that's also nonfunctional, and then it created the new one. So with the new SSR approach, Angular no longer does this. So you have an existing DOM, existing HTML structure that is loaded from your server's side, and then it will go over and hydrate that DOM with functionally from Angular, so instead of destroying this, it'll basically start attaching all the functionality for Angular itself, so the clicks, the buttons, it'll be fully aware that those are actually components.

### withEventReplay

Well, say you have a DOM that's already there and users are super fast and starts clicking some of the buttons or does some certain things. Well, because the Angular is still bootstrapping the DOM, some of those could be missed. And we don't want that. So what Angular does instead is tracks where user clicked, and if things were not hydrated yet, meaning there's no JavaScript, Angular functionality that wraps it yet, then once it wraps it, it will replay all the clicks to those components.

## SignalStore vs. NgRx Store

- Event-based
- Command-based
