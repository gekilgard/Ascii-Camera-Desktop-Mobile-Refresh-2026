<div align="center">
  <img src="public/assets/banner.png" alt="ASCII Cam Refreshed" width="full">

  # ASCII Cam — Refreshed 2026

  <p align="center">
    <i>Real-time ASCII camera: webcam or upload, filters, presets, and capture — in the browser.</i>
  </p>

  [![GitHub stars](https://img.shields.io/github/stars/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026?style=social)](https://github.com/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026?style=social)](https://github.com/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026/network/members)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## About this project

**ASCII Cam Refreshed 2026** is my **first coding project**. I started experimenting with it back in **2022** and have kept iterating since — this repo is the **2026 refresh**: desktop and mobile layout, filters, per-filter presets, upload mode, recording, and a UI pass built around how I actually use it.

The idea has deep roots in two open-source projects I learned from and drew inspiration from:

- **[idevelop/ascii-camera](https://github.com/idevelop/ascii-camera)** — Andrei Gheorghe’s classic getUserMedia → ASCII webcam demo (MIT).
- **[pshycodr/phosphor-cam](https://github.com/pshycodr/phosphor-cam)** — A modern React + Canvas take on the same idea (MIT).

This fork is **not** a thin reskin: there’s a lot of custom rendering, settings, presets, and product decisions layered on top of that lineage. Upstream licenses remain in [LICENSE](LICENSE); see **Credits** below.

### Author & attribution

**Maintainer:** **Grant Kilgard** — [@gekilgard](https://github.com/gekilgard)

I own the direction, features, and ongoing work on **this repository**. Development sometimes uses editors and assistants; they are **tools**, not co-authors. For GitHub’s contributor graph, commits should attribute to **me**: use your verified GitHub email in git, and add any secondary commit emails under [GitHub → Settings → Emails](https://github.com/settings/emails) so they count toward your profile. Optionally use a [`.mailmap`](https://git-scm.com/docs/gitmailmap) (see `.mailmap.example` in this repo) to normalize local history display.

---

## Features

- **Real-time rendering** — Live ASCII conversion with solid FPS on modern devices
- **Capture** — High-resolution PNG export from the canvas
- **Filters & presets** — ASCII, dither, solid blocks, matrix, gek, corporate; each filter snaps sliders + toggles to tuned defaults
- **Adjustments** — Resolution (cell size), contrast, brightness, color mode, invert
- **Camera & media** — Front/back camera, photo / video / **upload** (image or video)
- **Recording** — Record the ASCII canvas via `captureStream`
- **Performance readout** — FPS and render time (optional; can fade during slider drag)

---

## Demo

<div align="center">
  <img src="public/demo/blocks-color.png" alt="ASCII camera demo — solid blocks" width="45%">
  <img src="public/demo/standrad.png" alt="ASCII camera demo" width="45%">
</div>

---

## Quick start

```bash
git clone https://github.com/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026.git
cd Ascii-Camera-Desktop-Mobile-Refresh-2026
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build   # production build
npm run preview # serve dist locally
```

---

## Usage

1. Allow **camera** (or choose **Upload** and pick a file).
2. Open **settings** (top-right) to change **filter**, sliders, color, and invert.
3. **Shutter** — save a still; **flip** — switch cameras; **video** — record from the ASCII view.

---

## Tech stack

- React · TypeScript · Vite  
- Canvas 2D + `getUserMedia` / `MediaRecorder`  
- Tailwind CSS · Lucide / React Icons  

---

## Browser support

Needs a current browser with `getUserMedia`, Canvas 2D, and modern JS.

Chrome · Firefox · Safari · Edge (recent versions).

---

## Credits

| Project | Author / maintainer | Role here |
|--------|----------------------|-----------|
| [ascii-camera](https://github.com/idevelop/ascii-camera) | Andrei Gheorghe | Early inspiration — webcam → ASCII in the browser |
| [phosphor-cam](https://github.com/pshycodr/phosphor-cam) | Anish Roy (upstream MIT) | React/TS/Vite base this refresh grew from |

**This fork:** **Grant Kilgard** ([@gekilgard](https://github.com/gekilgard)).

---

## License

MIT — see [LICENSE](LICENSE). Upstream copyright notices from bundled lineage apply where noted.

---

## Contributing

Issues and PRs welcome. For larger changes, open an issue first.

---

<div align="center">

**ASCII Cam Refreshed 2026** · Grant Kilgard ([@gekilgard](https://github.com/gekilgard))

[Report an issue](https://github.com/gekilgard/Ascii-Camera-Desktop-Mobile-Refresh-2026/issues)

</div>
