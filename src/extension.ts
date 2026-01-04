import * as vscode from 'vscode';
import { GradientRange, ParserSettings, SETTING_KEYS } from './constants';
import { getGradientColor } from './utils';
import {
    getDecorationKey,
    getOrCreateDecorationType,
    getDecorationTypes,
    clearAllDecorations,
    disposeAllDecorations,
    findAllMatches,
    generatePreviewDataUri
} from './core';

let enabled = true;
let previewMode = false;
let hideCodesDecorationType: vscode.TextEditorDecorationType | null = null;

function getSettings(): ParserSettings {
    const config = vscode.workspace.getConfiguration();
    const settings = {
        legacyEnabled: config.get<boolean>(SETTING_KEYS.LEGACY_ENABLED, true),
        legacyColors: config.get<boolean>(SETTING_KEYS.LEGACY_COLORS, true),
        legacyFormatting: config.get<boolean>(SETTING_KEYS.LEGACY_FORMATTING, true),
        legacyHexEnabled: config.get<boolean>(SETTING_KEYS.LEGACY_HEX_ENABLED, true),
        miniMessageEnabled: config.get<boolean>(SETTING_KEYS.MINIMESSAGE_ENABLED, true),
        miniMessageColors: config.get<boolean>(SETTING_KEYS.MINIMESSAGE_COLORS, true),
        miniMessageFormatting: config.get<boolean>(SETTING_KEYS.MINIMESSAGE_FORMATTING, true),
        miniMessageGradients: config.get<boolean>(SETTING_KEYS.MINIMESSAGE_GRADIENTS, true),
        customVariables: config.get<Record<string, string>>(SETTING_KEYS.CUSTOM_VARIABLES, {}),
        highlightInBackticks: config.get<boolean>(SETTING_KEYS.HIGHLIGHT_IN_BACKTICKS, true),
        stopAtTemplateExpressions: config.get<boolean>(SETTING_KEYS.STOP_AT_TEMPLATE_EXPR, false),
    };
    return settings;
}

