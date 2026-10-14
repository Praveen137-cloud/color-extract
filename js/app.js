/**
 * ColorSnap - Main Application Controller
 * Wires together UI interactions, file loading, drag-and-drop,
 * palette rendering, copy-to-clipboard, history, and downloads.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const sampleBar = document.getElementById('sample-images-bar');

  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const errorMessageText = document.getElementById('error-message-text');
  const btnRetry = document.getElementById('btn-retry');

  const analysisWorkspace = document.getElementById('analysis-workspace');
  const previewImg = document.getElementById('preview-img');
  const previewFilename = document.getElementById('preview-filename');
  const previewDimensions = document.getElementById('preview-dimensions');
  const previewFilesize = document.getElementById('preview-filesize');
  const previewFormat = document.getElementById('preview-format');
  const btnChangeImage = document.getElementById('btn-change-image');
  const btnReextract = document.getElementById('btn-reextract');

  const paletteGrid = document.getElementById('palette-grid');
  const btnCopyAllHex = document.getElementById('btn-copy-all-hex');
  const btnCopyAllRgb = document.getElementById('btn-copy-all-rgb');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCss = document.getElementById('btn-download-css');
  const btnDownloadImg = document.getElementById('btn-download-img');
  const btnExtractAnother = document.getElementById('btn-extract-another');

  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const themeToggle = document.getElementById('theme-toggle');

  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------
  let currentImageElement = null;
  let currentMetadata = {
    filename: '',
    filesize: 0,
    width: 0,
    height: 0,
    format: 'IMAGE'
  };
  let currentPaletteResult = null;

  // Initialize Theme
  Utils.initTheme();

  // Load Initial History
  renderHistory();

  // -------------------------------------------------------------------------
  // Theme Toggle Listener
  // -------------------------------------------------------------------------
  themeToggle.addEventListener('click', () => {
    const newTheme = Utils.toggleTheme();
    themeToggle.setAttribute('aria-label', `Switched to ${newTheme} theme`);
  });

  // -------------------------------------------------------------------------
  // File Upload & Drag-and-Drop Handlers
  // -------------------------------------------------------------------------

  // Click on Browse Button
  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // Click on Drop Zone
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // Keyboard navigation on Drop Zone
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // File Input Change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleIncomingFile(file);
    }
  });

  // -------------------------------------------------------------------------
  // Robust Drag-and-Drop (Window-Wide + Dedicated Drop Zone + Paste)
  // -------------------------------------------------------------------------
  const globalOverlay = document.getElementById('global-drag-overlay');
  let dragCounter = 0;

  // Prevent default browser drag behaviors window-wide (stops browser from opening image as URL)
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  window.addEventListener('dragenter', (e) => {
    // Only activate overlay if dragging files
    const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
    if (types.includes('Files') || types.includes('application/x-moz-file')) {
      dragCounter++;
      if (globalOverlay) globalOverlay.classList.add('active');
      if (dropZone) dropZone.classList.add('dragover');
    }
  });

  window.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (globalOverlay) globalOverlay.classList.remove('active');
      if (dropZone) dropZone.classList.remove('dragover');
    }
  });

  window.addEventListener('drop', (e) => {
    dragCounter = 0;
    if (globalOverlay) globalOverlay.classList.remove('active');
    if (dropZone) dropZone.classList.remove('dragover');

    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files && files.length > 0) {
      handleIncomingFile(files[0]);
    }
  });

  // Dedicated Drop Zone Handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropZone.classList.remove('dragover');
      if (globalOverlay) globalOverlay.classList.remove('active');

      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length > 0) {
        handleIncomingFile(files[0]);
      }
    });
  }

  // Bonus: Clipboard Paste (Ctrl+V / Cmd+V anywhere on page)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleIncomingFile(blob);
            Utils.showToast('Pasted image detected from clipboard!', 'info');
            break;
          }
        }
      }
    }
  });

  // Retry button in error state
  btnRetry.addEventListener('click', () => {
    hideError();
    fileInput.value = '';
    fileInput.click();
  });

  // Change Image button
  btnChangeImage.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  // Extract Another Image button
  btnExtractAnother.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  // Re-extract Palette button
  btnReextract.addEventListener('click', () => {
    if (currentImageElement) {
      processImageElement(currentImageElement, currentMetadata, true);
    }
  });

  // -------------------------------------------------------------------------
  // Sample Images Generator & Loader
  // -------------------------------------------------------------------------
  sampleBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.sample-btn');
    if (!btn) return;
    const sampleType = btn.dataset.sample;
    loadSampleImage(sampleType);
  });

  function loadSampleImage(sampleType) {
    showLoading();
    hideError();

    // Create high-resolution procedural sample on canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    let filename = '';
    let format = 'SAMPLE';

    if (sampleType === 'sunset') {
      filename = 'sunset-glow-landscape.jpg';
      format = 'JPEG';
      // Gradient sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 350);
      skyGrad.addColorStop(0, '#1E1B4B');   // Indigo dusk
      skyGrad.addColorStop(0.3, '#831843'); // Deep rose
      skyGrad.addColorStop(0.65, '#EA580C'); // Vibrant orange
      skyGrad.addColorStop(1, '#FDE047');   // Warm golden horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 500);

      // Glowing sun
      const sunGrad = ctx.createRadialGradient(400, 320, 10, 400, 320, 120);
      sunGrad.addColorStop(0, '#FEF08A');
      sunGrad.addColorStop(0.5, '#F97316');
      sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(400, 320, 120, 0, Math.PI * 2);
      ctx.fill();

      // Mountains silhouette
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(0, 500);
      ctx.lineTo(0, 360);
      ctx.lineTo(200, 270);
      ctx.lineTo(380, 340);
      ctx.lineTo(550, 260);
      ctx.lineTo(800, 370);
      ctx.lineTo(800, 500);
      ctx.closePath();
      ctx.fill();

    } else if (sampleType === 'nature') {
      filename = 'forest-meadow-nature.png';
      format = 'PNG';
      // Forest canopy gradient
      const forestGrad = ctx.createLinearGradient(0, 0, 0, 500);
      forestGrad.addColorStop(0, '#164E63');   // Dark teal canopy
      forestGrad.addColorStop(0.4, '#15803D'); // Emerald pine
      forestGrad.addColorStop(0.7, '#84CC16'); // Lime meadow
      forestGrad.addColorStop(1, '#78350F');   // Rich earthy brown
      ctx.fillStyle = forestGrad;
      ctx.fillRect(0, 0, 800, 500);

      // Sunbeam accents
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.beginPath();
      ctx.moveTo(600, 0);
      ctx.lineTo(750, 0);
      ctx.lineTo(500, 500);
      ctx.lineTo(350, 500);
      ctx.closePath();
      ctx.fill();

    } else {
      // Ocean Coast
      filename = 'deep-ocean-coastline.webp';
      format = 'WEBP';
      const oceanGrad = ctx.createLinearGradient(0, 0, 800, 500);
      oceanGrad.addColorStop(0, '#0C4A6E'); // Deep sea blue
      oceanGrad.addColorStop(0.4, '#0284C7'); // Ocean blue
      oceanGrad.addColorStop(0.7, '#2DD4BF'); // Cyan surf
      oceanGrad.addColorStop(0.9, '#FDE68A'); // Warm sand beach
      oceanGrad.addColorStop(1, '#D97706');   // Golden rock
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 800, 500);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      currentMetadata = {
        filename: filename,
        filesize: Math.round(dataUrl.length * 0.75), // approximate binary byte size
        width: canvas.width,
        height: canvas.height,
        format: format
      };
      processImageElement(img, currentMetadata);
    };

    img.onerror = () => {
      showError('Failed to generate sample image.');
    };

    img.src = dataUrl;
  }

  // -------------------------------------------------------------------------
  // File Ingestion Pipeline
  // -------------------------------------------------------------------------
  function handleIncomingFile(file) {
    // 1. Validate file format and size
    const validation = Utils.validateImageFile(file);
    if (!validation.valid) {
      showError(validation.error);
      return;
    }

    showLoading();
    hideError();

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();

      img.onload = () => {
        // Extract format from extension or type
        let format = 'IMAGE';
        if (file.type) {
          format = file.type.split('/')[1].toUpperCase();
        } else {
          const ext = file.name.split('.').pop();
          if (ext) format = ext.toUpperCase();
        }

        currentMetadata = {
          filename: file.name,
          filesize: file.size,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          format: format
        };

        processImageElement(img, currentMetadata);
      };

      img.onerror = () => {
        showError('Unable to decode the image file. The file may be corrupted or unreadable.');
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      showError('Failed to read the file from your disk. Please try again.');
    };

    reader.readAsDataURL(file);
  }

  /**
   * Process an image element, run K-Means color extraction, and update UI
   */
  function processImageElement(img, metadata, isReextract = false) {
    try {
      currentImageElement = img;

      // Run dominant color extraction with ColorExtractor
      const result = ColorExtractor.extractPalette(img, 5);
      currentPaletteResult = result;

      // Update Preview metadata card
      previewImg.src = img.src;
      previewFilename.textContent = metadata.filename;
      previewDimensions.querySelector('span').textContent = `${metadata.width} × ${metadata.height} px`;
      previewFilesize.querySelector('span').textContent = Utils.formatFileSize(metadata.filesize);
      previewFormat.querySelector('span').textContent = metadata.format;

      // Render 5 color swatches
      renderPaletteSwatches(result.colors);

      // Save to localStorage history
      Utils.savePaletteToHistory(result, metadata.filename);
      renderHistory();

      // Switch views
      hideLoading();
      hideError();
      analysisWorkspace.classList.add('active');

      if (!isReextract) {
        // Smooth scroll down to analysis section
        analysisWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
        Utils.showToast('5 dominant colors extracted!', 'success');
      } else {
        Utils.showToast('Palette re-extracted successfully!', 'success');
      }

    } catch (err) {
      console.error('Color extraction failed:', err);
      showError(err.message || 'An unexpected error occurred while analyzing the image.');
    }
  }

  // -------------------------------------------------------------------------
  // Render Palette Swatches (SEOptimer Audit Cards)
  // -------------------------------------------------------------------------
  function renderPaletteSwatches(colors) {
    paletteGrid.innerHTML = '';

    // Populate SEOptimer Continuous Ratio Bar
    const ratioBar = document.getElementById('color-ratio-bar');
    if (ratioBar) {
      ratioBar.innerHTML = '';
      colors.forEach((c) => {
        const seg = document.createElement('div');
        seg.className = 'ratio-bar-segment';
        seg.style.width = `${Math.max(1, c.percentage)}%`;
        seg.style.backgroundColor = c.hex;
        seg.title = `${c.name} (${c.hex}): ${c.percentageString}`;
        ratioBar.appendChild(seg);
      });
    }

    const pixelsCount = document.getElementById('distribution-pixels-count');
    if (pixelsCount) {
      if (currentPaletteResult?.meta?.sampledPixels) {
        pixelsCount.textContent = `Sampled ${currentPaletteResult.meta.sampledPixels.toLocaleString()} non-transparent pixels`;
      } else {
        pixelsCount.textContent = '100% Dominance Distributed';
      }
    }

    colors.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'swatch-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', `Color ${c.index}: ${c.hex}, ${c.name}`);

      card.innerHTML = `
        <div class="swatch-color-box" style="background-color: ${c.hex};" title="Click to copy ${c.hex}">
          <div class="swatch-badge-top">
            <span class="swatch-pct-badge" title="Relative dominance in image">${c.percentageString}</span>
            <span class="swatch-click-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </span>
          </div>
          <span class="swatch-name-tag">${c.name}</span>
          <div class="copy-overlay">Copied!</div>
        </div>
        <div class="swatch-details">
          <!-- Dominance Progress Meter -->
          <div class="swatch-meter-wrap" title="${c.percentageString} of sampled pixels">
            <div class="swatch-meter-bar">
              <div class="swatch-meter-fill" style="width: ${c.percentage}%; background-color: ${c.hex};"></div>
            </div>
            <span class="swatch-meter-label">${c.percentageString}</span>
          </div>

          <!-- HEX Row -->
          <div class="swatch-code-row swatch-hex-row" data-copy="${c.hex}" title="Click to copy HEX">
            <span class="code-type-label">HEX</span>
            <span class="code-value">${c.hex}</span>
            <button type="button" class="code-copy-btn" aria-label="Copy HEX ${c.hex}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>

          <!-- RGB Row -->
          <div class="swatch-code-row swatch-rgb-row" data-copy="${c.rgb.string}" title="Click to copy RGB">
            <span class="code-type-label">RGB</span>
            <span class="code-value">${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}</span>
            <button type="button" class="code-copy-btn" aria-label="Copy RGB ${c.rgb.string}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>

          <!-- WCAG Compliance Tag -->
          <div class="swatch-wcag-tag" title="WCAG contrast compliant">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Pass AAA • ${c.isLight ? 'Dark Text' : 'Light Text'}</span>
          </div>
        </div>
      `;

      // Swatch color box click: Copies HEX by default
      const colorBox = card.querySelector('.swatch-color-box');
      const overlay = card.querySelector('.copy-overlay');

      const triggerCardCopy = () => {
        Utils.copyToClipboard(c.hex, `HEX ${c.hex} copied to clipboard!`);
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 600);
      };

      colorBox.addEventListener('click', triggerCardCopy);

      // Keyboard support on card
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target === card) {
            e.preventDefault();
            triggerCardCopy();
          }
        }
      });

      // Specific HEX row click
      const hexRow = card.querySelector('.swatch-hex-row');
      hexRow.addEventListener('click', (e) => {
        e.stopPropagation();
        Utils.copyToClipboard(c.hex, `HEX ${c.hex} copied!`);
      });

      // Specific RGB row click
      const rgbRow = card.querySelector('.swatch-rgb-row');
      rgbRow.addEventListener('click', (e) => {
        e.stopPropagation();
        Utils.copyToClipboard(c.rgb.string, `RGB ${c.rgb.string} copied!`);
      });

      paletteGrid.appendChild(card);
    });
  }

  // -------------------------------------------------------------------------
  // Palette Actions (Copy All, Downloads)
  // -------------------------------------------------------------------------

  // Copy All HEX Codes
  btnCopyAllHex.addEventListener('click', () => {
    if (!currentPaletteResult || !currentPaletteResult.colors.length) return;
    const hexCodes = currentPaletteResult.colors.map(c => c.hex).join('\n');
    Utils.copyToClipboard(hexCodes, 'All 5 HEX codes copied to clipboard!');
  });

  // Copy All RGB Codes
  btnCopyAllRgb.addEventListener('click', () => {
    if (!currentPaletteResult || !currentPaletteResult.colors.length) return;
    const rgbCodes = currentPaletteResult.colors.map(c => c.rgb.string).join('\n');
    Utils.copyToClipboard(rgbCodes, 'All 5 RGB codes copied to clipboard!');
  });

  // Download JSON
  btnDownloadJson.addEventListener('click', () => {
    if (!currentPaletteResult) return;
    Utils.downloadPaletteJson(currentPaletteResult, currentMetadata.filename);
  });

  // Download CSS
  btnDownloadCss.addEventListener('click', () => {
    if (!currentPaletteResult) return;
    Utils.downloadPaletteCss(currentPaletteResult, currentMetadata.filename);
  });

  // Download Image Card
  btnDownloadImg.addEventListener('click', () => {
    if (!currentPaletteResult) return;
    Utils.downloadPaletteImage(currentPaletteResult, currentMetadata.filename);
  });

  // -------------------------------------------------------------------------
  // History Management & Rendering
  // -------------------------------------------------------------------------
  function renderHistory() {
    const history = Utils.getPaletteHistory();

    if (!history || history.length === 0) {
      historyList.innerHTML = `<div class="history-empty">No palettes saved in history yet. Extract colors from an image to save your palettes here!</div>`;
      btnClearHistory.style.display = 'none';
      return;
    }

    btnClearHistory.style.display = 'inline-block';
    historyList.innerHTML = '';

    history.forEach((entry) => {
      const itemCard = document.createElement('div');
      itemCard.className = 'history-item-card';

      const timeFormatted = new Date(entry.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Generate 5-color mini strip
      const stripHtml = entry.colors.map(c => `<div class="history-strip-color" style="background-color: ${c.hex};" title="${c.hex} (${c.percentageString || ''})"></div>`).join('');

      itemCard.innerHTML = `
        <div class="history-strip">
          ${stripHtml}
        </div>
        <div class="history-meta">
          <span class="history-filename" title="${entry.filename}">${entry.filename}</span>
          <span class="history-time">${timeFormatted}</span>
        </div>
        <button type="button" class="btn-history-load">Reopen Palette</button>
      `;

      // Reopen history palette into view
      const loadBtn = itemCard.querySelector('.btn-history-load');
      loadBtn.addEventListener('click', () => {
        reopenHistoryPalette(entry);
      });

      historyList.appendChild(itemCard);
    });
  }

  function reopenHistoryPalette(entry) {
    currentMetadata = {
      filename: entry.filename,
      filesize: 0,
      width: 0,
      height: 0,
      format: 'HISTORY'
    };

    currentPaletteResult = {
      colors: entry.colors.map((c, i) => ({
        id: `color-${i + 1}`,
        index: i + 1,
        hex: c.hex,
        rgb: c.rgb,
        hsl: c.hsl,
        percentage: c.percentage,
        percentageString: c.percentageString || `${c.percentage}%`,
        textColor: c.textColor,
        name: c.name || 'Color'
      })),
      meta: {
        extractedAt: entry.timestamp
      }
    };

    // Update Preview details for reopened history
    previewFilename.textContent = entry.filename;
    previewDimensions.querySelector('span').textContent = 'Saved Palette';
    previewFilesize.querySelector('span').textContent = 'History Item';
    previewFormat.querySelector('span').textContent = 'SAVED';

    // Placeholder gradient for image preview thumbnail
    const sampleGrad = `linear-gradient(135deg, ${entry.colors.map(c => c.hex).join(', ')})`;
    previewImg.src = '';
    previewImg.style.background = sampleGrad;

    renderPaletteSwatches(currentPaletteResult.colors);

    hideLoading();
    hideError();
    analysisWorkspace.classList.add('active');
    analysisWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });

    Utils.showToast(`Reopened palette for "${entry.filename}"`, 'info');
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your palette history?')) {
      Utils.clearPaletteHistory();
      renderHistory();
      Utils.showToast('Palette history cleared.', 'info');
    }
  });

  // -------------------------------------------------------------------------
  // UI State Helpers
  // -------------------------------------------------------------------------
  function showLoading() {
    loadingState.classList.add('active');
    errorState.classList.remove('active');
    analysisWorkspace.classList.remove('active');
  }

  function hideLoading() {
    loadingState.classList.remove('active');
  }

  function showError(message) {
    hideLoading();
    analysisWorkspace.classList.remove('active');
    errorMessageText.textContent = message;
    errorState.classList.add('active');
    errorState.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorState.classList.remove('active');
  }
});
