# Minecraft Colors in Files

A VS Code extension that highlights Minecraft color codes directly in your files. See your colors as you type!

![Demo](images/demo.gif)

## Features

- **Legacy Color Codes** - `&0` through `&f` for classic Minecraft colors
- **Legacy Hex Colors** - `&#RRGGBB` format
- **MiniMessage Support** - Full support for Adventure's MiniMessage format
  - Named colors: `<red>`, `<gold>`, `<aqua>`, etc.
  - Hex colors: `<#FF5555>`
  - Gradients: `<gradient:#ff0000:#00ff00>Rainbow text</gradient>`
- **Formatting** - Bold, italic, underline, strikethrough, and obfuscated
- **Live Preview** - Select text and hover to see a rendered preview

## Supported Formats

### Legacy Codes
```
&0 Black       &8 Dark Gray
&1 Dark Blue   &9 Blue
&2 Dark Green  &a Green
&3 Dark Aqua   &b Aqua
&4 Dark Red    &c Red
&5 Dark Purple &d Light Purple
&6 Gold        &e Yellow
&7 Gray        &f White

&l Bold        &o Italic
&n Underline   &m Strikethrough
&k Obfuscated  &r Reset
```

### Legacy Hex
```
&#FF5555 - Custom hex color
&#5555FF - Another hex color
```

### MiniMessage
```xml
<red>Red text</red>
<#FF5555>Custom hex</‎#FF5555>
<bold>Bold text</bold>
<italic>Italic text</italic>
<gradient:#ff0000:#00ff00>Gradient text</gradient>
```

## Extension Settings

This extension contributes the following settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `minecraftColors.legacy.enabled` | `true` | Enable legacy formatting (&x codes) |
| `minecraftColors.legacy.colors` | `true` | Enable legacy color codes (&0-9, &a-f) |
| `minecraftColors.legacy.formatting` | `true` | Enable legacy formatting codes (&k, &l, &m, &n, &o, &r) |
| `minecraftColors.legacyHex.enabled` | `true` | Enable legacy hex colors (&#RRGGBB) |
| `minecraftColors.miniMessage.enabled` | `true` | Enable MiniMessage formatting |
| `minecraftColors.miniMessage.colors` | `true` | Enable MiniMessage color tags |
| `minecraftColors.miniMessage.formatting` | `true` | Enable MiniMessage formatting tags |
| `minecraftColors.miniMessage.gradients` | `true` | Enable MiniMessage gradient tags |

## Commands

| Command | Description |
|---------|-------------|
| `Toggle Minecraft Color Highlighting` | Enable/disable the color highlighting |

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Minecraft Colors in Files"
4. Click Install

### From VSIX
1. Download the `.vsix` file from releases
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the `...` menu and select "Install from VSIX..."
5. Select the downloaded file

## Development

```bash
# Clone the repository
git clone https://github.com/jacesleeman/minecraft-colors-in-files.git
cd minecraft-colors-in-files

# Install dependencies
npm install

# Compile
npm run compile

# Run in development mode
# Press F5 in VS Code to launch Extension Development Host
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
