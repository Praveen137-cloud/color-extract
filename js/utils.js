/**
 * ColorSnap - Utility Functions
 * Clipboard, Toasts, File Validation, Downloads, and Storage
 */

const Utils = (() => {
  'use strict';

  // Constants
  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const STORAGE_HISTORY_KEY = 'colorsnap_palette_history';
  const STORAGE_THEME_KEY = 'colorsnap_theme';

  /**
   * Format bytes into human-readable string (KB, MB)
   */
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  /**
   * Validate uploaded image file
   */
  function validateImageFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected. Please choose an image file.' };
    }

    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const hasValidType = ALLOWED_MIME_TYPES.includes(file.type);

    if (!hasValidType && !hasValidExt) {
      return {
        valid: false,
        error: `Unsupported file format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large (${formatFileSize(file.size)}). Maximum supported size is 15 MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Toast notification manager
   */
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  function showToast(message, type = 'success', duration = 3000) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Icon based on type
    let iconSvg = '';
    if (type === 'success' || type === 'copied') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-show');
    });

    const timer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    toast.dataset.timer = timer;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    if (toast.dataset.timer) clearTimeout(Number(toast.dataset.timer));

    toast.classList.remove('toast-show');
    toast.classList.add('toast-exit');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Copy text to clipboard with graceful fallbacks
   */
  async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    let succeeded = false;

    // Method 1: Modern navigator.clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        succeeded = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, attempting execCommand fallback:', err);
      }
    }

    // Method 2: execCommand('copy') fallback
    if (!succeeded) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('execCommand fallback failed:', err);
      }
    }

    if (succeeded) {
      showToast(successMessage, 'copied');
      return true;
    } else {
      // Method 3: Prompt fallback if clipboard is entirely blocked by browser permissions
      promptClipboardFallback(text);
      return false;
    }
  }

  /**
   * Display a selectable text modal if clipboard access is blocked
   */
  function promptClipboardFallback(text) {
    const overlay = document.createElement('div');
    overlay.className = 'clipboard-modal-overlay';
    overlay.innerHTML = `
      <div class="clipboard-modal" role="dialog" aria-modal="true" aria-labelledby="cb-modal-title">
        <h3 id="cb-modal-title">Manual Copy</h3>
        <p>Clipboard access is restricted in this environment. Select and copy below (Ctrl+C or Cmd+C):</p>
        <textarea readonly class="clipboard-fallback-input" rows="4">${escapeHtml(text)}</textarea>
        <div class="clipboard-modal-actions">
          <button class="btn btn-primary" id="cb-modal-close">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const textarea = overlay.querySelector('textarea');
    textarea.focus();
    textarea.select();

    const closeBtn = overlay.querySelector('#cb-modal-close');
    const close = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /**
   * Download a text or blob payload to client device
   */
  function triggerFileDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  /**
   * Download Palette as JSON
   */
  function downloadPaletteJson(paletteResult, originalFilename) {
    const baseName = (originalFilename || 'colorsnap-palette').replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-palette.json`;

    const exportData = {
      generator: 'ColorSnap - Image to Color Palette Extractor',
      sourceImage: originalFilename || 'unknown',
      extractedAt: paletteResult.meta?.extractedAt || new Date().toISOString(),
      colorCount: paletteResult.colors.length,
      palette: paletteResult.colors.map(c => ({
        index: c.index,
        name: c.name,
        hex: c.hex,
        rgb: c.rgb.string,
        hsl: c.hsl.string,
        percentage: c.percentage,
        percentageString: c.percentageString
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    triggerFileDownload(jsonString, filename, 'application/json');
    showToast(`Palette downloaded as ${filename}`, 'success');
  }

  /**
   * Download Palette as CSS custom properties
   */
  function downloadPaletteCss(paletteResult, originalFilename) {
    const baseName = (originalFilename || 'colorsnap-palette').replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-palette.css`;

    const lines = [];
    lines.push('/**');
    lines.push(' * ColorSnap – Extracted Color Palette');
    lines.push(` * Source Image: ${originalFilename || 'Uploaded Image'}`);
    lines.push(` * Extracted: ${new Date().toLocaleString()}`);
    lines.push(' */');
    lines.push('');
    lines.push(':root {');

    paletteResult.colors.forEach((c) => {
      lines.push(`  --color-${c.index}: ${c.hex}; /* ${c.percentageString} - ${c.name} | ${c.rgb.string} */`);
    });

    lines.push('}');
    lines.push('');

    // Also add helper utility classes
    lines.push('/* Helper utility classes */');
    paletteResult.colors.forEach((c) => {
      lines.push(`.bg-color-${c.index} { background-color: var(--color-${c.index}); color: ${c.textColor}; }`);
      lines.push(`.text-color-${c.index} { color: var(--color-${c.index}); }`);
    });

    const cssContent = lines.join('\n');
    triggerFileDownload(cssContent, filename, 'text/css');
    showToast(`CSS palette downloaded as ${filename}`, 'success');
  }

  /**
   * Generate and download a visual Palette Card image (PNG)
   */
  function downloadPaletteImage(paletteResult, originalFilename) {
    const baseName = (originalFilename || 'colorsnap-palette').replace(/\.[^/.]+$/, '');
    const filename = `${baseName}-palette.png`;

    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 630; // standard social share / design ratio
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Header title
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    ctx.fillText('ColorSnap Palette', 60, 80);

    // Subtitle
    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px Inter, system-ui, sans-serif';
    const sub = `${originalFilename || 'Custom Image'} • 5 Dominant Colors`;
    ctx.fillText(sub, 60, 115);

    // Draw 5 color swatches
    const margin = 60;
    const availableWidth = width - margin * 2;
    const swatchSpacing = 16;
    const totalSpacing = swatchSpacing * (paletteResult.colors.length - 1);
    const swatchWidth = (availableWidth - totalSpacing) / paletteResult.colors.length;
    const swatchHeight = 360;
    const swatchY = 150;

    paletteResult.colors.forEach((c, i) => {
      const x = margin + i * (swatchWidth + swatchSpacing);
      const radius = 16;

      // Draw rounded rectangle for swatch
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, swatchY, swatchWidth, swatchHeight, radius);
      ctx.fillStyle = c.hex;
      ctx.fill();
      ctx.restore();

      // Card bottom overlay for text
      const infoBoxHeight = 110;
      const infoBoxY = swatchY + swatchHeight - infoBoxHeight;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, infoBoxY, swatchWidth, infoBoxHeight, [0, 0, radius, radius]);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.restore();

      // Color info inside card
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Inter, monospace, sans-serif';
      ctx.fillText(c.hex, x + 16, infoBoxY + 36);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText(c.percentageString, x + 16, infoBoxY + 64);
      ctx.fillText(c.name, x + 16, infoBoxY + 88);
    });

    // Footer branding
    ctx.fillStyle = '#64748B';
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillText('Generated with ColorSnap • Image to Color Palette Extractor', 60, 580);

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Failed to generate palette image', 'error');
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast(`Palette image saved as ${filename}`, 'success');
    }, 'image/png');
  }

  /**
   * Local Storage Palette History Manager (Keeps last 5)
   */
  function getPaletteHistory() {
    try {
      const data = localStorage.getItem(STORAGE_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to read palette history from localStorage:', e);
      return [];
    }
  }

  function savePaletteToHistory(paletteResult, filename) {
    try {
      let history = getPaletteHistory();
      const newEntry = {
        id: 'hist_' + Date.now(),
        timestamp: new Date().toISOString(),
        filename: filename || 'Untitled Image',
        colors: paletteResult.colors.map(c => ({
          hex: c.hex,
          rgb: c.rgb,
          hsl: c.hsl,
          percentage: c.percentage,
          percentageString: c.percentageString,
          textColor: c.textColor,
          name: c.name
        }))
      };

      // Add to front, remove duplicates if matching all 5 hexes
      const newHexSignature = newEntry.colors.map(c => c.hex).join(',');
      history = history.filter(item => {
        const itemHexSignature = item.colors.map(c => c.hex).join(',');
        return itemHexSignature !== newHexSignature;
      });

      history.unshift(newEntry);

      // Keep only last 5 items
      if (history.length > 5) {
        history = history.slice(0, 5);
      }

      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
      return history;
    } catch (e) {
      console.warn('Failed to save palette to localStorage:', e);
      return [];
    }
  }

  function clearPaletteHistory() {
    try {
      localStorage.removeItem(STORAGE_HISTORY_KEY);
    } catch (e) {
      console.warn('Failed to clear palette history:', e);
    }
  }

  /**
   * Theme Management (Light / Dark)
   */
  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    } catch (e) {
      console.warn(e);
    }

    if (!savedTheme) {
      // Check system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }

    applyTheme(savedTheme);
    return savedTheme;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch (e) {
      console.warn(e);
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    return newTheme;
  }

  return {
    formatFileSize,
    validateImageFile,
    showToast,
    copyToClipboard,
    promptClipboardFallback,
    downloadPaletteJson,
    downloadPaletteCss,
    downloadPaletteImage,
    getPaletteHistory,
    savePaletteToHistory,
    clearPaletteHistory,
    initTheme,
    applyTheme,
    toggleTheme
  };
})();

// Export for module/testing environments if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
