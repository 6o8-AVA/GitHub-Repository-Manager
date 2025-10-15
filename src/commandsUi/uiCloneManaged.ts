import path from 'path';
import fse from 'fs-extra';
import gitUrlParse from 'git-url-parse';
import {
  commands,
  ProgressLocation,
  Uri,
  window,
  workspace,
} from 'vscode';
import { cloneRepo } from '../commands/git/cloneRepository/cloneRepository';
import { Configs } from '../main/configs';
import { User } from '../store/user';


const openStr = 'Open';
const openInNewWindowStr = 'Open in New Window';
const addToWorkspaceStr = 'Add to Workspace';


function parseRepositoryInput(rawInput: string): { owner: string; name: string } {
  const trimmed = rawInput.trim();

  if (!trimmed)
    throw new Error('Repository is required.');

  const attempts: string[] = [];
  const pushAttempt = (candidate: string) => {
    const normalized = candidate.trim();
    if (!normalized)
      return;
    if (!attempts.includes(normalized))
      attempts.push(normalized);
  };

  const githubPathMatch = trimmed.match(/^(?:https?:\/\/)?github\.com[:/](.*)$/i);
  if (githubPathMatch && githubPathMatch[1])
    pushAttempt(`https://github.com/${githubPathMatch[1]}`);

  if (!/^https?:\/\//i.test(trimmed) && !/^git@/i.test(trimmed))
    pushAttempt(`https://github.com/${trimmed.replace(/^github\.com[:/]/i, '')}`);

  pushAttempt(trimmed);

  for (const attempt of attempts) {
    const parsed = tryParseAttempt(attempt);
    if (parsed)
      return parsed;
  }

  throw new Error('Unable to recognize the repository. Use owner/name or a GitHub URL.');
}


function tryParseAttempt(attempt: string): { owner: string; name: string } | undefined {
  try {
    const parsed = gitUrlParse(attempt);
    const resource = (parsed.resource || '').toLowerCase();

    const rawOwner = parsed.owner;
    const name = parsed.name;
    const isGitHubResource = resource === '' || resource === 'github.com' || resource === 'www.github.com';

    if (!isGitHubResource || !rawOwner || !name)
      return undefined;

    const owner = rawOwner.replace(/^github\.com[:/]/i, '');

    if (!owner || owner.includes('/'))
      return undefined;

    return { owner, name };
  } catch {
    // Ignore attempt errors
  }
  return undefined;
}


export async function uiCloneManaged(): Promise<void> {
  if (!User.token) {
    void window.showErrorMessage('You must sign in with GitHub before cloning repositories.');
    return;
  }

  const repositoryInput = await window.showInputBox({
    title: 'Cloning into Managed Directory',
    prompt: 'Enter a GitHub repository (owner/name or URL) to clone into the managed directory.',
    placeHolder: 'owner/name or https://github.com/owner/name',
    ignoreFocusOut: true,
    validateInput: (value) => {
      try {
        parseRepositoryInput(value);
        return undefined;
      } catch (err: any) {
        return value.trim() ? err.message : undefined;
      }
    },
  });

  if (!repositoryInput)
    return;

  let owner: string;
  let repositoryName: string;

  try {
    ({ owner, name: repositoryName } = parseRepositoryInput(repositoryInput));
  } catch (err: any) {
    void window.showErrorMessage(err.message);
    return;
  }

  const parentPath = Configs.defaultCloneToDir;
  const repoPath = path.join(parentPath, repositoryName);
  const repoUri = Uri.file(repoPath);

  try {
    await fse.ensureDir(parentPath);

    await window.withProgress({
      location: ProgressLocation.Notification,
      title: 'Cloning into Managed Directory',
    }, async (progress) => {
      progress.report({ message: `${owner}/${repositoryName}` });
      await cloneRepo({ owner, repositoryName, parentPath, token: User.token! });
    });
  } catch (err: any) {
    void window.showErrorMessage(err.message ?? 'Failed to clone repository.');
    return;
  }

  await Promise.all([
    User.reloadRepos(),
    (async () => {
      const action = await window.showInformationMessage(
        `Cloned ${owner}/${repositoryName} to ${repoPath}!`,
        openStr,
        openInNewWindowStr,
        addToWorkspaceStr,
      );

      switch (action) {
        case openStr:
          void commands.executeCommand('vscode.openFolder', repoUri);
          break;
        case openInNewWindowStr:
          void commands.executeCommand('vscode.openFolder', repoUri, true);
          break;
        case addToWorkspaceStr:
          workspace.updateWorkspaceFolders(workspace.workspaceFolders?.length ?? 0, 0, { uri: repoUri });
          break;
      }
    })(),
  ]);
}
