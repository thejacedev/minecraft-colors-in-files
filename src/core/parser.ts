import { StyleMatch, ParserSettings, DEFAULT_SETTINGS } from '../constants';
import {
    MINECRAFT_COLORS,
    MINECRAFT_FORMATS,
    MINIMESSAGE_COLORS,
    MINIMESSAGE_FORMATS
} from '../constants';

export function findAllMatches(line: string, settings: ParserSettings = DEFAULT_SETTINGS): StyleMatch[] {
    const matches: StyleMatch[] = [];
    let match;

    // Legacy codes (&0-9, &a-f, &k, &l, &m, &n, &o, &r)
    if (settings.legacyEnabled) {
        const legacyPattern = /&([0-9a-fA-FkKlLmMnNoOrR])/g;

        while ((match = legacyPattern.exec(line)) !== null) {
            const code = match[1].toLowerCase();
            if (MINECRAFT_COLORS[code] && settings.legacyColors) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: false,
                    color: MINECRAFT_COLORS[code],
                });
            } else if (MINECRAFT_FORMATS[code] && settings.legacyFormatting) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: false,
                    format: MINECRAFT_FORMATS[code],
                });
            }
        }
    }

    // Legacy hex (&#RRGGBB)
    if (settings.legacyHexEnabled) {
        const hexPattern = /&#([0-9a-fA-F]{6})/g;
        while ((match = hexPattern.exec(line)) !== null) {
            matches.push({
                startIndex: match.index,
                matchLength: match[0].length,
                isClosingTag: false,
                isMiniMessage: false,
                color: `#${match[1]}`,
            });
        }
    }

    // MiniMessage
    if (settings.miniMessageEnabled) {
        // Gradients
        if (settings.miniMessageGradients) {
            const gradientPattern = /<gradient:(#[0-9a-fA-F]{6}(?::#[0-9a-fA-F]{6})+)>/gi;
            while ((match = gradientPattern.exec(line)) !== null) {
                const colors = match[1].split(':').map(c => c.toLowerCase());
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: true,
                    gradient: colors,
                });
            }

            const gradientClosePattern = /<\/gradient>/gi;
            while ((match = gradientClosePattern.exec(line)) !== null) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: true,
                    isMiniMessage: true,
                    gradient: [],
                });
            }
        }

        // MiniMessage hex colors (<#RRGGBB>)
        if (settings.miniMessageColors) {
            const miniHexPattern = /<#([0-9a-fA-F]{6})>/g;
            while ((match = miniHexPattern.exec(line)) !== null) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: true,
                    color: `#${match[1]}`,
                });
            }

            // Closing color tags (</#RRGGBB> or </color>)
            const miniHexClosePattern = /<\/(#[0-9a-fA-F]{6}|[a-z_]+)>/gi;
            while ((match = miniHexClosePattern.exec(line)) !== null) {
                const tagName = match[1].toLowerCase();
                // Skip if it's a format close tag (handled separately) or gradient
                if (MINIMESSAGE_FORMATS[tagName] || tagName === 'gradient') { continue; }

                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: true,
                    isMiniMessage: true,
                    color: 'close',
                });
            }
        }

        // MiniMessage named colors and formatting (<color>, <bold>, etc.)
        const miniMessagePattern = /<([a-z_]+)>/gi;
        while ((match = miniMessagePattern.exec(line)) !== null) {
            const tagName = match[1].toLowerCase();

            if (MINIMESSAGE_COLORS[tagName] && settings.miniMessageColors) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: true,
                    color: MINIMESSAGE_COLORS[tagName],
                });
            } else if (MINIMESSAGE_FORMATS[tagName] && settings.miniMessageFormatting) {
                matches.push({
                    startIndex: match.index,
                    matchLength: match[0].length,
                    isClosingTag: false,
                    isMiniMessage: true,
                    format: MINIMESSAGE_FORMATS[tagName],
                });
            }
        }

        // MiniMessage format closing tags (</bold>, </italic>, etc.)
        if (settings.miniMessageFormatting) {
            const formatClosePattern = /<\/([a-z_]+)>/gi;
            while ((match = formatClosePattern.exec(line)) !== null) {
                const tagName = match[1].toLowerCase();
                if (MINIMESSAGE_FORMATS[tagName]) {
                    matches.push({
                        startIndex: match.index,
                        matchLength: match[0].length,
                        isClosingTag: true,
                        isMiniMessage: true,
                        format: MINIMESSAGE_FORMATS[tagName],
                    });
                }
            }
        }
    }

    // Sort by start index
    matches.sort((a, b) => a.startIndex - b.startIndex);

    return matches;
}
