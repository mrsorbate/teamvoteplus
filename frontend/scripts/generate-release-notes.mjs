import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, '..');
const repoRoot = resolve(frontendDir, '..');
const outputPath = resolve(frontendDir, 'public', 'release-notes.json');
const packageJson = JSON.parse(readFileSync(resolve(frontendDir, 'package.json'), 'utf8'));
const manualReleaseNotesPath = resolve(repoRoot, 'RELEASE_NOTES.md');

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

const readManualHighlights = () => {
  try {
    const content = readFileSync(manualReleaseNotesPath, 'utf8');
    const lines = content.split('\n');
    const firstSection = [];
    for (const line of lines) {
      if (firstSection.length > 0 && /^#{1,3}\s+/.test(line)) break;
      firstSection.push(line);
    }
    return firstSection
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  }
};

const fileIncludes = (patterns) =>
  changedFiles.some((file) => patterns.some((pattern) => file.toLowerCase().includes(pattern)));

const fileMatches = (patterns) =>
  changedFiles.some((file) => patterns.some((pattern) => pattern.test(file.toLowerCase())));

const derivedHighlights = [];

const specificRules = [
  {
    patterns: [/teamrosterpage/, /routes\/teams\.ts/, /database\/init\.ts/],
    message: 'Kader: Trainer können Spielerprofile inklusive Eltern-, Kontakt- und Notfallinformationen pflegen.',
  },
  {
    patterns: [/eventsquadpage/],
    message: 'Kader: Die Navigation zwischen Termin und Kaderseite wurde robuster gemacht.',
  },
  {
    patterns: [/pwaupdatebanner/, /useserviceworker/],
    message: 'App-Update: Neue Versionen werden bei offener App früher erkannt und die Update-Ansicht bleibt besser bedienbar.',
  },
  {
    patterns: [/release-notes/],
    message: 'App-Update: Die Änderungsanzeige beschreibt Updates konkreter und kompakter.',
  },
  {
    patterns: [/calendar-token/, /teamsettingspage/, /ical|webcal/],
    message: 'Kalender: Kalenderlinks, Token-Verwaltung oder Freigabeoptionen wurden verbessert.',
  },
  {
    patterns: [/routes\/posts/, /teampostspage/],
    message: 'Team Feed: Beiträge, Umfragen, Leselisten, Archiv oder Dokumente wurden verbessert.',
  },
  {
    patterns: [/routes\/events/, /eventdetailpage/, /eventeditpage/, /eventcreatepage/],
    message: 'Termine: Termin-Details, Bearbeitung, Rückmeldungen oder automatische Feed-Einträge wurden angepasst.',
  },
  {
    patterns: [/fussballde/, /import-next-games/, /mytablepage/],
    message: 'Spielimport und Tabelle: fussball.de-Import, Badges, Wappen oder Tabellenansicht wurden stabilisiert.',
  },
  {
    patterns: [/docker/, /compose/, /nginx/, /caddy/],
    message: 'Deployment: Produktionscontainer, Healthchecks oder Proxy-Konfiguration wurden angepasst.',
  },
  {
    patterns: [/eslint/],
    message: 'Stabilität: Frontend-Linting wurde als Qualitätscheck vorbereitet.',
  },
];

for (const rule of specificRules) {
  if (fileMatches(rule.patterns)) {
    derivedHighlights.push(rule.message);
  }
}

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

const manualHighlights = readManualHighlights();
const highlights = [...new Set([...manualHighlights, ...derivedHighlights, ...commitHighlights])]
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
