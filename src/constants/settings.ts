export const SETTING_KEYS = {
    LEGACY_ENABLED: 'minecraftColors.legacy.enabled',
    LEGACY_COLORS: 'minecraftColors.legacy.colors',
    LEGACY_FORMATTING: 'minecraftColors.legacy.formatting',
    LEGACY_HEX_ENABLED: 'minecraftColors.legacyHex.enabled',
    MINIMESSAGE_ENABLED: 'minecraftColors.miniMessage.enabled',
    MINIMESSAGE_COLORS: 'minecraftColors.miniMessage.colors',
    MINIMESSAGE_FORMATTING: 'minecraftColors.miniMessage.formatting',
    MINIMESSAGE_GRADIENTS: 'minecraftColors.miniMessage.gradients',
} as const;

export interface ParserSettings {
    legacyEnabled: boolean;
    legacyColors: boolean;
    legacyFormatting: boolean;
    legacyHexEnabled: boolean;
    miniMessageEnabled: boolean;
    miniMessageColors: boolean;
    miniMessageFormatting: boolean;
    miniMessageGradients: boolean;
}

export const DEFAULT_SETTINGS: ParserSettings = {
    legacyEnabled: true,
    legacyColors: true,
    legacyFormatting: true,
    legacyHexEnabled: true,
    miniMessageEnabled: true,
    miniMessageColors: true,
    miniMessageFormatting: true,
    miniMessageGradients: true,
};
