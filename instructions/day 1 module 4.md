# Day 1 - Module 4: The Signal Forms API

**Goal:** Build the "Create Event" Admin page using the new **Angular Signal Forms**. You will learn to drive a form from a source `signal`, apply schema-based validation, and bind inputs using the `[field]` directive.

**Estimated Time:** 60 Minutes

---

## 🛠️ Prerequisites

1.  **Auth Check:** Ensure you are "logged in" as an admin.
    - Open Browser Console (F12): `localStorage.setItem('isAdmin', 'true')`
    - Click **Admin** in the header.
2.  Navigate to `http://localhost:4200/admin/create`.

---

## Step 1: Define the Form Model

In Signal Forms, the **Source of Truth** is a standard Angular `signal`. The form itself is just a wrapper that provides state (validity, touched, dirty) around that signal.

1.  Open **`src/app/features/admin/create-event.ts`**.
2.  Import `signal` and define your data interface.
3.  Create the `eventData` signal.

```typescript
// src/app/features/admin/create-event.ts
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EventsService } from '../../core/events.service';
import { DevFestEvent } from '../../models/event.model';

// 1. Define the Data Shape
interface CreateEventForm extends Omit<DevFestEvent, 'id'> {}

@Component({
  selector: 'app-create-event',
  imports: [], // We will add Signal Form imports next
  template: `...`,
})
export class CreateEvent {
  private readonly eventService = inject(EventsService);
  private readonly router = inject(Router);

  // 2. The Source of Truth
  // This writable signal holds the data.
  // We initialize it with empty/default values.
  readonly eventData = signal<CreateEventForm>({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 16), // Default to now
    location: '',
    speakers: [],
    image: '/images/event4.png',
  });
}
```

---

## Step 2: Initialize Form & Schema

Now we create the form object using the `form()` function. This creates a **Field Tree** that mirrors your signal structure. We will also add advanced behavior:

1.  **Conditional Logic:** The `description` field will remain **disabled** until the user types a Title.
2.  **Debouncing:** We will delay `description` updates by 1000ms to prevent rapid signal updates while typing.

3.  Update imports to fetch primitives from **`@angular/forms/signals`**.
4.  Import the **`Field`** directive (Required for binding).
5.  Initialize the form with the `eventData` signal and schema rules.

```typescript
// Add these imports
import { form, Field, required, minLength, disabled, debounce } from '@angular/forms/signals';

@Component({
  selector: 'app-create-event',
  imports: [Field],
  // ...
})
export class CreateEvent {
  // ... eventData signal ...

  // 3. Create Form & Validation Schema
  readonly form = form(this.eventData, (root) => {
    // Title Rules
    required(root.title, { message: 'Title is required' });

    // Description Rules
    // A. Debounce: Wait 1000ms after typing stops before updating the model
    debounce(root.description, 1000);

    // B. Conditional Disable: Disable description if Title is empty
    // valueOf() lets us look up the current value of other fields
    disabled(root.description, ({ valueOf }) => !valueOf(root.title));

    // C. Validation
    required(root.description, { message: 'Description is required' });
    minLength(root.description, 10, { message: 'Description must be at least 10 chars' });

    // Other Rules
    required(root.date, { message: 'Date is required' });
    required(root.location, { message: 'Location is required' });
  });
}
```

> **Note:** The `[field]` directive in the template will automatically toggle the `disabled` HTML attribute on the textarea when the rule evaluates to true. You don't need to manually bind `[disabled]`.

---

## Step 3: Binding with `[field]`

We use the `[field]` directive to bind DOM inputs to the Field Tree.

- **Binding:** `[field]="form.propertyName"`
- **State:** Access signals like `.invalid()`, `.touched()`, and `.errors()` on the field property.

Update the template in **`create-event.ts`**:

```html
<div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
  <h2 class="text-2xl font-bold mb-6 text-gray-800">Create New Event</h2>

  <form (submit)="onSubmit($event)" class="space-y-6">
    <!-- Title -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>

      <!-- BINDING: Use [field] pointing to the form tree property -->
      <input
        [field]="form.title"
        type="text"
        class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="e.g. Angular Workshop"
      />

      <!-- ERROR HANDLING: Check touched() AND invalid() signals -->
      @if (form.title().touched() && form.title().invalid()) {
      <p class="text-red-500 text-sm mt-1">{{ form.title().errors()[0].message }}</p>
      }
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
      <textarea
        [field]="form.description"
        rows="3"
        class="w-full px-4 py-2 border rounded-md outline-none"
      ></textarea>

      @if (form.description().touched() && form.description().invalid()) {
      <p class="text-red-500 text-sm mt-1">{{ form.description().errors()[0].message }}</p>
      }
    </div>

    <!-- Date & Location -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label>Date</label>
        <input
          [field]="form.date"
          type="datetime-local"
          class="w-full px-4 py-2 border rounded-md"
        />
      </div>
      <div>
        <label>Location</label>
        <input [field]="form.location" type="text" class="w-full px-4 py-2 border rounded-md" />
      </div>
    </div>

    <!-- (Speakers Array Next) -->

    <!-- Actions -->
    <div class="flex justify-end gap-4 pt-4">
      <button type="button" class="px-4 py-2 text-gray-600">Cancel</button>

      <!-- Form-Level Validity: form().invalid() -->
      <button
        type="submit"
        [disabled]="form().invalid()"
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Create Event
      </button>
    </div>
  </form>
</div>
```

