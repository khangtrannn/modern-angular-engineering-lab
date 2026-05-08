```ts
export class LoginComponent {
  // Form Model
  loginModel = signal({
    email: '',
    password: '',
  });

  // We inti form with defined form model
  loginForm = form(this.loginModel);
}
```

## Core Concept: Form Model = Writable Signal

The form model is a writable signal that initializes the form. Forms are now very well typed and directly infer the type from the initializing object. Any modifications and updates to the form model are directly propagated and reflected by the form — they remain in full synchronization.

With Reactive Forms, the form managed its own state independently

```ts
form = fb.group({
  email: [entity.email],
  password: [entity.password],
});
```
