/*
 * ReSlides front-end script (versión app web)
 *
 * Esta versión:
 *  - Analiza un guion de texto y lo convierte en un arreglo de diapositivas.
 *  - Genera una presentación HTML con estilo similar a la plantilla original.
 *  - Genera páginas HTML para las gráficas (grafica1.html, grafica2.html, ...).
 *  - Permite vista previa de la presentación dentro del sitio y abrirla en otra pestaña.
 *  - Ofrece descargas en HTML, PPTX (usando PptxGenJS) y ZIP (HTML + gráficas + README).
 */

/* ===========================
   Configuración de temas y fuentes
   =========================== */

const THEMES = {
  default: {
    name: 'Azul y dorado',
    primary: '#1B365D',
    secondary: '#2C5282',
    accent: '#D4AF37',
    background: '#F7FAFC',
    text: '#1A202C',
  },
  purpura: {
    name: 'Púrpura',
    primary: '#4C1D95',
    secondary: '#6D28D9',
    accent: '#FBBF24',
    background: '#F5F3FF',
    text: '#111827',
  },
  verde: {
    name: 'Verde',
    primary: '#166534',
    secondary: '#047857',
    accent: '#F59E0B',
    background: '#ECFDF5',
    text: '#064E3B',
  },
};

const FONTS = {
  default: {
    heading: "'Sorts Mill Goudy', serif",
    body: "'Oranienbaum', serif",
  },
  moderna: {
    heading: "'Coda', sans-serif",
    body: "'Unna', serif",
  },
};

// Utilidad: convertir color #RRGGBB a formato usado típicamente por PptxGenJS ("RRGGBB")
function toPptxColor(hex) {
  if (!hex) return '000000';
  return hex.replace('#', '').toUpperCase();
}

/* ===========================
   Parseo del guion
   =========================== */

function parseScript(raw) {
  const slides = [];
  const lines = raw.split(/\r?\n/);
  let current = null;

  function startNewSlide() {
    if (current) slides.push(current);
    current = {
      title: '',
      content: [],
      graph: null,
      description: '',
      attachments: [],
    };
  }

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^Diapositiva\s+\d+/i.test(line)) {
      startNewSlide();
      continue;
    }

    if (/^(Título|Titulo):/i.test(line)) {
      if (!current) startNewSlide();
      current.title = line.replace(/^(Título|Titulo):/i, '').trim();
      continue;
    }

    if (/^(Contenido|Contexto):/i.test(line)) {
      if (!current) startNewSlide();
      const text = line.replace(/^(Contenido|Contexto):/i, '').trim();
      if (text) {
        text
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((t) => current.content.push(t));
      }
      continue;
    }

    if (/^Datos:/i.test(line)) {
      if (!current) startNewSlide();
      const graph = { labels: [], values: [] };
      const rest = line.replace(/^Datos:/i, '').trim();
      const parts = rest.split(';');
      parts.forEach((sec) => {
        const s = sec.trim();
        if (!s) return;
        if (/^(labels?|etiquetas?):/i.test(s)) {
          const labelStr = s.replace(/^(labels?|etiquetas?):/i, '').trim();
          graph.labels = labelStr
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
        } else if (/^(valores?|values?):/i.test(s)) {
          const valStr = s.replace(/^(valores?|values?):/i, '').trim();
          graph.values = valStr
            .split(',')
            .map((x) => parseFloat(x.trim()))
            .filter((v) => !isNaN(v));
        }
      });
      current.graph = graph;
      continue;
    }

    if (/^(Descripción|Descripcion):/i.test(line)) {
      if (!current) startNewSlide();
      current.description = line
        .replace(/^(Descripción|Descripcion):/i, '')
        .trim();
      continue;
    }

    if (/^Adjunto:/i.test(line)) {
      if (!current) startNewSlide();
      const rest = line.replace(/^Adjunto:/i, '').trim();
      if (rest) {
        current.attachments.push(
          ...rest.split(',').map((s) => s.trim()).filter(Boolean)
        );
      }
      continue;
    }

    // Cualquier otra línea se considera contenido adicional (posibles puntos separados por ;)
    if (!current) startNewSlide();
    line
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((t) => current.content.push(t));
  }

  if (current) slides.push(current);
  return slides;
}

