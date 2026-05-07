# Angular SSR Render Modes: Client vs Server vs Prerender

- SSR is not always global. Angular supports route-level rendering decisions.
- Prerendering happens at build time.
- Server rendering happens at request time.
- Client rendering happens in the browser.
- Prerendering is fast but can serve stale data.
- Server rendering is fresher but can increase response time.
- Client rendering is useful for private and highly interactive pages.
- Angular SSR mainly improves the initial page load.
- After hydration, Angular behaves mostly like a client-side application.
- Hydration is still needed because HTML alone is not interactive.

## RenderMode.Client

`RenderMode.Client` means the route is rendered completely in the browser.

The server does not generate meaningful HTML for this route. It behaves like a traditional Angular single-page application.

In this mode, Angular waits for the client-side JavaScript bundle to load before the route becomes meaningful.

### Mental Model

```
Browser requests route
↓
Server returns basic Angular shell
↓
Browser downloads JavaScript
↓
Angular runs in the browser
↓
Page is rendered on the client
```

### Best for

```
- Private dashboards
- Admin pages
- User-specific pages
- Highly interactive pages
- Pages where SEO is not important
- Pages where initial HTML does not need to contain real content
```

### Tradeoff

The browser needs JavaScript before the page becomes meaningful.

This can be acceptable for private or internal pages, but it may not be ideal for public, SEO-sensitive pages.

---

## RenderMode.Server

`RenderMode.Server` means the route is rendered on the server **at request time**.

Every time a user requests this route, Angular generates the HTML on the server first. Then the server sends that rendered HTML to the browser.

This is runtime SSR.

### Mental Model

```
Browser requests route
↓
Server receives request
↓
Angular renders the route on the server
↓
Server sends rendered HTML
↓
Browser displays HTML
↓
Angular JavaScript loads
↓
Angular hydrates the page
↓
Page becomes interactive
```

### Best For

```
- Dynamic public pages
- SEO-sensitive pages
- Product listing pages
- Product detail pages
- Public pages where data changes frequently
- Pages where the initial HTML should contain real content
```

### Tradeoff

The user may not see anything until the server finishes rendering the route.

This means server rendering can improve the quality of the first HTML response, but it can also increase the time before the first response is fully ready.

---

## RenderMode.Prerender

`RenderMode.Prerender` means the route is rendered at **build time**, not request time.

Angular creates the HTML in advance during the build process. Later, when a request comes in, the server or CDN can return the already-generated HTML immediately.

This is static generation.

### Mental Model

```
Build application
↓
Angular generates HTML for selected routes
↓
Generated HTML is deployed
↓
Browser requests route
↓
Server/CDN returns prebuilt HTML immediately
```

### Best For

- Home pages
- Marketing pages
- Blog posts
- Documentation pages
- Event pages with relatively stable data
- Landing pages
- Public pages that do not change frequently

### Tradeoff

The generated HTML can become stale if the underlying data changes after build time.

---

## Freshness vs Speed

The most important tradeoff is:

```
Freshness vs Speed
```

### Prerender Is Fast

Prerendered pages are fast because the HTML already exists before the request arrives.

```
Request comes in
↓
Return existing HTML
```

This is excellent for performance.

However, the data can become stale.

For example, if an event page is prerendered at build time, but a new event is added later, the generated HTML may not include the latest event until the application is rebuilt.

## Server Rendering is Fresher

Server-rendered pages are fresher because the server generates the page for each request.

```
Request comes in
↓
Fetch latest data
↓
Render HTML
↓
Return response
```

This is useful when the page data changes frequently.

However, the user has to wait for the server to fetch the data and generate the HTML.

---

## Client Rendering Can Show a Shell First

Sometimes it is better to show a mostly static shell first, then load dynamic data later on the client.

```
Return shell
↓
Browser shows basic UI
↓
Client fetches dynamic data
↓
UI updates
```

The total time may be longer, but the user sees something earlier.

This can improve perceived performance.

---

## Handling Highly Dynamic Data

For highly dynamic data, prerendering the entire page may not be ideal.

```
Product list changes frequently
Inventory changes often
Prices change often
Search results depend on user filters
```

### Option 1: Use `RenderMode.Server`

Use server rendering when the initial HTML needs to contain fresh data.

```
Browser requests product list
↓
Server fetches latest products
↓
Angular renders product list on server
↓
Server sends HTML with product data
```

This is useful when:

```
- The page is public
- The page needs SEO
- The data should be visible in the initial HTML
- The data changes frequently
```

### Option 2: Prerender Only the Shell

Another option is to prerender only the stable shell of the page.

```
Prerender layout/header/sidebar/static content
↓
Send static shell quickly
↓
Client fetches dynamic product list
↓
Product list appears after loading
```

This is useful when:

```
- The static layout can load immediately
- Dynamic data is too fresh or too personalized to prerender
- Perceived performance is more important than having all data in initial HTML
```

Example:

```
Static shell:
- Header
- Navigation
- Page title
- Filters layout
- Footer

Dynamic data:
- Product list
- Prices
- Availability
- Personalized recommendations
```

---

## Handling Data That Changes Sometimes

If data changes occasionally, prerendering can still work well.

For example, imagine an event page.

Events do not change every second. They may only change when an admin creates, updates, or removes an event.

In this case, a good strategy is:

```
Admin creates or updates an event
↓
Database changes
↓
Trigger Angular rebuild
↓
New prerendered HTML is generated
↓
Deploy latest static output
```

This gives us the speed of prerendering while reducing the risk of stale data.

This strategy is useful when we know exactly when the data changes.

---

## Angular SSR vs Next.js Server Components

A very important distinction:

```
Angular SSR mainly affects the initial request.
```

After the browser receives the server-rendered HTML and Angular becomes active, the application behaves like a client-side Angular app.

Angular SSR does not mean that every component interaction continues to be rendered on the server.

### Angular SSR Mental Model

```
Initial route request
↓
Server may render HTML
↓
Browser receives HTML
↓
Angular hydrates
↓
Application continues on the client
```

### Next.js Server Components Mental Model

```
Initial request may involve the server
↓
Later navigations/interactions can still request server-rendered component payloads
↓
Server can continue participating in component rendering
```

### Key Difference

```
Angular SSR:
Server rendering is mainly for the initial page response.

Next.js Server Components:
The server can continue participating in rendering component payloads after initial load.
```

This distinction is important because Angular SSR should not be understood as the same thing as React Server Components.

## Why Hydration Is Still Needed

Even if the server sends rendered HTML, the browser still needs Angular JavaScript.

HTML alone is not a running Angular application.

The browser still needs Angular to:

```
- Create component instances
- Attach event listeners
- Restore client-side routing behavior
- Connect reactive state
- Handle future interactions
- Make the page interactive
```

### Mental Model

```
Server-rendered HTML
= visible structure

Hydration
= Angular attaches behavior to that existing structure
```

So SSR improves the first HTML response, but hydration is what makes the page interactive.

---

## Prerender build

In other to make the prerender build works, we need to make sure that the backend is running. Otherwise, we cannot retrieve the data at the build time.
