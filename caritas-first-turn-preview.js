(function () {
  'use strict';

  const DISTANCE = 'distance';
  const SPEAK = 'speak';
  const ASK_PATH = 'ask-path';
  const ASK_FEAR = 'ask-fear';

  function outcome(dark, maintenance, preset, written, pose, clue, options = {}) {
    return { dark, maintenance, preset, written, pose, clue, reply: '', next: null, kind: 'heard', ...options };
  }

  function refusal(reply, next, pose, clue) {
    return outcome(8, -20, 0, 3, pose, clue, { reply, next, kind: 'refused' });
  }

  const base = {
    爪: {
      忍耐: {
        希望: outcome(-14, -6, 8, 32, 'notice', '爪が緩み、自分から先のことを尋ねる。', {
          reply: '……この先に、何がある', next: ASK_PATH
        }),
        癒し: outcome(-9, -2, 8, 32, 'notice', '距離を守って待つうち、浅かった息が長くなる。'),
        願い: outcome(-7, -4, 12, 36, 'hesitate', '距離を保つと、自分から顔を上げる。')
      },
      勇気: {
        希望: refusal('……そこで止まれ。先の話をする前に、私が話せるところまで、下がってくれ。', DISTANCE, 'guarded',
          'カリタスは爪を立てて身を引いた。怖さを聞く前に、シオンが先の話をした。'),
        癒し: outcome(-16, -14, 18, 42, 'notice', '一歩近づいても退かず、震える息が聞こえる。'),
        願い: outcome(-15, -14, 22, 46, 'notice', '二人の足元を見たあと、シオンに視線を戻す。')
      }
    },
    口元: {
      忍耐: {
        希望: outcome(-12, -6, 8, 32, 'notice', 'シオンが話し終えるまで、静かに耳を向ける。'),
        癒し: outcome(-8, -2, 8, 32, 'hesitate', '距離を守って待つと、口を開く前に息をつける。'),
        願い: outcome(-7, -4, 12, 36, 'hesitate', '自分の間で口を開き、シオンに尋ねる。', {
          reply: '……お前も、怖いのか', next: ASK_FEAR
        })
      },
      勇気: {
        希望: outcome(-20, -14, 18, 42, 'hesitate', '翼の光が過ぎると、喉の闇の切れ目から息が漏れる。'),
        癒し: refusal('……声が、出かけていたのだ。少しでいい。今は、私に話させてくれ。', SPEAK, 'hesitate',
          'カリタスは視線を落とす。二人が黙ると、閉じかけた口がまた動く。シオンの声が、カリタスの声に重なっていた。'),
        願い: outcome(-17, -14, 22, 46, 'hesitate', '翼が開いた間に、カリタスが先に短く声を出す。')
      }
    }
  };

  const distanceHeld = {
    忍耐: {
      希望: outcome(-4, -6, 0, 3, 'notice', '距離には安心するが、先の話には応じない。', {
        reply: '……そこで待ってくれ。今は、私の話を聞いてほしい。', next: DISTANCE, kind: 'partial'
      }),
      癒し: outcome(-2, -4, 4, 16, 'notice', '爪は緩む。カリタスは、まだ自分の言葉を探している。', {
        reply: '……聞こえている。今は、そこにいてくれ。私も、話したいことがある。', next: DISTANCE, kind: 'partial'
      })
    },
    勇気: {
      希望: refusal('……まだ近い。先の話は、私が話し終えてからにしてくれ。', DISTANCE,
        'guarded', '爪を立てて身を引く。'),
      癒し: refusal('……下がってくれと言った。今は、そこから聞いてくれ。', DISTANCE,
        'guarded', '爪を立てて身を引く。')
    }
  };

  const returnSpace = {
    爪: outcome(-12, -4, 12, 36, 'hesitate', 'シオンが一拍待つ。カリタスは自分から口を開く。', {
      reply: '……そこからなら、話せる'
    }),
    口元: outcome(-7, -4, 12, 36, 'hesitate', 'シオンが一拍待つ。カリタスは自分から口を開く。', {
      reply: '……そこからなら、話せる'
    })
  };

  const speakFromHere = outcome(-12, -4, 12, 36, 'hesitate', 'シオンが待つと、カリタスは自分から話し始める。', {
    reply: '……今なら、言えそうだ。'
  });
  const speakThroughWing = outcome(-17, -14, 22, 46, 'hesitate', '翼で喉の闇が開く。シオンが待ち、カリタスが先に声を出す。', {
    reply: '……今度は、私から話そう。'
  });
  const speakInterrupted = refusal('……また声が出せなかった。先に、私の話を聞いてくれ。', SPEAK,
    'hesitate', 'カリタスは声を出しかけ、また口を閉じた。');
  const answerPath = outcome(-18, -14, 18, 42, 'notice', '近づく二人を見て、シオンの返事を待つ。');
  const answerFear = outcome(-16, -14, 18, 42, 'notice', '自分から尋ねたことへの答えを、カリタスは聞いている。');

  function getOutcome(previous, moon, strength, star) {
    if (previous === DISTANCE) {
      if (strength === '忍耐' && star === '願い') return returnSpace[moon];
      return distanceHeld[strength][strength === '勇気' && star === '願い' ? '癒し' : star];
    }
    if (previous === SPEAK) {
      if (strength === '勇気') return star === '願い' ? speakThroughWing : speakInterrupted;
      if (moon === '口元' && star === '願い') return speakFromHere;
    }
    if (previous === ASK_PATH && moon === '爪' && strength === '勇気' && star === '希望') return answerPath;
    if (previous === ASK_FEAR && moon === '口元' && strength === '勇気' && star === '癒し') return answerFear;
    return base[moon][strength][star];
  }

  const clamp = (number, min, max) => Math.max(min, Math.min(max, number));

  function newBattle() {
    return { dark: 84, maintenance: 100, resonance: 0, turn: 0, last: null, status: 'reading' };
  }

  function mood(dark) {
    if (dark === 0) return '解放';
    if (dark >= 71) return '閉ざす';
    return dark >= 36 ? '荒れる' : '揺らぐ';
  }

  function isValidWriting(value) {
    const trimmed = value.trim();
    if (Array.from(trimmed).length > 700) return false;
    const characters = trimmed.normalize('NFC').match(/[\p{L}\p{N}]/gu) || [];
    return characters.length >= 4 && new Set(characters).size >= 2;
  }

  function applyTurn(battle, { moon, strength, star, writing = null }) {
    if (battle.status !== 'reading' || (writing !== null && !isValidWriting(writing))) return battle;
    const previous = battle.last;
    const row = getOutcome(previous?.row.next, moon, strength, star);
    const streak = previous?.star === star ? previous.streak + 1 : 1;
    const gain = Math.floor((writing === null ? row.preset : row.written) / (2 ** (streak - 1)));
    const dark = clamp(battle.dark + row.dark, 1, 100);
    const maintenance = clamp(battle.maintenance + row.maintenance, 0, 100);
    const resonance = clamp(battle.resonance + gain, 0, 100);
    const status = resolveStatus(dark, maintenance, resonance);
    const glance = writing !== null && row.kind === 'refused';
    return {
      dark, maintenance, resonance, turn: battle.turn + 1, status,
      last: { moon, strength, star, streak, gain, row, glance }
    };
  }

  function resolveStatus(dark, maintenance, resonance) {
    if (maintenance === 0) return 'defeat';
    return resonance === 100 && dark <= 25 ? 'release' : 'reading';
  }

  function finishBattle(battle) {
    return battle.status === 'release' ? { ...battle, dark: 0, status: 'victory' } : battle;
  }

  const cards = {
    moon: ['月 XVIII', '18-the-moon'],
    strength: ['力 VIII', '08-strength'],
    star: ['星 XVII', '17-the-star']
  };
  const starLines = {
    希望: '闇が晴れたら、少し歩かないか。この道の先を、君と見てみたい。',
    癒し: '俺も怖い。アビスがこんなふうに暴走して……どうすれば止められるのか、まだ分からないんだ。',
    願い: '俺に、どうしてほしい？'
  };
  const asksForDistance = '……そこにいてくれ。次は、私に話させてくれ';
  const moonLines = {
    opening: {
      爪: 'シオン。近づくと、あの爪が地面に食い込む。これ以上近づかれるのが怖いんだ。',
      口元: 'シオン。今、何か言おうとした。声になる前に、喉の闇が遮った。'
    },
    [DISTANCE]: {
      爪: '距離が開くと、地面を掴んでいた爪が少し緩んだ。そこでなら、話したそうだ。',
      口元: 'こっちが黙ると、もう一度口を開いた。自分から何か言おうとしてる。'
    },
    [SPEAK]: {
      爪: '爪は、まだ同じ場所にある。さっきの言葉の続きを待ってみよう。',
      口元: 'さっき途切れた声が、また喉まで来ている。今度は、あの子が言葉にするまで待とう。'
    },
    [ASK_PATH]: {
      爪: '爪の力が抜けた。今は、君からこの道の先の話を聞きたいようだ。',
      口元: '短い問いを、自分の声で言い切った。君の返事を待っている。'
    },
    [ASK_FEAR]: {
      爪: '身を引かずに、君を見ている。自分から聞いたことの答えを待っている。',
      口元: 'さっきの問いは、闇に遮られずに聞こえた。聞きたかったのは、シオンの気持ちだ。'
    },
    ordinary: {
      爪: 'シオン。爪の力を見て。あの子がどこで踏みとどまっているか、足元にも声がある。',
      口元: 'シオン。口元に耳を澄ませて。声が出るまでに、あの子にも間が要る。'
    }
  };
  const decision = [
    { speaker: '', line: 'シオリエルが、カリタスを覆う闇を押し開いた。', pose: 'hesitate', light: 'wing' },
    { speaker: 'シオン', line: 'ここにいる。君の声で、続きを聞かせてくれ。', pose: 'notice', light: 'reading' },
    { speaker: '', line: 'カリタスはひとつ息を吸い、自分の足で立った。', pose: 'resolve', light: 'none' }
  ];
  const poses = {
    guarded: '03_guarded', notice: '02_notice', hesitate: '04_hesitate', resolve: '05_resolve'
  };

  function mount(root, { clock = globalThis } = {}) {
    const find = id => root.querySelector('#' + id);
    const arena = find('arena');
    const beast = find('caritas');
    const choices = find('choices');
    const form = find('writing');
    const input = find('message');
    const send = find('send-writing');
    const title = find('phase-title');
    const phaseCard = find('phase-card');
    const epilogue = find('epilogue');
    const write = (id, value) => { find(id).textContent = value; };
    const imageFor = pose => './assets/battle/caritas/caritas-' + poses[pose] + '.webp';
    let session;
    let timer;

    function later(delay, callback) {
      const current = session;
      timer = clock.setTimeout(() => {
        if (session !== current) return;
        timer = undefined;
        callback();
      }, delay);
    }

    function cancelDelay() {
      clock.clearTimeout(timer);
      timer = undefined;
    }

    function pose(value, { glance = false } = {}) {
      arena.dataset.pose = value;
      arena.dataset.glance = String(glance);
      const source = imageFor(value);
      if (beast.getAttribute('src') !== source) beast.setAttribute('src', source);
    }

    function light(value) {
      arena.dataset.light = value;
    }

    function gauges() {
      const battle = session.battle;
      for (const key of ['dark', 'maintenance', 'resonance']) {
        write(key, battle[key] + (key === 'dark' ? '%' : ''));
        find(key + '-meter').value = battle[key];
      }
      write('mood', mood(battle.dark));
      arena.style.setProperty('--abyss-opacity', String(battle.dark / 160));
      arena.dataset.status = battle.status;
    }

    function panel({ phase, heading, speaker = '', line = '', clue = '', writing = false, options = [] }) {
      const card = cards[phase];
      root.dataset.phase = phase;
      title.textContent = heading || card[0];
      phaseCard.hidden = !card;
      if (card) phaseCard.src = './assets/tarot/major/' + card[1] + '.webp';
      else phaseCard.removeAttribute('src');
      write('selection', [session.moon, session.strength, session.star].filter(Boolean).join(' ／ '));
      write('speaker', speaker);
      write('line', line);
      write('clue', clue);
      form.hidden = !writing;
      const current = session;
      choices.replaceChildren(...options.map(([label, action]) => {
        const button = root.ownerDocument.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => {
          if (current === session && button.parentNode === choices) action();
        });
        return button;
      }));
      if (choices.children.length || writing) title.focus({ preventScroll: true });
    }

    function showMoon() {
      cancelDelay();
      session.moon = session.strength = session.star = '';
      session.step = 'moon';
      input.value = '';
      arena.dataset.approach = 'home';
      light('reading');
      const last = session.battle.last;
      if (!last) {
        pose('guarded');
        panel({
          phase: 'moon', speaker: 'カリタス', line: '来るな。……グルル……。',
          clue: 'カリタスは爪を立て、身を引く。一瞬だけ顔を上げて口を開いた。',
          options: [['爪', () => chooseMoon('爪')], ['口元', () => chooseMoon('口元')]]
        });
        later(460, () => {
          pose('hesitate');
          later(440, () => pose('guarded'));
        });
        return;
      }
      pose(last.row.pose);
      const waiting = last.row.next === DISTANCE;
      panel({
        phase: 'moon', speaker: waiting || last.row.reply ? 'カリタス' : '',
        line: waiting ? asksForDistance : last.row.reply,
        clue: last.row.clue,
        options: [['爪', () => chooseMoon('爪')], ['口元', () => chooseMoon('口元')]]
      });
    }

    function chooseMoon(value) {
      cancelDelay();
      session.moon = value;
      session.step = 'strength';
      const last = session.battle.last;
      const context = last ? last.row.next || 'ordinary' : 'opening';
      pose(value === '口元' ? 'hesitate' : context === 'opening' ? 'guarded' : 'notice');
      panel({
        phase: 'strength', speaker: 'シオリエル', line: moonLines[context][value],
        options: [['忍耐', () => chooseStrength('忍耐')], ['勇気', () => chooseStrength('勇気')]]
      });
    }

    function chooseStrength(value) {
      session.strength = value;
      session.step = 'strength-effect';
      const reach = value === '勇気';
      const line = reach ? 'シオンとシオリエルが、並んで一歩進む。' : 'シオリエルが半歩前に出る。シオンはその場に留まる。';
      panel({ phase: 'strength', clue: line });
      light('card');
      later(330, () => {
        arena.dataset.approach = reach ? 'reach' : 'wait';
        light('wing');
        later(590, () => {
          light('none');
          later(250, showStar);
        });
      });
    }

    function showStar() {
      session.step = 'star';
      session.star = '';
      light('reading');
      panel({ phase: 'star', options: Object.keys(starLines).map(value => [value, () => chooseStar(value)]) });
    }

    function chooseStar(value) {
      session.star = value;
      session.step = 'delivery';
      panel({
        phase: 'star', speaker: 'シオン', line: starLines[value],
        options: [
          ['この言葉を届ける', () => deliver(null)],
          ['自分の言葉で届ける', showWriting],
          ['星を選び直す', showStar]
        ]
      });
    }

    function showWriting() {
      session.step = 'writing';
      send.disabled = !isValidWriting(input.value);
      panel({ phase: 'star', writing: true });
      input.focus();
    }

    function deliver(writing) {
      if (session.step !== 'delivery' && session.step !== 'writing') return;
      if (writing !== null && !isValidWriting(writing)) return;
      session.step = 'delivering';
      const line = writing ?? starLines[session.star];
      const next = applyTurn(session.battle, { ...session, writing });
      panel({ phase: 'star', speaker: 'シオン', line });
      later(session.star === '願い' ? 620 : 420, () => {
        light('none');
        session.battle = next;
        gauges();
        showReaction();
      });
    }

    function showReaction() {
      const { last, status } = session.battle;
      pose(last.row.pose);
      const options = status === 'defeat'
        ? [['つづける', showDefeat]]
        : status === 'release'
          ? [['共鳴解放', () => showDecision(0)], ['最初から', reset]]
          : [['次の月へ', showMoon]];
      const reaction = (clue, buttons) => panel({
        phase: 'reaction', heading: 'カリタスの反応', speaker: last.row.reply ? 'カリタス' : '',
        line: last.row.reply, clue, options: buttons
      });
      session.step = 'reaction';
      reaction(last.row.clue, last.glance ? [] : options);
      if (last.glance) {
        later(390, () => {
          pose('notice', { glance: true });
          reaction(last.row.clue + ' 一瞬だけ、シオンに視線を戻した。', []);
          later(430, () => {
            pose(last.row.pose);
            reaction(last.row.clue + ' 一瞬だけ、シオンに視線を戻した。', options);
          });
        });
      }
    }

    function showDefeat() {
      session.step = 'retreat';
      light('none');
      pose('guarded');
      arena.dataset.approach = 'home';
      panel({
        phase: 'retreat', heading: '撤退', speaker: 'シオリエル', line: '……シオン、いったん離れよう',
        options: [['つづける', () => end(false)]]
      });
    }

    function showDecision(index) {
      session.step = 'decision';
      arena.dataset.ending = 'true';
      const beat = decision[index];
      pose(beat.pose);
      light(beat.light);
      panel({
        phase: 'decision', heading: '共鳴解放', speaker: beat.speaker, line: beat.line,
        options: [['つづける', () => index === decision.length - 1 ? end(true) : showDecision(index + 1)]]
      });
    }

    function end(victory) {
      session.step = 'end';
      if (victory) session.battle = finishBattle(session.battle);
      gauges();
      light('none');
      panel({
        phase: 'end', heading: victory ? '勝利' : '敗北・撤退',
        options: [['最初から', reset]]
      });
      epilogue.textContent = victory
        ? 'シオン「月は、声になる前の気持ちに目を向ける札。力は、待つか一歩出るかを選ぶ札。翼が作ってくれた間に、星で俺の言葉を届けた。最後の声は、カリタスが自分で聞かせてくれたんだ。」'
        : 'シオン「月でもう一度、声になる前の仕草を見よう。力で距離を選んで、星で言葉を渡す。翼が開く短い間に、あいつの声を聞きたい。」';
      epilogue.hidden = false;
    }

    function reset() {
      cancelDelay();
      session = { battle: newBattle() };
      epilogue.hidden = true;
      epilogue.textContent = '';
      arena.classList.add('resetting');
      delete arena.dataset.ending;
      gauges();
      showMoon();
      void arena.offsetWidth;
      arena.classList.remove('resetting');
    }

    find('reset').addEventListener('click', reset);
    find('cancel-writing').addEventListener('click', () => chooseStar(session.star));
    input.addEventListener('input', () => { send.disabled = !isValidWriting(input.value); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (session.step === 'writing') deliver(input.value.trim());
    });

    for (const name of Object.keys(poses)) {
      const image = new Image();
      image.src = imageFor(name);
    }
    reset();
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { newBattle, mood, isValidWriting, applyTurn, resolveStatus, finishBattle, mount };
  } else {
    mount(document.querySelector('#battle'));
  }
}());