/* ===========================
   Generación de HTML de gráficas independientes
   =========================== */

function generateGraphHtml(slide, index, theme, fonts) {
  const labelsJson = JSON.stringify(slide.graph?.labels || []);
  const valuesJson = JSON.stringify(slide.graph?.values || []);
  const esc = (str) =>
    String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Gráfica ${index} - ${esc(slide.title)}</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: ${fonts.body};
      background: ${theme.background};
      color: ${theme.text};
    }
    #chart {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      var labels = ${labelsJson};
      var values = ${valuesJson};
      var data = [{
        x: labels,
        y: values,
        type: 'bar',
        marker: { color: '${theme.accent}' }
      }];
      var layout = {
        title: '${esc(slide.title)}',
        paper_bgcolor: '${theme.background}',
        plot_bgcolor: '${theme.background}',
        font: { family: ${JSON.stringify(fonts.body)}, color: '${theme.text}' },
        margin: { t: 60, r: 30, b: 50, l: 50 }
      };
      Plotly.newPlot('chart', data, layout, {responsive: true});
    });
  </script>
</body>
</html>`;
  return html;
}

/* ===========================
   Generación de la presentación HTML principal
   =========================== */

function generatePresentation(slides, graphFiles, theme, fonts) {
  const esc = (str) =>
    String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  let slideHtml = '';
  let graphIdx = 0;
  const graphConfigs = [];

  slides.forEach((slide, index) => {
    const isFirst = index === 0;
    if (isFirst) {
      // Portada
      slideHtml += `
<div class="ppt-slide flex flex-col justify-center items-center text-center" style="background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary}); color: #FFFFFF;">
  <div class="max-w-3xl px-6">
    <p class="text-sm mb-2 opacity-80" style="font-family: ${fonts.body};">Presentación generada con ReSlides</p>
    <h1 class="text-4xl md:text-5xl font-bold mb-4" style="font-family: ${fonts.heading};">${esc(slide.title || 'Título de la presentación')}</h1>
    ${
      slide.content[0]
        ? `<p class="text-lg md:text-xl mb-6" style="font-family: ${fonts.body};">${esc(slide.content[0])}</p>`
        : ''
    }
    <div class="text-sm opacity-80" style="font-family: ${fonts.body};">
      <span>${new Date().toLocaleDateString('es-MX')}</span>
    </div>
  </div>
</div>`;
    } else {
      const hasGraph = slide.graph && slide.graph.labels && slide.graph.labels.length && slide.graph.values && slide.graph.values.length;
      slideHtml += `
<div class="ppt-slide flex flex-col md:flex-row" style="background:${theme.background}; color:${theme.text};">
  <div class="flex-1 p-8 flex flex-col">
    <h2 class="text-2xl md:text-3xl font-semibold mb-4" style="color:${theme.primary}; font-family:${fonts.heading};">${esc(slide.title || 'Diapositiva ' + (index + 1))}</h2>`;

      if (slide.content && slide.content.length) {
        slideHtml += `
    <div class="space-y-2 text-lg leading-relaxed" style="font-family:${fonts.body};">`;
        slide.content.forEach((p) => {
          slideHtml += `
      <p>• ${esc(p)}</p>`;
        });
        slideHtml += `
    </div>`;
      }

      if (slide.description) {
        slideHtml += `
    <p class="mt-4 text-sm opacity-80" style="font-family:${fonts.body};">${esc(slide.description)}</p>`;
      }

      slideHtml += `
  </div>`;

      if (hasGraph) {
        const graphContainerId = `graph-main-${graphIdx + 1}`;
        const graphFile = graphFiles[graphIdx] || null;
        graphConfigs.push({
          id: graphContainerId,
          labels: slide.graph.labels,
          values: slide.graph.values,
          title: slide.title || `Gráfica ${graphIdx + 1}`,
        });
        slideHtml += `
  <div class="w-full md:w-[40%] border-l border-slate-200 bg-white/70 flex flex-col">
    <div class="p-4 border-b border-slate-200">
      <p class="text-xs font-semibold uppercase tracking-wide" style="font-family:${fonts.body}; color:${theme.primary};">Gráfica</p>
      <p class="text-sm" style="font-family:${fonts.body};">${esc(slide.title || '')}</p>
    </div>
    <div class="flex-1 p-3">
      <div id="${graphContainerId}" class="w-full h-48 md:h-full bg-slate-100 rounded-lg"></div>
    </div>
    ${
      graphFile
        ? `<div class="px-4 py-3 border-t border-slate-200 bg-slate-50">
      <p class="text-[11px] text-slate-500 mb-1" style="font-family:${fonts.body};">Vista previa en página separada:</p>
      <a href="${esc(graphFile)}" target="_blank" class="inline-flex items-center gap-1 text-[11px] underline" style="color:${theme.primary};">
        <span>Abrir gráfica ${graphIdx + 1}</span>
        <i class="fas fa-external-link-alt text-[10px]"></i>
      </a>
    </div>`
        : ''
    }
  </div>`;
        graphIdx += 1;
      }

      slideHtml += `
