/** Read-only QA deployment byte check. No storage, credentials or browser state. */
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FILES = Object.freeze([
  'index.html',
  'alenon.html',
  'game.js',
  'public-continue-title.js',
  'runtime-entry.js',
  'progress.js',
  'route-registry.js',
  'garden-east-passage.js',
  'star-gate-public.js',
  'qa/east-passage/index.html',
  'qa/east-passage/qa-safety.js',
  'qa/east-passage/launcher.js',
  'qa/east-passage/approved-origin.js',
  'assets/maps/star-country-gate-garden-collision.json',
  'assets/maps/star-country-gate-garden-transparent.webp',
]);

export function validateOrigin(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Origin required');
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  const forbidden = ['github.io', 'github.com', 'githubusercontent.com', 'raw.githack.com', 'githack.com', 'localhost'];
  if (u.protocol !== 'https:' || u.origin !== raw || u.username || u.password ||
      u.pathname !== '/' || u.search || u.hash || (u.port && u.port !== '443') ||
      forbidden.some(x => host === x || host.endsWith('.' + x)) ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    throw new Error('Not a permitted unique HTTPS QA origin');
  }
  return u.origin;
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function verifyHost(rawOrigin, {root = process.cwd(), fetcher = fetch, enabled = false, githubToken = null} = {}) {
  const origin = validateOrigin(rawOrigin);
  const base = resolve(root);
  const approved = await readFile(join(base, 'qa/east-passage/approved-origin.js'), 'utf8');
  const configured = approved.match(/TarotEastPassageQAApprovedOrigin\s*=\s*"([^"]*)"\s*;/);
  if (!configured) throw new Error('QA approval assignment missing or unsupported');
  if (enabled ? configured[1] !== origin : configured[1] !== '') {
    throw new Error(enabled ? 'QA origin not explicitly approved' : 'Bootstrap must remain disabled');
  }
  const failures = [];
  const results = [];
  for (const filename of FILES) {
    const localBytes = await readFile(join(base, filename));
    const url = new URL('/' + filename, origin);
    try {
      const response = await fetcher(url, {
        redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: {'cache-control': 'no-cache', ...(githubToken ? {'X-Github-Token':githubToken} : {})},
      });
      if (response.status !== 200 || new URL(response.url).origin !== origin) {
        throw new Error('response status/origin mismatch: ' + response.status);
      }
      const remoteBytes = Buffer.from(await response.arrayBuffer());
      if (hash(remoteBytes) !== hash(localBytes)) throw new Error('SHA256 bytes mismatch');
      results.push({filename, verdict: 'MATCH', sha256: hash(localBytes)});
    } catch (error) {
      failures.push({filename, verdict: 'STOP', reason: String(error?.message || error)});
    }
  }
  return {origin, phase: enabled ? 'APPROVED' : 'BOOTSTRAP_LOCKED', count: FILES.length,
    matched: results.length, verdict: failures.length ? 'STOP' : 'CORE_BYTES_MATCH',
    results, failures, note: 'Core sample only; not complete asset/device acceptance.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const enabled = args.includes('--enabled');
  const privateCodespace = args.includes('--codespaces-private');
  const origin = args.find(a => !a.startsWith('--'));
  if (!origin) {
    console.error('Usage: node qa/east-passage/hosting/verify-host.mjs https://qa.example.org [--enabled] [--codespaces-private]');
    process.exitCode = 2;
  } else if (privateCodespace && !process.env.GITHUB_TOKEN) {
    console.error('STOP: GITHUB_TOKEN missing; cannot verify private forwarded port');
    process.exitCode = 2;
  } else {
    verifyHost(origin, {enabled, githubToken: privateCodespace ? process.env.GITHUB_TOKEN : null}).then(report => {
      console.log(JSON.stringify(report, null, 2));
      if (report.verdict !== 'CORE_BYTES_MATCH') process.exitCode = 1;
    }).catch(error => {console.error('STOP:', error.message); process.exitCode = 1;});
  }
}