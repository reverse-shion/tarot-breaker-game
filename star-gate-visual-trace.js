/* Read-only visual telemetry. Loaded only with ?dev=star-gate-full&gateAudit=1.
 * Do not infer a screenshot match from computed style snapshots. */
(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (query.get('dev') !== 'star-gate-full' || query.get('gateAudit') !== '1' ||
      query.getAll('dev').length !== 1) return;
  const shell = document.getElementById('game-shell');
  if (!shell) return;

  const records = [];
  const captured = new Set();
  const cssProperties = [
    'display', 'visibility', 'opacity', 'mixBlendMode', 'isolation', 'filter',
    'background', 'backgroundColor', 'backgroundImage', 'zIndex', 'clipPath',
    'overflow', 'transform', 'animationName', 'animationPlayState',
    'transition', 'objectFit', 'width', 'height', 'pointerEvents'
  ];

  function styleOf(element, pseudo) {
    if (!element) return { exists: false };
    const style = getComputedStyle(element, pseudo || null);
    const rectangle = element.getBoundingClientRect();
    const values = {};
    for (const property of cssProperties) values[property] = style[property];
    const result = {
      exists: true,
      tag: element.tagName.toLowerCase(),
      classes: typeof element.className === 'string' ? element.className : '',
      inlineStyle: element.getAttribute('style') || '',
      rect: { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height },
      computed: values
    };
    if (element instanceof HTMLImageElement) {
      result.asset = {
        src: element.currentSrc || element.src, complete: element.complete,
        naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight
      };
    }
    if (pseudo) result.pseudo = pseudo;
    return result;
  }

  function declarationSources(element) {
    if (!element) return [];
    const matched = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (_error) { continue; }
      if (!rules) continue;
      const sheetName = sheet.href || '[inline stylesheet]';
      function inspect(list, condition) {
        for (const rule of list) {
          if (rule.cssRules) {
            if (rule.constructor?.name === 'CSSMediaRule' &&
                !matchMedia(rule.conditionText).matches) continue;
            inspect(rule.cssRules, rule.conditionText || condition);
            continue;
          }
          if (!rule.selectorText || !rule.style) continue;
          const declarations = {};
          for (const prop of ['opacity', 'mix-blend-mode', 'visibility',
                               'display', 'filter', 'background', 'background-color',
                               'isolation', 'z-index', 'clip-path']) {
            const value = rule.style.getPropertyValue(prop);
            if (value) declarations[prop] = value +
              (rule.style.getPropertyPriority(prop) ? ' !important' : '');
          }
          if (!Object.keys(declarations).length) continue;
          let isMatch = false;
          try { isMatch = element.matches(rule.selectorText); } catch (_error) {}
          if (isMatch) matched.push({
            sheet: sheetName, selector: rule.selectorText, condition, declarations
          });
        }
      }
      inspect(rules, '');
    }
    return matched;
  }

  function capture(label) {
    if (label !== 'manual' && captured.has(label)) return;
    if (label !== 'manual') captured.add(label);
    const inner = shell.querySelector('.scene-gate-inner-light');
    const innerImage = inner?.querySelector('img');
    const gate = shell.querySelector('.scene-star-gate');
    const energy = shell.querySelector('.scene-dark-energy-rise');
    const data = {
      label, at: new Date().toISOString(),
      reference: 'ceb7f64c50d426ba975f5f1e4a825935db3d8a2b',
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      documentVisibility: document.visibilityState,
      shell: { className: shell.className, gateState: shell.dataset.gateState },
      state: {
        stage3: window.TarotStarGateAnomaly?.getState?.().phase || null,
        aftermath: window.TarotStarGateAftermath?.getState?.().state || null
      },
      elements: {
        innerParent: styleOf(inner),
        innerImage: styleOf(innerImage),
        innerBefore: styleOf(inner, '::before'),
        innerAfter: styleOf(inner, '::after'),
        gateParent: styleOf(gate),
        normalGate: styleOf(gate?.querySelector('.scene-star-gate-normal')),
        anomalyGate: styleOf(gate?.querySelector('.scene-star-gate-anomaly')),
        darkEnergyParent: styleOf(energy),
        darkEnergy01: styleOf(energy?.querySelector('.sga-dark-energy-frame')),
        darkEnergy04: styleOf(energy?.querySelector('.sga-dark-energy-frame-fourth')),
        celestialParent: styleOf(shell.querySelector('.scene-celestial-gate-light'))
      },
      matchingCss: { innerParent: declarationSources(inner), innerImage: declarationSources(innerImage) },
      limitation: 'Computed style is not pixel comparison. Match to author LEFT/RIGHT screenshots requires visual review.'
    };
    records.push(data);
    if (records.length > 12) records.shift();
    if (counter) counter.textContent = '星門記録 ' + records.length;
    if (output && !panel.hidden) output.value = JSON.stringify({ records }, null, 2);
    return data;
  }

  function afterPaint(label) {
    requestAnimationFrame(() => requestAnimationFrame(() => capture(label)));
  }

  const panel = document.createElement('aside');
  panel.id = 'gate-visual-trace';
  panel.style.cssText = 'position:fixed;right:6px;top:6px;width:min(94vw,420px);max-height:80vh;' +
    'overflow:auto;z-index:30000;background:rgba(8,12,25,.97);border:1px solid #c6b7e7;' +
    'padding:8px;color:white;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-sizing:border-box;';
  const counter = document.createElement('button');
  counter.textContent = '星門記録 0';
  counter.type = 'button';
  counter.style.cssText = 'background:#26324b;color:white;border:1px solid #a1b0cc;' +
    'border-radius:5px;padding:5px 8px;min-height:30px;';
  const details = document.createElement('section');
  details.hidden = true;
  const explanation = document.createElement('p');
  explanation.textContent = '表示状態の記録専用。見た目の一致判定は行いません。';
  const manual = document.createElement('button');
  manual.type = 'button'; manual.textContent = '今の画面を記録';
  const copy = document.createElement('button');
  copy.type = 'button'; copy.textContent = 'JSONをコピー';
  const output = document.createElement('textarea');
  output.readOnly = true;
  output.rows = 13;
  output.setAttribute('aria-label', '星門Computed Style監査記録');
  output.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin-top:8px;' +
    'font:11px/1.3 monospace;color:#111;background:#fff;';
  details.append(explanation, manual, copy, output);
  panel.append(counter, details);
  document.body.append(panel);
  Object.defineProperty(panel, 'hidden', { get() { return details.hidden; } });
  counter.addEventListener('click', () => {
    details.hidden = !details.hidden;
    if (!details.hidden) output.value = JSON.stringify({ records }, null, 2);
  });
  manual.addEventListener('click', () => capture('manual'));
  copy.addEventListener('click', async () => {
    const value = JSON.stringify({ records }, null, 2);
    output.value = value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      copy.textContent = 'コピー済み';
    } catch (_error) {
      output.focus(); output.select();
      copy.textContent = '文字を選択しました（コピーしてください）';
    }
  });

  const observer = new MutationObserver(() => {
    if (!shell.classList.contains('sga-anomaly-rest') ||
        shell.classList.contains('sga-future-world-hidden') ||
        captured.has('corrupted_pre_black')) return;
    setTimeout(() => {
      if (shell.classList.contains('sga-anomaly-rest') &&
          !shell.classList.contains('sga-future-world-hidden')) {
        afterPaint('corrupted_pre_black');
      }
    }, 800);
  });
  observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('tarot-breaker:stage3-session-ended', () => afterPaint('present_return'));
  let freeControlCount = 0;
  window.addEventListener('tarot-breaker:aftermath-state', event => {
    if (event.detail?.name === 'CHECK_COMPANIONS' && freeControlCount < 3) {
      freeControlCount += 1; afterPaint('free_control_' + freeControlCount);
    }
    if (event.detail?.name === 'COMPLETED') afterPaint('aftermath_completed');
  });
  window.addEventListener('tarot-breaker:aftermath-ended', event => {
    if (event.detail?.cancelled) afterPaint('aftermath_cancelled');
  });
  afterPaint('normal');
  window.TarotGateVisualTrace = Object.freeze({
    capture, getReports: () => JSON.parse(JSON.stringify(records)),
    show: () => { details.hidden = false; output.value = JSON.stringify({ records }, null, 2); }
  });
})();
