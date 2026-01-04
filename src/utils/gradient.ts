export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

export function interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    return rgbToHex(
        c1.r + (c2.r - c1.r) * factor,
        c1.g + (c2.g - c1.g) * factor,
        c1.b + (c2.b - c1.b) * factor
    );
}

export function getGradientColor(colors: string[], position: number, total: number): string {
    if (colors.length === 1) { return colors[0]; }
    if (total <= 1) { return colors[0]; }

    const segment = (colors.length - 1) * (position / (total - 1));
    const index = Math.floor(segment);
    const factor = segment - index;

    if (index >= colors.length - 1) { return colors[colors.length - 1]; }
    return interpolateColor(colors[index], colors[index + 1], factor);
}
