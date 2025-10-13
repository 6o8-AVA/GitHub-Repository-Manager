import os from 'os';
import vscode, { ThemeColor } from 'vscode';
import type { Dirtiness } from '../../commands/git/dirtiness/dirtiness';
import type { Repository } from '../../store/repository';
import type { TreeItemConstructor } from '../treeViewBase';
import { TreeItem } from '../treeViewBase';

// https://code.visualstudio.com/api/references/icons-in-labels

// TODO: Use GitHub icons (must resize them)
// we may use repo-cloned as icon for template.
function getIcon(repo: Repository): vscode.ThemeIcon | undefined {
  if (repo.type === 'local') return; // No icon if local (sure?)

  const args = ((): [name: string, color: string | undefined] => {
    if (repo.isPrivate)
      return ['lock', 'githubRepositoryManager.private'];
    else if (repo.isFork)
      return ['repo-forked', 'githubRepositoryManager.fork'];
    else // is then public
      return ['repo', 'githubRepositoryManager.public'];
  })();
  return new vscode.ThemeIcon(
    args[0],
    args[1] ? new ThemeColor(args[1]) : undefined,
  );
}


const dirtyToMessage: Record<Dirtiness, string> = {
  clean: '',
  dirty: 'This repository has local changes',
  error: 'An error has happened while getting dirtiness state! Read extension Output!',
  unknown: 'Checking if it\'s dirty...',

};

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const relativeTimeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
  ['second', 1000],
];

function getRelativeUpdatedText(repo: Repository): string | undefined {
  if (repo.type !== 'remote')
    return undefined;

  const updatedAt = repo.updatedAt;
  const updatedAtTime = updatedAt.getTime();
  if (Number.isNaN(updatedAtTime))
    return undefined;

  const diff = updatedAtTime - Date.now();

  for (const [unit, unitMs] of relativeTimeUnits) {
    const value = diff / unitMs;
    if (Math.abs(value) >= 1 || unit === 'second')
      return `Updated ${relativeTimeFormatter.format(Math.round(value), unit)}`;
  }

  return undefined;
}
// + (repo.isTemplate ? ' | Template' : '') //TODO
function getTooltip(repo: Repository) {
  // TODO Maybe for windows it requires regex escape?
  // os.homedir e.g. = linux: '/home/user'
  const localPath = repo.localPath?.replace(RegExp(`^${os.homedir()}`), '~') ?? '';

  // the | &nbsp; | adds a little more spacing.
  const R = repo.type === 'remote' ? repo : undefined;

  const string = `
|     |     |     |
| --- | --- | --- |
**Name** | &nbsp; | ${repo.name}`
+ (!R ? '' : `\r\n**Description** | &nbsp; | ${R.description ? R.description : 'No description'}`)
+ `\r\n**Author** | &nbsp; | ${repo.ownerLogin}`
+ (!R ? '' : `\r\n**Visibility** | &nbsp; | ${R.isPrivate ? 'Private' : 'Public'}`)
+ (!R ? '' : (R.languageName ? `\r\n**Language** | &nbsp; |${R.languageName}` : ''))
+ (!R ? '' : (R.isFork ? `\r\n**Fork of** | &nbsp; | ${R.parentRepoOwnerLogin} / ${R.parentRepoName}` : ''))
+ (!R ? '' : `\r\n**Updated at** | &nbsp; | ${R.updatedAt.toLocaleString()}`)
+ (!R ? '' : `\r\n**Created at** | &nbsp; | ${R.createdAt.toLocaleString()}`)
+ (repo.localPath ? `\r\n**Local path** | &nbsp; | ${localPath}` : '')
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
+ ((repo.dirty && repo.dirty !== 'clean') ? `\r\n**Dirty** | &nbsp; | ${dirtyToMessage[repo.dirty ?? 'clean']}` : '');

  return new vscode.MarkdownString(string);
}


type RepoItemConstructor = Omit<TreeItemConstructor, 'label'> & {
  repo: Repository;
  includeOwner?: boolean;
};

const dirtyToChar: Record<Dirtiness, string> = {
  clean: '',
  dirty: '*',
  error: 'E',
  unknown: '?',
};

export class RepoItem extends TreeItem {
  repo: Repository;

  constructor({ repo, command, includeOwner, ...rest }: RepoItemConstructor) {
    const repoName = includeOwner ? `${repo.ownerLogin} / ${repo.name}` : repo.name;

    const descriptionParts: string[] = [];
    const relativeUpdated = getRelativeUpdatedText(repo);
    if (relativeUpdated)
      descriptionParts.push(relativeUpdated);

    if (repo.dirty) {
      const dirtyIndicator = dirtyToChar[repo.dirty];
      if (dirtyIndicator)
        descriptionParts.push(dirtyIndicator);
    }

    const description = descriptionParts.join(' • ');

    super({
      label: repoName,
      tooltip: getTooltip(repo),
      command,
      iconPath: getIcon(repo),
      description: description || undefined, // '' to undefined.
    });
    Object.assign(this, rest);
    this.repo = repo;
  }
}
