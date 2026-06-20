import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, '..');
const repoRoot = resolve(frontendDir, '..');
const outputPath = resolve(frontendDir, 'public', 'release-notes.json');
const packageJson = JSON.parse(readFileSync(resolve(frontendDir, 'package.json'), 'utf8'));

const runGit = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const today = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date());

const shortHash = runGit(['rev-parse', '--short', 'HEAD']);
const latestTag = runGit(['describe', '--tags', '--abbrev=0']);
const envRange = String(process.env.RELEASE_NOTES_RANGE || '').trim();
const range = envRange || (latestTag ? `${latestTag}..HEAD` : 'HEAD~8..HEAD');

const rawSubjects = runGit(['log', '--pretty=%s', range]) || runGit(['log', '--pretty=%s', '-n', '8']);
const changedFilesRaw = runGit(['diff', '--name-only', range]) || runGit(['show', '--pretty=', '--name-only', 'HEAD']);
const changedFiles = changedFilesRaw.split('\n').map((entry) => entry.trim()).filter(Boolean);
const hasGitContext = Boolean(shortHash || rawSubjects || changedFiles.length);

if (!hasGitContext) {
  try {
    JSON.parse(readFileSync(outputPath, 'utf8'));
    console.log(`Release notes unchanged: git metadata unavailable, keeping ${outputPath}`);
    process.exit(0);
  } catch {
    // No existing release notes are available, continue with a generic fallback.
  }
}

const genericSubjectPatterns = [
  /^merge\b/i,
  /^wip\b/i,
  /^update\b/i,
  /^fixes?$/i,
  /^changes?$/i,
  /^aktuelle änderungen/i,
  /^änderungen übernehmen/i,
];

const commitHighlights = rawSubjects
  .split('\n')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .filter((entry) => !genericSubjectPatterns.some((pattern) => pattern.test(entry)))
  .map((entry) => entry.replace(/^(feat|fix|chore|refactor|docs|style|test)(\(.+\))?:\s*/i, ''))
  .slice(0, 4);

const fileIncludes = (patterns) =>
  changedFiles.some((file) => patterns.some((pattern) => file.toLowerCase().includes(pattern)));

const derivedHighlights = [];

if (fileIncludes(['teamposts', 'routes/posts', 'teamfeed'])) {
  derivedHighlights.push('Team Feed: Nachrichten, Umfragen und Feed-Beiträge wurden verbessert.');
}
if (fileIncludes(['notification', 'push', 'settingspage'])) {
  derivedHighlights.push('Push-Benachrichtigungen: Einstellungen und Versandlogik wurden aktualisiert.');
}
if (fileIncludes(['routes/events', 'eventdetail', 'eventcreate', 'eventedit', 'eventcard'])) {
  derivedHighlights.push('Termine: Erstellung, Bearbeitung, Rückmeldungen oder Detailansichten wurden verbessert.');
}
if (fileIncludes(['routes/teams', 'fussball', 'mytable', 'teams.ts'])) {
  derivedHighlights.push('Teams und Spielimport: Teamdaten, Tabellen oder fussball.de-Import wurden angepasst.');
}
if (fileIncludes(['database/init', 'migration', 'schema'])) {
  derivedHighlights.push('Stabilität: Datenbankmigrationen wurden für bestehende Installationen abgesichert.');
}
if (fileIncludes(['pwaupdatebanner', 'release-notes', 'serviceworker', 'useserviceworker', 'sw.js', 'manifest'])) {
  derivedHighlights.push('App-Update: Update-Hinweise und PWA-Aktualisierung wurden verbessert.');
}
if (fileIncludes(['docker', 'nginx', 'caddy', 'compose'])) {
  derivedHighlights.push('Deployment: Container-, Proxy- oder Produktionskonfiguration wurde angepasst.');
}
if (fileIncludes(['squad', 'roster', 'kader'])) {
  derivedHighlights.push('Kader: Spieler-, Trainer- oder Aufstellungsfunktionen wurden angepasst.');
}

const highlights = [...new Set([...derivedHighlights, ...commitHighlights])]
  .filter(Boolean)
  .slice(0, 6);

const releaseNotes = {
  version: process.env.RELEASE_VERSION || (shortHash ? `${packageJson.version}+${shortHash}` : packageJson.version),
  date: process.env.RELEASE_DATE || today,
  title: process.env.RELEASE_TITLE || 'Ein neues TeamVote+ Update ist verfügbar',
  summary: process.env.RELEASE_SUMMARY || (
    highlights.length > 0
      ? 'Dieses Update enthält die folgenden Änderungen für deine Teams.'
      : 'Dieses Update enthält technische Verbesserungen und Fehlerkorrekturen.'
  ),
  highlights: highlights.length > 0
    ? highlights
    : ['Stabilität und Performance wurden verbessert.'],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(releaseNotes, null, 2)}\n`);

console.log(`Release notes generated: ${outputPath}`);
console.log(`Range: ${range}`);
