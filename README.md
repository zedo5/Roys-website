# WM Group website

Static site for Waleed Medaa Group, hosted on GitHub Pages (`wmgroup.build`). There's no build step.

## Structure

- `index.html`: page markup
- `assets/css/site.css`: all styles (dark theme, EN/AR with RTL)
- `assets/js/build.js`: the scroll-driven "blueprint → structure → complete" hero. Each chapter image is turned into linework in the browser (Sobel edge detection), so a new image uploaded in the CMS works without any extra files.
- `assets/js/site.js`: renders all content from `content/site.json`, and runs the language toggle, smooth scrolling (Lenis), scroll animations (GSAP ScrollTrigger), the gallery and the lightbox.
- `content/site.json`: all editable content.
- `admin/`: Decap CMS (via DecapBridge). Edit content at `/admin`.

## Editing content

Use `/admin` → Site Content → Globals. Every text field has English and Arabic versions.

- **Cinematic Intro**: the scroll-to-build hero chapters. Use wide renders of at least 2000px.
- **Stats, Intro Statement, Film Section, Design → Built**: the sections below the hero.
- **Projects**, **In Development**, **Gallery** (with optional captions), **Partner** (contact details).

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The page loads `content/site.json` with `fetch`, so it has to be served over HTTP. Opening the file directly won't work.