</div>`;
    }
  });

  const graphConfigsJson = JSON.stringify(graphConfigs);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Presentación generada con ReSlides</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Coda&family=Oranienbaum&family=Sorts+Mill+Goudy&family=Unna&display=swap" rel="stylesheet" />
  <style>
    body {
      margin: 0;
      background: ${theme.background};
      color: ${theme.text};
    }
    .ppt-slide {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <main class="w-full min-h-screen bg-slate-100">
    ${slideHtml}
  </main>
  <script>
    (function () {
      var graphs = ${graphConfigsJson};
      if (!Array.isArray(graphs)) return;
      graphs.forEach(function (cfg) {
        var el = document.getElementById(cfg.id);
        if (!el) return;
        var data = [{
          x: cfg.labels,
          y: cfg.values,
          type: 'bar',
          marker: { color: '${theme.accent}' }
        }];
        var layout = {
          title: cfg.title,
          paper_bgcolor: '${theme.background}',
          plot_bgcolor: '#FFFFFF',
          font: { family: ${JSON.stringify(fonts.body)}, color: '${theme.text}' },
          margin: { t: 40, r: 20, b: 40, l: 40 }
        };
        Plotly.newPlot(el, data, layout, {responsive: true});
      });
    })();
  </script>
</body>
</html>`;
  return html;
}

/* ===========================
   README sencillo
   =========================== */

function generateReadme(slides) {
  const totalSlides = slides.length;
  const graphs = slides.filter(
    (s) => s.graph && s.graph.labels && s.graph.labels.length && s.graph.values && s.graph.values.length
  ).length;
  return [
    '# ReSlides - Presentación generada',
    '',
    `- Diapositivas: ${totalSlides}`,
    `- Diapositivas con gráficas: ${graphs}`,
    '',
    'Archivos incluidos:',
    '- `presentacion.html`: presentación principal con estilo y gráficas integradas.',
    '- `graficaN.html`: páginas individuales para cada gráfica (si aplica).',
    '',
    'Este paquete fue generado automáticamente a partir de un guion en la app web ReSlides.',
    '',
  ].join('\n');
}

/* ===========================
   Generación de PPTX con PptxGenJS
   =========================== */