function updateDecorations(editor: vscode.TextEditor) {
    if (!enabled) {
        clearAllDecorations(editor);
        return;
    }

    const settings = getSettings();
    const document = editor.document;
    const styleRanges: Map<string, vscode.Range[]> = new Map();
    const gradientRanges: GradientRange[] = [];

    // Helper to check if a position is inside backticks
    function isInsideBackticks(text: string, index: number): boolean {
        let insideBackticks = false;
        for (let i = 0; i < index; i++) {
            if (text[i] === '`') {
                insideBackticks = !insideBackticks;
            }
        }
        return insideBackticks;
    }

    for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
        const line = document.lineAt(lineNum);
        const text = line.text;
        const matches = findAllMatches(text, settings);

        if (matches.length === 0) { continue; }

        // Track current style state
        let currentColor: string | null = null;
        let colorStack: string[] = [];
        let currentGradient: { colors: string[]; startIndex: number } | null = null;
        let bold = false;
        let italic = false;
        let underline = false;
        let strikethrough = false;
        let obfuscated = false;

        // Process each segment between matches
        for (let i = 0; i < matches.length; i++) {
            const currentMatch = matches[i];
            const nextMatch = matches[i + 1];

            // Skip if inside backticks and setting is disabled
            if (!settings.highlightInBackticks && isInsideBackticks(text, currentMatch.startIndex)) {
                continue;
            }

            // Apply the current match to style state
            if (currentMatch.isClosingTag) {
                if (currentMatch.gradient !== undefined) {
                    // Close gradient - apply the gradient
                    if (currentGradient) {
                        gradientRanges.push({
                            startIndex: currentGradient.startIndex,
                            endIndex: currentMatch.startIndex,
                            colors: currentGradient.colors,
                            bold,
                            italic,
                            underline,
                            strikethrough,
                            obfuscated,
                        });
                        currentGradient = null;
                    }
                    // Pop color from stack if available
                    currentColor = colorStack.length > 0 ? colorStack.pop()! : null;
                } else if (currentMatch.color === 'close') {
                    // Pop from color stack
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
                    // Start gradient
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

            // Skip gradient content - will be handled separately
            if (currentGradient) { continue; }

            // Only create range if there's something to style
            if (currentColor || bold || italic || underline || strikethrough || obfuscated) {
                // For MiniMessage tags, start after the tag; for legacy, start at the tag
                const startPos = currentMatch.isMiniMessage
                    ? currentMatch.startIndex + currentMatch.matchLength
                    : currentMatch.startIndex;
                let endPos = nextMatch ? nextMatch.startIndex : text.length;

                // For legacy codes, check if we're inside a quoted string and stop at closing quote
                // Also stop at backticks and template expressions (act as color reset)
                if (!currentMatch.isMiniMessage && currentMatch.color) {
                    const quoteChars = ['"', "'"];
                    const afterCode = text.substring(startPos);

                    // Stop at backticks (template literal boundaries)
                    const nextBacktick = afterCode.indexOf('`');
                    if (nextBacktick !== -1) {
                        const absoluteBacktickPos = startPos + nextBacktick;
                        if (absoluteBacktickPos < endPos) {
                            endPos = absoluteBacktickPos;
                        }
                    }

                    // Stop at template expressions ${...} (only if setting enabled)
                    if (settings.stopAtTemplateExpressions) {
                        const nextTemplateExpr = afterCode.indexOf('${');
                        if (nextTemplateExpr !== -1) {
                            const absoluteTemplatePos = startPos + nextTemplateExpr;
                            if (absoluteTemplatePos < endPos) {
                                endPos = absoluteTemplatePos;
                            }
                        }
                    }

                    for (const quote of quoteChars) {
                        // Find opening quote before the color code
                        const beforeCode = text.substring(0, currentMatch.startIndex);
                        const lastOpenQuote = beforeCode.lastIndexOf(quote);

                        if (lastOpenQuote !== -1) {
                            // Check if there's no closing quote between open quote and color code
                            const betweenQuoteAndCode = text.substring(lastOpenQuote + 1, currentMatch.startIndex);
                            if (!betweenQuoteAndCode.includes(quote)) {
                                // We're inside a quoted string - find closing quote
                                const afterQuoteCode = text.substring(startPos);
                                const closingQuote = afterQuoteCode.indexOf(quote);
                                if (closingQuote !== -1) {
                                    const absoluteClosingPos = startPos + closingQuote;
                                    if (absoluteClosingPos < endPos) {
                                        endPos = absoluteClosingPos;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }

                if (endPos > startPos) {
                    const range = new vscode.Range(
                        new vscode.Position(lineNum, startPos),
                        new vscode.Position(lineNum, endPos)
                    );

                    const key = getDecorationKey(currentColor || '', bold, italic, underline, strikethrough, obfuscated);
                    if (!styleRanges.has(key)) {
                        styleRanges.set(key, []);
                    }
                    styleRanges.get(key)!.push(range);
                }
            }
        }

        // Handle unclosed gradients - auto-close at backtick or end of line
        if (currentGradient) {
            let gradEndIndex = text.length;

            // Check for backtick after gradient start
            const afterGradient = text.substring(currentGradient.startIndex);
            const backtickPos = afterGradient.indexOf('`');
            if (backtickPos !== -1) {
                gradEndIndex = currentGradient.startIndex + backtickPos;
            }

            gradientRanges.push({
                startIndex: currentGradient.startIndex,
                endIndex: gradEndIndex,
                colors: currentGradient.colors,
                bold,
                italic,
                underline,
                strikethrough,
                obfuscated,
            });
            currentGradient = null;
        }

        // Handle gradients for this line - with nested formatting support
        for (const grad of gradientRanges.filter(g => g.startIndex >= 0)) {
            const gradText = text.substring(grad.startIndex, grad.endIndex);

            // Find formatting tags inside the gradient
            const innerMatches = findAllMatches(gradText, settings);

            // Track formatting state within gradient
            let innerBold = grad.bold;
            let innerItalic = grad.italic;
            let innerUnderline = grad.underline;
            let innerStrikethrough = grad.strikethrough;
            let innerObfuscated = grad.obfuscated;

            // Build segments with their formatting
            interface GradientSegment {
                start: number;
                end: number;
                bold: boolean;
                italic: boolean;
                underline: boolean;
                strikethrough: boolean;
                obfuscated: boolean;
            }

            const segments: GradientSegment[] = [];
            let lastEnd = 0;

            for (const innerMatch of innerMatches) {
                // Add segment before this tag
                if (innerMatch.startIndex > lastEnd) {
                    segments.push({
                        start: lastEnd,
                        end: innerMatch.startIndex,
                        bold: innerBold,
                        italic: innerItalic,
                        underline: innerUnderline,
                        strikethrough: innerStrikethrough,
                        obfuscated: innerObfuscated,
                    });
                }

                // Update formatting state
                if (innerMatch.isClosingTag) {
                    if (innerMatch.format === 'bold') { innerBold = false; }
                    if (innerMatch.format === 'italic') { innerItalic = false; }
                    if (innerMatch.format === 'underline') { innerUnderline = false; }
                    if (innerMatch.format === 'strikethrough') { innerStrikethrough = false; }
                    if (innerMatch.format === 'obfuscated') { innerObfuscated = false; }
                } else {
                    if (innerMatch.format === 'bold') { innerBold = true; }
                    if (innerMatch.format === 'italic') { innerItalic = true; }
                    if (innerMatch.format === 'underline') { innerUnderline = true; }
                    if (innerMatch.format === 'strikethrough') { innerStrikethrough = true; }
                    if (innerMatch.format === 'obfuscated') { innerObfuscated = true; }
                }

                lastEnd = innerMatch.startIndex + innerMatch.matchLength;
            }

            // Add final segment
            if (lastEnd < gradText.length) {
                segments.push({
                    start: lastEnd,
                    end: gradText.length,
                    bold: innerBold,
                    italic: innerItalic,
                    underline: innerUnderline,
                    strikethrough: innerStrikethrough,
                    obfuscated: innerObfuscated,
                });
            }

            // If no inner tags, treat whole gradient as one segment
            if (segments.length === 0) {
                segments.push({
                    start: 0,
                    end: gradText.length,
                    bold: grad.bold,
                    italic: grad.italic,
                    underline: grad.underline,
                    strikethrough: grad.strikethrough,
                    obfuscated: grad.obfuscated,
                });
            }

            // Get visible characters (excluding tags) for gradient calculation
            let visibleText = '';
            for (const seg of segments) {
                visibleText += gradText.substring(seg.start, seg.end);
            }
            const visibleChars = [...visibleText];

            // Apply gradient colors to each segment
            let visibleCharIdx = 0;
            for (const seg of segments) {
                const segText = gradText.substring(seg.start, seg.end);
                const segChars = [...segText];

                for (let i = 0; i < segChars.length; i++) {
                    const charColor = getGradientColor(grad.colors, visibleCharIdx, visibleChars.length);
                    const charStart = grad.startIndex + seg.start + segChars.slice(0, i).join('').length;
                    const charEnd = charStart + segChars[i].length;

                    const range = new vscode.Range(
                        new vscode.Position(lineNum, charStart),
                        new vscode.Position(lineNum, charEnd)
                    );

                    const key = getDecorationKey(charColor, seg.bold, seg.italic, seg.underline, seg.strikethrough, seg.obfuscated);
                    if (!styleRanges.has(key)) {
                        styleRanges.set(key, []);
                    }
                    styleRanges.get(key)!.push(range);

                    visibleCharIdx++;
                }
            }
        }

        // Clear processed gradients
        gradientRanges.length = 0;
    }

    // Clear old decorations
    const decorationTypes = getDecorationTypes();
    decorationTypes.forEach((decorationType, key) => {
        if (!styleRanges.has(key)) {
            editor.setDecorations(decorationType, []);
        }
    });

    // Apply new decorations
    styleRanges.forEach((ranges, key) => {
        const style = JSON.parse(key);
        const decorationType = getOrCreateDecorationType(
            style.color || null,
            style.bold,
            style.italic,
            style.underline,
            style.strikethrough,
            style.obfuscated
        );
        editor.setDecorations(decorationType, ranges);
    });
}

function updateAllEditors() {
    vscode.window.visibleTextEditors.forEach(editor => {
        updateDecorations(editor);
    });
}

function applyPreviewMode(editor: vscode.TextEditor) {
    const settings = getSettings();
    const document = editor.document;
    const hideRanges: vscode.Range[] = [];

    // Create decoration type to hide text (make it invisible)
    if (!hideCodesDecorationType) {
        hideCodesDecorationType = vscode.window.createTextEditorDecorationType({
            letterSpacing: '-1em',
            opacity: '0',
            textDecoration: 'none; font-size: 0;',
        });
    }

    for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
        const line = document.lineAt(lineNum);
        const text = line.text;
        const matches = findAllMatches(text, settings);

        for (const match of matches) {
            // Hide the color code/tag itself
            const range = new vscode.Range(
                new vscode.Position(lineNum, match.startIndex),
                new vscode.Position(lineNum, match.startIndex + match.matchLength)
            );
            hideRanges.push(range);
        }
    }

    editor.setDecorations(hideCodesDecorationType, hideRanges);
}

function clearPreviewMode(editor: vscode.TextEditor) {
    if (hideCodesDecorationType) {
        editor.setDecorations(hideCodesDecorationType, []);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Minecraft Colors in Files is now active!');

    const toggleCommand = vscode.commands.registerCommand('minecraft-colors.toggle', () => {
        enabled = !enabled;
        vscode.window.showInformationMessage(
            `Minecraft color highlighting ${enabled ? 'enabled' : 'disabled'}`
        );
        if (!enabled) {
            vscode.window.visibleTextEditors.forEach(editor => {
                clearAllDecorations(editor);
            });
        } else {
            updateAllEditors();
        }
    });

    // Preview mode command - hides color codes while held
    const previewModeCommand = vscode.commands.registerCommand('minecraft-colors.previewMode', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !enabled) { return; }

        previewMode = !previewMode;

        if (previewMode) {
            applyPreviewMode(editor);
            vscode.window.showInformationMessage('Preview mode: ON (color codes hidden)');
        } else {
            clearPreviewMode(editor);
            vscode.window.showInformationMessage('Preview mode: OFF');
        }
    });

    const changeEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations(editor);
        }
    });

    const changeDocument = vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations(editor);
        }
    });

    // Listen for settings changes
    const changeSettings = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('minecraftColors')) {
            updateAllEditors();
        }
    });

    // Hover provider to show preview of selected text
    const hoverProvider = vscode.languages.registerHoverProvider('*', {
        provideHover(document, position) {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !enabled) {
                return null;
            }

            const selection = editor.selection;
            if (selection.isEmpty) {
                return null;
            }

            // Check if cursor is within the selection
            if (!selection.contains(position)) {
                return null;
            }

            const selectedText = document.getText(selection);
            if (!selectedText) {
                return null;
            }

            const settings = getSettings();
            const imageUri = generatePreviewDataUri(selectedText, settings);

            if (!imageUri) {
                return null;
            }

            const markdown = new vscode.MarkdownString();
            markdown.isTrusted = true;
            markdown.appendMarkdown('**Preview:**\n\n');
            markdown.appendMarkdown(`![preview](${imageUri})`);

            return new vscode.Hover(markdown, selection);
        }
    });

    context.subscriptions.push(toggleCommand, previewModeCommand, changeEditor, changeDocument, changeSettings, hoverProvider);

    updateAllEditors();
}

export function deactivate() {
    disposeAllDecorations();
}
