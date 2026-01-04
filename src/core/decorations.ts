import * as vscode from 'vscode';

const decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

export function getDecorationKey(
    color: string,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    obfuscated: boolean
): string {
    return JSON.stringify({ color, bold, italic, underline, strikethrough, obfuscated });
}

export function getOrCreateDecorationType(
    color: string | null,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    obfuscated: boolean
): vscode.TextEditorDecorationType {
    const key = getDecorationKey(color || '', bold, italic, underline, strikethrough, obfuscated);

    if (!decorationTypes.has(key)) {
        const options: vscode.DecorationRenderOptions = {};

        if (color) {
            options.color = color;
        }
        if (bold) {
            options.fontWeight = 'bold';
        }
        if (italic) {
            options.fontStyle = 'italic';
        }
        if (underline && strikethrough) {
            options.textDecoration = 'underline line-through';
        } else if (underline) {
            options.textDecoration = 'underline';
        } else if (strikethrough) {
            options.textDecoration = 'line-through';
        }

        const decorationType = vscode.window.createTextEditorDecorationType(options);
        decorationTypes.set(key, decorationType);
    }

    return decorationTypes.get(key)!;
}

export function clearDecoration(editor: vscode.TextEditor, key: string): void {
    const decorationType = decorationTypes.get(key);
    if (decorationType) {
        editor.setDecorations(decorationType, []);
    }
}

export function clearAllDecorations(editor: vscode.TextEditor): void {
    decorationTypes.forEach((decorationType) => {
        editor.setDecorations(decorationType, []);
    });
}

export function getDecorationTypes(): Map<string, vscode.TextEditorDecorationType> {
    return decorationTypes;
}

export function disposeAllDecorations(): void {
    decorationTypes.forEach(decorationType => {
        decorationType.dispose();
    });
    decorationTypes.clear();
}