function generatePptx(slides, theme, fonts) {
  if (typeof PptxGenJS === 'undefined') {
    alert('No se encontró la librería PptxGenJS. Verifica el script en index.html.');
    return;
  }
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  slides.forEach((slide, index) => {
    const s = pres.addSlide();
    const isFirst = index === 0;

    if (isFirst) {
      s.background = { color: toPptxColor(theme.primary) };
      s.addText(slide.title || 'Título de la presentación', {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 1,
        fontSize: 36,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        fontFace: fonts.heading,
      });
      if (slide.content && slide.content[0]) {
        s.addText(slide.content[0], {
          x: 1,
          y: 2.2,
          w: 8,
          h: 1.5,
          fontSize: 20,
          color: 'FFFFFF',
          align: 'center',
          fontFace: fonts.body,
        });
      }
      s.addText(new Date().toLocaleDateString('es-MX'), {
        x: 0.5,
        y: 4.0,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        fontFace: fonts.body,
      });
      return;
    }

    // Título
    s.addText(slide.title || 'Diapositiva ' + (index + 1), {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: toPptxColor(theme.primary),
      fontFace: fonts.heading,
    });

    const hasGraph =
      slide.graph &&
      slide.graph.labels &&
      slide.graph.labels.length &&
      slide.graph.values &&
      slide.graph.values.length;

    // Contenido
    if (slide.content && slide.content.length) {
      const text = slide.content.map((t) => '• ' + t).join('\n');
      s.addText(text, {
        x: 0.7,
        y: 1.3,
        w: hasGraph ? 4.5 : 8.5,
        h: 3,
        fontSize: 16,
        color: toPptxColor(theme.text),
        fontFace: fonts.body,
      });
    }

    if (slide.description) {
      s.addText(slide.description, {
        x: 0.7,
        y: hasGraph ? 4.6 : 4.0,
        w: hasGraph ? 4.5 : 8.5,
        h: 1,
        fontSize: 12,
        color: toPptxColor(theme.text),
        fontFace: fonts.body,
      });
    }

    if (hasGraph) {
      const data = [
        {
          name: 'Serie',
          labels: slide.graph.labels,
          values: slide.graph.values,
        },
      ];
      s.addChart(pres.ChartType.bar, data, {
        x: 5.4,
        y: 1.3,
        w: 4.3,
        h: 3.3,
        chartTitle: slide.title || 'Gráfica',
      });
    }
  });

  pres.writeFile({ fileName: 'ReSlides-presentacion.pptx' });
}

/* ===========================
   Manejo de la interfaz
   =========================== */

let lastState = {
  slides: null,
  themeKey: 'default',
  fontKey: 'default',
  presentationBlobUrl: null,
  presentationHtml: null,
};