---

## Step 4: Dynamic Arrays

In Signal Forms, dynamic lists are handled by simply updating the array in your source signal. The Field Tree (`form.speakers`) is navigable by index (e.g., `form.speakers[0]`).

1.  Add helper methods to the class to mutate the **Source Signal**.

```typescript
export class CreateEvent {
  // ...

  addSpeaker() {
    // Update the source signal. The form automatically detects the new item.
    this.eventData.update((current) => ({
      ...current,
      speakers: [...current.speakers, ''],
    }));
  }

  removeSpeaker(index: number) {
    this.eventData.update((current) => ({
      ...current,
      speakers: current.speakers.filter((_, i) => i !== index),
    }));
  }
}
```

2.  Update the template. We iterate over the data and bind to the specific index in the form tree.

```html
<div class="border-t border-gray-100 pt-4">
  <div class="flex justify-between items-center mb-2">
    <label class="block text-sm font-medium text-gray-700">Speakers</label>
    <button type="button" (click)="addSpeaker()" class="text-sm text-blue-600 hover:underline">
      + Add Speaker
    </button>
  </div>

  <div class="space-y-2">
    <!-- Iterate over the SOURCE data to get the index -->
    @for (speaker of eventData().speakers; track $index) {
    <div class="flex gap-2">
      <!-- Bind to form.speakers[index] -->
      <input
        [field]="form.speakers[$index]"
        type="text"
        placeholder="Speaker Name"
        class="flex-1 px-4 py-2 border rounded-md"
      />

      <button type="button" (click)="removeSpeaker($index)" class="text-red-500 px-2">✕</button>
    </div>
    }
  </div>
</div>
```

---

## Step 5: Handling Submission

Because the form syncs automatically 2-ways with your signal, you don't need to extract values from the form. You just read your signal.

1.  Implement `onSubmit` in **`create-event.ts`**.

```typescript
export class CreateEvent {
  // ...

  onSubmit(event: SubmitEvent) {
    // Prevent default form submission
    event.preventDefault();
    // 1. Check form-level validity signal
    if (this.form().invalid()) return;

    // 2. Read the Source Signal directly
    const payload = this.eventData();

    // 3. Send to service
    this.eventService.createEvent(payload).subscribe({
      next: () => {
        alert('Event Created!');
        this.router.navigate(['/']);
      },
      error: (err) => console.error(err),
    });
  }
}
```

2.  Implement `createEvent` in **`events.service.ts`**.

```typescript
export class EventsService {
  // ...

  createEvent(event: Omit<DevFestEvent, 'id'>): Observable<DevFestEvent> {
    return this.http.post<DevFestEvent>(this.apiUrl, event);
  }
}
```

---

## Step 6: Verification

1.  Navigate to `/admin/create`.
2.  **Logic Test (Disabled State):**
    - Look at the "Description" field. It should be grayed out (disabled) because the Title is empty.
    - Type "Angular Workshop" in the "Title" field.
    - **Observe:** The "Description" field automatically enables.
3.  **Debounce Test:**
    - Open Angular DevTools and watch the `eventData` signal.
    - Type "Hello World" quickly in the "Description" field.
    - **Observe:** The signal in DevTools does **not** update on every keystroke. It updates once, one second after you stop typing.
4.  **Validation Test:**
    - Type "Short". Blur the field.
    - **Observe:** "Description must be at least 10 chars" appears.
5.  **Submit:** Create the event.

---

### Module 4 Complete! ✅

You have successfully implemented **Angular Signal Forms**.

**Key Takeaways:**

- **Model-First:** The `signal` is the boss. The `form` is just a utility wrapper.
- **Tree Navigation:** Access fields via dot notation (`form.title`) or index (`form.speakers[0]`).
- **Schema Validation:** Rules are defined centrally in the `form()` setup.
- **Field Directive:** `[field]` handles all the 2-way binding magic.

**Next Module:** We will create a `CartService` to manage state across the application and learn about **Dependency Injection Providers**.
