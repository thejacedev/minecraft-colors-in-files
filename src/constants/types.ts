export interface StyleMatch {
    startIndex: number;
    matchLength: number;
    isClosingTag: boolean;
    isMiniMessage: boolean;
    color?: string;
    format?: string;
    gradient?: string[];
}

export interface GradientRange {
    startIndex: number;
    endIndex: number;
    colors: string[];
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    obfuscated: boolean;
}

export interface StyleState {
    color: string | null;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    obfuscated: boolean;
}