function setupReSlides() {
  const form = document.getElementById('chat-form');
  const historyEl = document.getElementById('history');
  const scriptInput = document.getElementById('script-input');
  const themeSelect = document.getElementById('theme-select');
  const fontSelect = document.getElementById('font-select');
  const clearBtn = document.getElementById('clear-btn');

  const previewSection = document.getElementById('preview-section');
  const previewFrame = document.getElementById('preview-frame');
  const openNewTabLink = document.getElementById('open-new-tab-link');

  const downloadsSection = document.getElementById('downloads-section');
  const downloadHtmlLink = document.getElementById('download-html');
  const downloadPptxBtn = document.getElementById('download-pptx');
  const downloadZipBtn = document.getElementById('download-zip');

  if (!form || !scriptInput) return;

  clearBtn?.addEventListener('click', function () {
    historyEl.innerHTML = '';
    scriptInput.value = '';
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const rawScript = scriptInput.value.trim();
    if (!rawScript) {
      alert('Escribe un guion de presentación antes de generar.');
      return;
    }

    // Añadir mensaje del usuario al historial
    const userMsg = document.createElement('div');
    userMsg.className = 'bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs';
    userMsg.innerHTML =
      "<p class='font-semibold mb-1 text-[#1B365D]'>Tú:</p>" +
      "<pre class='whitespace-pre-wrap font-mono text-[11px]'>" +
      rawScript.replace(/</g, '&lt;') +
      '</pre>';
    historyEl.appendChild(userMsg);

    // Parsear guion
    const slides = parseScript(rawScript);
    if (!slides.length) {
      const errMsg = document.createElement('div');
      errMsg.className = 'bg-red-50 text-red-700 rounded-xl p-3 border border-red-200 text-xs mt-2';
      errMsg.textContent =
        'No se detectaron diapositivas. Asegúrate de usar el formato "Diapositiva N" y campos como "Título:" y "Contenido:".';
      historyEl.appendChild(errMsg);
      return;
    }

    // Tema y fuentes seleccionados
    const themeKey = themeSelect?.value || 'default';
    const fontKey = fontSelect?.value || 'default';
    const theme = THEMES[themeKey] || THEMES.default;
    const fonts = FONTS[fontKey] || FONTS.default;

    // Construir archivos de gráficas (para incluir en ZIP y enlazar desde la presentación)
    const graphFiles = [];
    let graphIndex = 1;
    slides.forEach((slide) => {
      const hasGraph =
        slide.graph &&
        slide.graph.labels &&
        slide.graph.labels.length &&
        slide.graph.values &&
        slide.graph.values.length;
      if (!hasGraph) return;
      const filename = `grafica${graphIndex}.html`;
      const html = generateGraphHtml(slide, graphIndex, theme, fonts);
      graphFiles.push({ filename, html });
      graphIndex += 1;
    });

    // Generar presentación HTML principal
    const presentationHtml = generatePresentation(
      slides,
      graphFiles.map((g) => g.filename),
      theme,
      fonts
    );

    // Preparar blob y URL para vista previa y descarga HTML
    if (lastState.presentationBlobUrl) {
      URL.revokeObjectURL(lastState.presentationBlobUrl);
    }
    const blob = new Blob([presentationHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    lastState = {
      slides,
      themeKey,
      fontKey,
      presentationBlobUrl: blobUrl,
      presentationHtml,
      graphFiles,
    };

    // Vista previa en iframe
    if (previewFrame) {
      previewFrame.src = blobUrl;
      previewSection?.classList.remove('hidden');
    }
    if (openNewTabLink) {
      openNewTabLink.href = blobUrl;
      openNewTabLink.classList.remove('hidden');
    }

    // Configurar enlace de descarga HTML
    if (downloadHtmlLink) {
      downloadHtmlLink.href = blobUrl;
      downloadHtmlLink.setAttribute('download', 'presentacion.html');
    }

    // Mostrar sección de descargas
    downloadsSection?.classList.remove('hidden');

    // Mensaje del sistema en historial
    const botMsg = document.createElement('div');
    botMsg.className = 'bg-white rounded-xl p-3 border border-slate-200 text-xs';
    botMsg.innerHTML =
      "<p class='font-semibold mb-1 text-[#1B365D]'>ReSlides:</p>" +
      "<p class='text-[11px] text-slate-700'>Presentación generada con éxito. Usa la vista previa de la derecha o descarga los archivos en los formatos disponibles.</p>";
    historyEl.appendChild(botMsg);

    // Desplazar hacia abajo el historial
    historyEl.scrollTop = historyEl.scrollHeight;
  });

  // Descargar PPTX usando el último estado
  if (downloadPptxBtn) {
    downloadPptxBtn.addEventListener('click', function () {
      if (!lastState.slides || !lastState.slides.length) {
        alert('Primero genera una presentación antes de descargar el PPTX.');
        return;
      }
      const theme = THEMES[lastState.themeKey] || THEMES.default;
      const fonts = FONTS[lastState.fontKey] || FONTS.default;
      generatePptx(lastState.slides, theme, fonts);
    });
  }

  // Descargar ZIP con presentacion.html + gráficas + README
  if (downloadZipBtn) {
    downloadZipBtn.addEventListener('click', function () {
      if (!lastState.slides || !lastState.slides.length) {
        alert('Primero genera una presentación antes de descargar el ZIP.');
        return;
      }
      if (typeof JSZip === 'undefined') {
        alert('No se encontró JSZip. Verifica el script en index.html.');
        return;
      }
      const theme = THEMES[lastState.themeKey] || THEMES.default;
      const fonts = FONTS[lastState.fontKey] || FONTS.default;

      const zip = new JSZip();
      // Añadir presentación principal
      zip.file('presentacion.html', lastState.presentationHtml || '');
      // Añadir gráficas
      (lastState.graphFiles || []).forEach((g) => {
        zip.file(g.filename, g.html);
      });
      // README
      const readme = generateReadme(lastState.slides);
      zip.file('README.md', readme);

      zip.generateAsync({ type: 'blob' }).then(function (zipBlob) {
        if (typeof saveAs === 'function') {
          saveAs(zipBlob, 'reslides_paquete.zip');
        } else {
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reslides_paquete.zip';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      });
    });
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReSlides);
} else {
  setupReSlides();
}
