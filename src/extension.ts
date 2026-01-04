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
                const endPos = nextMatch ? nextMatch.startIndex : text.length;

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

        // Handle gradients for this line
        for (const grad of gradientRanges.filter(g => g.startIndex >= 0)) {
            const gradText = text.substring(grad.startIndex, grad.endIndex);
            const chars = [...gradText]; // Handle unicode properly

            for (let charIdx = 0; charIdx < chars.length; charIdx++) {
                const charColor = getGradientColor(grad.colors, charIdx, chars.length);
                const charStart = grad.startIndex + chars.slice(0, charIdx).join('').length;
                const charEnd = charStart + chars[charIdx].length;

                const range = new vscode.Range(
                    new vscode.Position(lineNum, charStart),
                    new vscode.Position(lineNum, charEnd)
                );

                const key = getDecorationKey(charColor, grad.bold, grad.italic, grad.underline, grad.strikethrough, grad.obfuscated);
                if (!styleRanges.has(key)) {
                    styleRanges.set(key, []);
                }
                styleRanges.get(key)!.push(range);
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

    context.subscriptions.push(toggleCommand, changeEditor, changeDocument, changeSettings, hoverProvider);

    updateAllEditors();
}

export function deactivate() {
    disposeAllDecorations();
}
