// Minecraft legacy color codes (&0-&9, &a-&f)
export const MINECRAFT_COLORS: Record<string, string> = {
    '0': '#000000', // Black
    '1': '#0000AA', // Dark Blue
    '2': '#00AA00', // Dark Green
    '3': '#00AAAA', // Dark Aqua
    '4': '#AA0000', // Dark Red
    '5': '#AA00AA', // Dark Purple
    '6': '#FFAA00', // Gold
    '7': '#AAAAAA', // Gray
    '8': '#555555', // Dark Gray
    '9': '#5555FF', // Blue
    'a': '#55FF55', // Green
    'b': '#55FFFF', // Aqua
    'c': '#FF5555', // Red
    'd': '#FF55FF', // Light Purple
    'e': '#FFFF55', // Yellow
    'f': '#FFFFFF', // White
};

// Minecraft legacy formatting codes
export const MINECRAFT_FORMATS: Record<string, string> = {
    'k': 'obfuscated',
    'l': 'bold',
    'm': 'strikethrough',
    'n': 'underline',
    'o': 'italic',
    'r': 'reset',
};

// MiniMessage named colors
export const MINIMESSAGE_COLORS: Record<string, string> = {
    'black': '#000000',
    'dark_blue': '#0000AA',
    'dark_green': '#00AA00',
    'dark_aqua': '#00AAAA',
    'dark_red': '#AA0000',
    'dark_purple': '#AA00AA',
    'gold': '#FFAA00',
    'gray': '#AAAAAA',
    'grey': '#AAAAAA',
    'dark_gray': '#555555',
    'dark_grey': '#555555',
    'blue': '#5555FF',
    'green': '#55FF55',
    'aqua': '#55FFFF',
    'red': '#FF5555',
    'light_purple': '#FF55FF',
    'yellow': '#FFFF55',
    'white': '#FFFFFF',
};

// MiniMessage formatting tags
export const MINIMESSAGE_FORMATS: Record<string, string> = {
    'bold': 'bold',
    'b': 'bold',
    'italic': 'italic',
    'em': 'italic',
    'i': 'italic',
    'underlined': 'underline',
    'u': 'underline',
    'strikethrough': 'strikethrough',
    'st': 'strikethrough',
    'obfuscated': 'obfuscated',
    'obf': 'obfuscated',
    'reset': 'reset',
};
