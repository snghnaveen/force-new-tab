# Force Links to New Tab (Toggle)

A Chrome extension that forces all normal left-clicks on links to open in a new tab. Toggle the behavior via the toolbar icon or the keyboard shortcut (`Alt+Shift+W`). Whitelist domains to restrict the effect, and customize preferences in the options page.

## Features

- **Force new tab:** All left-clicks on links open in a new tab (unless whitelisted or ignored).
- **Toggle ON/OFF:** Use the toolbar icon or `Alt+Shift+W` to enable/disable.
- **Whitelist:** Only force new tab for specified domains (leave empty to allow all).
- **Open in background:** Optionally open new tabs in the background.
- **YouTube exception:** Links with `t` or `list` parameters are ignored.
- **Keyboard override:** Hold `Q` to temporarily disable the extension for a click.

## Installation

1. Download or clone this repository.
2. Go to `chrome://extensions` in your browser.
3. Enable "Developer mode".
4. Click "Load unpacked" and select this folder.

## Usage

- Click the extension icon to toggle ON/OFF.
- Use `Alt+Shift+W` to toggle via keyboard.
- Configure preferences and whitelist domains in the options page.

## Options

- **Open in background:** Checkbox to open new tabs without switching focus.
- **Whitelist:** Enter one domain per line. If empty, all domains are affected.

## Development

- Content script: [`content.js`](content.js)
- Background service worker: [`background.js`](background.js)
- Options page: [`options.html`](options.html), [`options.js`](options.js)
- Manifest: [`manifest.json`](manifest.json)

## License

MIT

## Author

[Naveen Singh](https://github.com/snghnaveen)