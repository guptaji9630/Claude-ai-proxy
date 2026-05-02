/**
 * Detects which backend API a model belongs to
 * Returns 'claude' if model starts with 'claude-'
 * Returns 'nim' for all other models (vendor/* format)
 */
export function detectBackend(model: string): 'claude' | 'nim' {
  if (!model) {
    return 'nim'; // Default to NIM if no model specified
  }

  const lowerModel = model.toLowerCase();

  // Claude models start with 'claude-'
  if (lowerModel.startsWith('claude-')) {
    return 'claude';
  }

  // Everything else is treated as NIM (meta/, mistralai/, google/, etc.)
  return 'nim';
}

/**
 * Validates that a model name is in the expected format
 * Claude models: claude-<name>
 * NIM models: <vendor>/<model> where vendor is a known vendor or recognized pattern
 */
export function validateModelName(model: string): boolean {
  if (!model || typeof model !== 'string') {
    return false;
  }

  // Claude: must be 'claude-' followed by alphanumeric, dots, and hyphens
  if (model.startsWith('claude-')) {
    return /^claude-[a-z0-9\-\.]+$/.test(model.toLowerCase());
  }

  // NIM: must be 'vendor/model' format
  if (model.includes('/')) {
    const parts = model.split('/');
    if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
      return false;
    }
    
    const [vendor, modelName] = parts;
    
    // Vendor should be lowercase alphanumeric with hyphens/dots (meta, mistralai, deepseek-ai, etc)
    const vendorRegex = /^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/i;
    if (!vendorRegex.test(vendor)) {
      return false;
    }
    
    // Model name should also follow naming convention (alphanumeric with hyphens/dots/numbers)
    // but NOT be a single word without hyphens (like just "model")
    const modelRegex = /^[a-z0-9]+([a-z0-9\-\.]*[a-z0-9])?$/i;
    return modelRegex.test(modelName);
  }

  // Both formats should have a clear separator (- or /)
  return false;
}
