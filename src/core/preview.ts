import { ParserSettings } from '../constants';
import { getGradientColor } from '../utils';
import { findAllMatches } from './parser';

interface StyledSegment {
    text: string;
    color: string | null;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    obfuscated: boolean;
}

export function generatePreviewSvg(text: string, settings: ParserSettings): string {
    const segments = getStyledSegments(text, settings);

    if (segments.length === 0) {
        return '';
    }

    const charWidth = 9;
    const charHeight = 16;
    const padding = 8;

    // Calculate total width
    let totalChars = 0;
    for (const segment of segments) {
        totalChars += segment.text.length;
    }

    const width = totalChars * charWidth + padding * 2;
    const height = charHeight + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    svg += `<rect width="100%" height="100%" fill="#1e1e1e" rx="4"/>`;

    let xPos = padding;
    const yPos = padding + charHeight - 4;

    for (const segment of segments) {
        const color = segment.color || '#d4d4d4';
        const fontWeight = segment.bold ? 'bold' : 'normal';
        const fontStyle = segment.italic ? 'italic' : 'normal';

        let textDecoration = '';
        if (segment.underline && segment.strikethrough) {
            textDecoration = 'underline line-through';
        } else if (segment.underline) {
            textDecoration = 'underline';
        } else if (segment.strikethrough) {
            textDecoration = 'line-through';
        }

        // For obfuscated text, replace with random characters
        let displayText = segment.text;
        if (segment.obfuscated) {
            const obfuscatedChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            displayText = [...segment.text].map(() =>
                obfuscatedChars[Math.floor(Math.random() * obfuscatedChars.length)]
            ).join('');
        }

        const escapedText = escapeSvgText(displayText);

        svg += `<text x="${xPos}" y="${yPos}" fill="${color}" font-family="monospace" font-size="14" font-weight="${fontWeight}" font-style="${fontStyle}"${textDecoration ? ` text-decoration="${textDecoration}"` : ''}>${escapedText}</text>`;

        xPos += segment.text.length * charWidth;
    }

    svg += '</svg>';
    return svg;
}

export function generatePreviewDataUri(text: string, settings: ParserSettings): string {
    const svg = generatePreviewSvg(text, settings);
    if (!svg) {
        return '';
    }
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

function escapeSvgText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function getStyledSegments(text: string, settings: ParserSettings): StyledSegment[] {
    const segments: StyledSegment[] = [];
    const matches = findAllMatches(text, settings);

    if (matches.length === 0) {
        return [{ text, color: null, bold: false, italic: false, underline: false, strikethrough: false, obfuscated: false }];
    }

    let currentColor: string | null = null;
    let colorStack: string[] = [];
    let currentGradient: { colors: string[]; startIndex: number } | null = null;
    let bold = false;
    let italic = false;
    let underline = false;
    let strikethrough = false;
    let obfuscated = false;

    // Text before first match
    if (matches[0].startIndex > 0) {
        segments.push({
            text: text.substring(0, matches[0].startIndex),
            color: null,
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            obfuscated: false,
        });
    }

    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];

        // Apply the current match to style state
        if (currentMatch.isClosingTag) {
            if (currentMatch.gradient !== undefined) {
                // Close gradient - add gradient segments
                if (currentGradient) {
                    const gradText = text.substring(currentGradient.startIndex, currentMatch.startIndex);
                    addGradientSegments(segments, gradText, currentGradient.colors, bold, italic, underline, strikethrough, obfuscated);
                    currentGradient = null;
                }
                currentColor = colorStack.length > 0 ? colorStack.pop()! : null;
            } else if (currentMatch.color === 'close') {
                if (colorStack.length > 0) {
                    currentColor = colorStack.pop()!;
                } else {
                    currentColor = null;
                }
            }
            if (currentMatch.format === 'bold') { bold = false; }
            if (currentMatch.format === 'italic') { italic = false; }
            if (currentMatch.format === 'underline') { underline = false; }
            if (currentMatch.format === 'strikethrough') { strikethrough = false; }
            if (currentMatch.format === 'obfuscated') { obfuscated = false; }
            if (currentMatch.format === 'reset') {
                currentColor = null;
                colorStack = [];
                currentGradient = null;
                bold = false;
                italic = false;
                underline = false;
                strikethrough = false;
                obfuscated = false;
            }
        } else {
            if (currentMatch.gradient) {
                if (currentColor) { colorStack.push(currentColor); }
                currentGradient = {
                    colors: currentMatch.gradient,
                    startIndex: currentMatch.startIndex + currentMatch.matchLength,
                };
                currentColor = null;
            } else if (currentMatch.color) {
                if (currentColor) { colorStack.push(currentColor); }
                currentColor = currentMatch.color;
            }
            if (currentMatch.format === 'bold') { bold = true; }
            if (currentMatch.format === 'italic') { italic = true; }
            if (currentMatch.format === 'underline') { underline = true; }
            if (currentMatch.format === 'strikethrough') { strikethrough = true; }
            if (currentMatch.format === 'obfuscated') { obfuscated = true; }
            if (currentMatch.format === 'reset') {
                currentColor = null;
                colorStack = [];
                currentGradient = null;
                bold = false;
                italic = false;
                underline = false;
                strikethrough = false;
                obfuscated = false;
            }
        }

        // Skip if we're in a gradient
        if (currentGradient) { continue; }

        // Get text segment - always skip the tag/code itself for clean preview
        const startPos = currentMatch.startIndex + currentMatch.matchLength;
        const endPos = nextMatch ? nextMatch.startIndex : text.length;

        if (endPos > startPos) {
            segments.push({
                text: text.substring(startPos, endPos),
                color: currentColor,
                bold,
                italic,
                underline,
                strikethrough,
                obfuscated,
            });
        }
    }

    return segments;
}

function addGradientSegments(
    segments: StyledSegment[],
    text: string,
    colors: string[],
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    obfuscated: boolean
): void {
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
        const color = getGradientColor(colors, i, chars.length);
        segments.push({
            text: chars[i],
            color,
            bold,
            italic,
            underline,
            strikethrough,
            obfuscated,
        });
    }
}
