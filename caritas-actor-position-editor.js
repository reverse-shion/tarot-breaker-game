/* Opt-in portrait controls for the A02 battle preview. */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('editor') !== 'actors' || params.get('camera') !== 'a02' ||
      params.get('dev') !== 'hoshisuna') return;

  const storageKey = 'tb.caritas.actor-editor.a02.v2';
  const names = ['shion', 'shioriel'];
  const fields = [
    { key: 'scale', label: '大きさ', min: 50, max: 160, step: 1 },
    { key: 'x', label: '左右位置', min: 0.85, max: 1.75, step: 0.005 },
    { key: 'y', label: '足元の高さ', min: 0, max: 35, step: 0.5 }
  ];
  const [, horizontal, vertical] = fields;

  function bounded(value, { min, max, step }) {
    const snapped = min + Math.round((value - min) / step) * step;
    return Number(Math.max(min, Math.min(max, snapped)).toFixed(3));
  }

  function readSharedLayout() {
    const value = params.get('layout');
    if (!value) return null;
    const parts = value.split(',');
    if (parts.length !== names.length * fields.length ||
        parts.some(part => !/^\d+(?:\.\d+)?$/.test(part) || !Number.isFinite(Number(part)))) return null;
    return Object.fromEntries(names.map((name, index) => [name, Object.fromEntries(
      fields.map(({ key }, offset) => [key, Number(parts[index * fields.length + offset])])
    )]));
  }

  function mount() {
    const root = document.querySelector('#caritas-event[data-camera-layout="a02"]');
    const frame = root?.querySelector('.cb-frame');
    if (!frame) return;

    const arena = frame.querySelector('.cb-arena');
    const commands = frame.querySelector('.cb-controls');
    const actors = {
      shion: arena.querySelector('.cb-battle-world > .cb-shion-sprite'),
      shioriel: arena.querySelector('.cb-battle-world > .cb-angel')
    };
    const defaults = Object.fromEntries(names.map(name => {
      const style = getComputedStyle(actors[name]);
      return [name, {
        scale: Math.round(Number(style.getPropertyValue('--cb-portrait-scale') || 1) * 100),
        x: Number(style.getPropertyValue('--cb-portrait-x')),
        y: Number(style.getPropertyValue('--cb-portrait-y'))
      }];
    }));
    const shared = readSharedLayout();
    let local;
    try { local = JSON.parse(localStorage.getItem(storageKey)); } catch (_) {}
    const saved = shared || local;
    const settings = Object.fromEntries(names.map(name => [name, { ...defaults[name] }]));
    for (const name of names) {
      for (const field of fields) {
        const value = saved?.[name]?.[field.key];
        if (Number.isFinite(value)) settings[name][field.key] = bounded(value, field);
      }
    }

    let selected = 'shion';
    let drag = null;
    const bar = document.createElement('div');
    bar.className = 'cb-aeditor-bar';
    bar.innerHTML = `
      <button type="button" class="cb-aeditor-toggle" aria-controls="cb-aeditor-panel">立ち絵を調整</button>
      <section id="cb-aeditor-panel" class="cb-aeditor-panel" aria-label="立ち絵エディタ">
        <div class="cb-aeditor-head"><strong>立ち絵エディタ</strong><button type="button" data-action="hide">閉じる</button></div>
        <div class="cb-aeditor-tabs">
          <button type="button" data-actor="shion">シオン</button>
          <button type="button" data-actor="shioriel">シオリエル</button>
        </div>
        <div class="cb-aeditor-fields"></div>
        <div class="cb-aeditor-actions">
          <button type="button" data-action="reset">2人を初期配置に戻す</button>
          <button type="button" data-action="copy">調整リンクをコピー</button>
        </div>
        <input type="url" class="cb-aeditor-link" aria-label="調整リンク" readonly hidden>
        <p class="cb-aeditor-message" role="status">立ち絵を指で動かせます。変更はこのブラウザに保存されます。</p>
      </section>`;
    frame.append(bar);

    const panel = bar.querySelector('.cb-aeditor-panel');
    const toggle = bar.querySelector('.cb-aeditor-toggle');
    const tabs = panel.querySelectorAll('[data-actor]');
    const status = panel.querySelector('[role="status"]');
    const shareInput = panel.querySelector('.cb-aeditor-link');
    const controls = panel.querySelector('.cb-aeditor-fields');
    const inputs = {};

    for (const field of fields) {
      const { key, label, min, max, step } = field;
      const row = document.createElement('div');
      row.className = 'cb-aeditor-field';
      const title = document.createElement('label');
      const input = document.createElement('input');
      const output = document.createElement('output');
      input.id = 'cb-aeditor-' + key;
      input.type = 'range';
      title.htmlFor = input.id;
      title.textContent = label;
      input.min = min;
      input.max = max;
      input.step = step;
      row.append(title, output, input);
      controls.append(row);
      inputs[key] = { input, output };
      input.addEventListener('input', () => {
        settings[selected][key] = Number(input.value);
        update();
        save();
      });
    }

    function update() {
      for (const name of names) {
        const { scale, x, y } = settings[name];
        const actor = actors[name];
        actor.style.setProperty('--cb-portrait-scale', String(scale / 100));
        actor.style.setProperty('--cb-portrait-x', String(x));
        actor.style.setProperty('--cb-portrait-y', String(y));
        actor.dataset.actorEditorSelect = String(name === selected);
      }
      for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.actor === selected));
      for (const { key } of fields) {
        const value = settings[selected][key];
        const { input, output } = inputs[key];
        input.value = value;
        output.value = (key === 'x' ? Math.round((value - 0.8) * 1000) / 10 : value) + '%';
      }
    }

    function save() {
      shareInput.hidden = true;
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
        const current = new URL(location.href);
        if (current.searchParams.has('layout')) {
          current.searchParams.delete('layout');
          history.replaceState(history.state, '', current);
        }
      } catch (_) {
        status.textContent = 'このブラウザに保存できません。調整リンクをコピーして控えてください。';
      }
    }

    function setOpen(open) {
      root.dataset.actorEditorOpen = String(open);
      panel.hidden = !open;
      toggle.hidden = open;
      toggle.setAttribute('aria-expanded', String(open));
      commands.inert = open;
    }

    for (const tab of tabs) {
      tab.addEventListener('click', () => { selected = tab.dataset.actor; update(); });
    }
    toggle.addEventListener('click', () => {
      setOpen(true);
      panel.querySelector('[data-action="hide"]').focus();
    });
    panel.querySelector('[data-action="hide"]').addEventListener('click', () => {
      setOpen(false);
      toggle.focus();
    });
    panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
      for (const name of names) settings[name] = { ...defaults[name] };
      status.textContent = '2人を初期配置に戻しました。';
      update();
      save();
    });
    panel.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      const url = new URL(location.href);
      url.searchParams.set('layout', names.flatMap(name => fields.map(({ key }) => settings[name][key])).join(','));
      try {
        await navigator.clipboard.writeText(url.href);
        shareInput.hidden = true;
        status.textContent = '調整リンクをコピーしました。';
      } catch (_) {
        shareInput.value = url.href;
        shareInput.hidden = false;
        shareInput.focus();
        shareInput.select();
        status.textContent = '表示されたリンクを選択してコピーしてください。';
      }
    });

    for (const name of names) {
      const actor = actors[name];
      actor.addEventListener('pointerdown', event => {
        if (drag || event.button !== 0 || root.dataset.actorEditorOpen !== 'true') return;
        event.preventDefault();
        selected = name;
        drag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...settings[name] };
        actor.setPointerCapture(event.pointerId);
        update();
      });
      actor.addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId) return;
        const { width, height } = arena.getBoundingClientRect();
        if (!width || !height) return;
        const { clientX, clientY, x, y } = drag;
        settings[name].x = bounded(x + (event.clientX - clientX) / width, horizontal);
        settings[name].y = bounded(y - (event.clientY - clientY) * 100 / height, vertical);
        update();
      });
      function endDrag(event) {
        if (drag?.id !== event.pointerId) return;
        drag = null;
        save();
      }
      actor.addEventListener('pointerup', endDrag);
      actor.addEventListener('pointercancel', endDrag);
      actor.addEventListener('lostpointercapture', endDrag);
    }

    update();
    setOpen(params.get('panel') !== 'closed');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
