# Komari Dash

[简体中文](README_zh-CN.md)

A modern server monitoring dashboard theme for [Komari](https://github.com/komari-monitor/komari), ported from [NezhaDash](https://github.com/hamster1963/nezha-dash).

![Preview](preview.png)

## Features

- Real-time server monitoring with WebSocket
- Interactive world map with server locations
- Detailed server pages with CPU, Memory, Disk, Network, Connection, and Process charts
- Network latency monitoring with ping charts and Peak Cut (EWMA smoothing)
- Dark / Light theme switching
- Multi-language support (English, 简体中文, 繁體中文, 日本語, Español, Deutsch, Français)
- Search command palette
- Responsive design for mobile and desktop
- OS logo icons (font-logos)
- Animated circular progress bars
- Inline and card view modes

## Installation

1. Go to your Komari dashboard → Settings → Theme
2. Upload the `KomariDash.zip` file from the [Releases](../../releases) page
3. Done

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
node scripts/zip.mjs
```

This generates `KomariDash.zip` ready for upload.

## Configuration

Theme settings can be configured in the Komari dashboard:

| Option | Description | Default |
|--------|-------------|---------|
| Show Flag | Display country flags on server cards | `true` |
| Show Tag | Show server group tag filters | `true` |
| Show Net Transfer | Show total upload/download traffic | `false` |
| Disable Cartoon | Hide cartoon icon on network card | `false` |
| Fixed Top Server Name | Pin server name to top of card | `false` |
| Show Tag Count | Show server count next to group tags | `false` |
| Custom Logo URL | Custom logo image URL | - |
| Custom Description | Custom site description | - |
| Custom Links | JSON format custom links | - |

## Credits

- Original design and code by [hamster1963/nezha-dash](https://github.com/hamster1963/nezha-dash)
- Built with React, Vite, TailwindCSS, Recharts, d3-geo

## License

MIT
