# Angular `@defer` and Chunk Splitting

```html
@defer (hydrate on viewport) {
<app-venue-map />
} @defer (hydrate on interaction) {
<button (click)="addTicket()">Buy Tickets</button>
}
```

## Key Lesson

Angular only creates a separate defer chunk for **deferrable dependencies** inside the `@defer` block.

Typical deferrable dependencies are:

```
- standalone components
- standalone directives
- standalone pipes
```

Especially when they are used only inside the `@defer` block.

Native HTML alone is not enough to create a separate chunk.

### Why the Buy Tickets Button Did Not Split

This deferred block contains only native HTML:

```html
@defer (hydrate on interaction) {
  <button(click)="addTicket()">Buy Tickets</button>
}
```

The button itself is just a native DOM element.

There is no standalone Angular component, directive, or pipe inside the block that Angular can lazy import.

Also, the click handler calls a method on the parent component:

```ts
addTicket();
```

That method belongs to the parent `EventDetails` component.

Because the parent component owns the method, Angular must keep that logic in the parent component’s JavaScript chunk.

So even though the button is inside `@defer`, the parent component still needs to contain:

```
- the button template instructions
- the click listener registration
- the call to addTicket()
```

### Why the Venue Map Did Split

This deferred block is different:

```
@defer (hydrate on viewport) {
  <app-venue-map/>
}
```

`<app-venue-map />` is a standalone Angular component.

Because the component is used inside the `@defer` block, Angular can treat it as a deferrable dependency.

That gives Angular something real to lazy import.

The build output confirms this:

```
chunk-KYJX7447.js    | venue-map
```

So the venue map creates a separate JavaScript chunk because:

```
- VenueMap is a standalone Angular component
- It is referenced inside the @defer block
- Angular can lazy import it
- Its template and logic can live outside the parent event-details chunk
```

## Mental Model

```
@defer does not mean:
Every line inside the block becomes a separate chunk.

@defer means:
Angular can defer loading/hydration of dependencies inside the block.

Separate chunk requires:
A deferrable Angular dependency, usually a standalone component/directive/pipe.

---

Native HTML inside @defer can be deferred for hydration behavior,
but it may not create a separate lazy-loaded JavaScript chunk.

Standalone Angular dependencies inside @defer can create separate chunks.
```

`@defer` has two related but different ideas

```
1. Deferring hydration/rendering behavior
2. Splitting JavaScript into separate chunks
```

A block can be registered as a deferred/hydratable block without producing a meaningful separate chunk.

For example:

```html
@defer (hydrate on interaction) {
<button (click)="addTicket()">Buy Tickets</button>
}
```

This can still be a deferred hydration block.

But it may not produce a separate JavaScript chunk because there is no deferrable dependency inside.

## Notes

- `@defer` is not the same as automatic chunk splitting for all template code.
- Angular splits deferrable dependencies, not arbitrary native HTML.
- Standalone components/directives/pipes are good deferrable dependencies.
- A native button inside `@defer` may still stay in the parent component chunk.
- If the button calls a parent method, that method must remain with the parent.
- VenueMap splits because it is a standalone component used inside `@defer`.
- To make Buy Tickets split, create a standalone BuyTicketButton component.
- Put the click logic and service injection inside the deferred child component.
- Use build output to verify whether a separate defer chunk was created.
- A defer block can be registered for hydration even if it does not produce a separate chunk.
