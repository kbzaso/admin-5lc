#!/usr/bin/env node
/**
 * Bumps the version in package.json and rolls the [Unreleased] section of
 * CHANGELOG.md into a new release entry with today's date.
 *
 * Usage:
 *   npm run release            # patch bump (0.0.41 -> 0.0.42)
 *   npm run release minor      # minor bump (0.0.41 -> 0.1.0)
 *   npm run release major      # major bump (0.0.41 -> 1.0.0)
 *   npm run release 1.2.3      # explicit version
 *
 * Flags:
 *   --dry-run   print the changes without writing files
 *   --force     release even if [Unreleased] has no entries
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const bumpArg = args.find((a) => !a.startsWith('--')) ?? 'patch';

const pkgPath = resolve(process.cwd(), 'package.json');
const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');

const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const current = pkg.version;

function bump(version, type) {
	const [major, minor, patch] = version.split('.').map(Number);
	switch (type) {
		case 'major':
			return `${major + 1}.0.0`;
		case 'minor':
			return `${major}.${minor + 1}.0`;
		case 'patch':
			return `${major}.${minor}.${patch + 1}`;
		default:
			if (!/^\d+\.\d+\.\d+$/.test(type)) {
				console.error(`Invalid argument "${type}". Use major, minor, patch or an explicit version like 1.2.3.`);
				process.exit(1);
			}
			return type;
	}
}

const next = bump(current, bumpArg);

const today = new Date();
const date = [
	today.getFullYear(),
	String(today.getMonth() + 1).padStart(2, '0'),
	String(today.getDate()).padStart(2, '0')
].join('-');

// --- CHANGELOG.md ---
const changelog = readFileSync(changelogPath, 'utf8');

const unreleasedHeader = '## [Unreleased]';
const unreleasedIndex = changelog.indexOf(unreleasedHeader);
if (unreleasedIndex === -1) {
	console.error('Could not find "## [Unreleased]" section in CHANGELOG.md.');
	process.exit(1);
}

const afterUnreleased = unreleasedIndex + unreleasedHeader.length;
const nextSectionIndex = changelog.indexOf('\n## [', afterUnreleased);
const unreleasedContent = changelog.slice(afterUnreleased, nextSectionIndex).trim();

if (!unreleasedContent && !force) {
	console.error(
		'The [Unreleased] section is empty. Add your changes there first, or run with --force to release anyway.'
	);
	process.exit(1);
}

const newSection = unreleasedContent
	? `${unreleasedHeader}\n\n## [${next}] - ${date}\n\n${unreleasedContent}\n\n`
	: `${unreleasedHeader}\n\n## [${next}] - ${date}\n\n`;

let updatedChangelog =
	changelog.slice(0, unreleasedIndex) + newSection + changelog.slice(nextSectionIndex + 1);

// Update the comparison links at the bottom.
const repoUrlMatch = /\[unreleased\]:\s*(\S+?)\/compare\//i.exec(updatedChangelog);
if (!repoUrlMatch) {
	console.error('Could not find the [unreleased] link at the bottom of CHANGELOG.md.');
	process.exit(1);
}
const repoUrl = repoUrlMatch[1];

updatedChangelog = updatedChangelog.replace(
	/\[unreleased\]:\s*\S+/i,
	`[unreleased]: ${repoUrl}/compare/${next}...HEAD\n[${next}]: ${repoUrl}/compare/v${current}...v${next}`
);

// --- package.json ---
// Replace only the version line to preserve the file's formatting.
const updatedPkg = pkgRaw.replace(`"version": "${current}"`, `"version": "${next}"`);
if (updatedPkg === pkgRaw) {
	console.error(`Could not find "version": "${current}" in package.json.`);
	process.exit(1);
}

if (dryRun) {
	console.log(`[dry-run] ${current} -> ${next} (${date})`);
	console.log('\n[dry-run] New CHANGELOG.md section:\n');
	console.log(newSection);
	console.log(`[dry-run] New link: [${next}]: ${repoUrl}/compare/v${current}...v${next}`);
	process.exit(0);
}

writeFileSync(pkgPath, updatedPkg);
writeFileSync(changelogPath, updatedChangelog);

console.log(`Released ${current} -> ${next} (${date})`);
console.log('Updated: package.json, CHANGELOG.md');
console.log(`\nNext steps:\n  git add package.json CHANGELOG.md\n  git commit -m "release: ${next}"`);
