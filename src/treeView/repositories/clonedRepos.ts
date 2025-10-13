import path from 'path';
import fse from 'fs-extra';
import type { MessageItem } from 'vscode';
import { commands, env, ThemeIcon, TreeItemCollapsibleState, Uri, window, workspace } from 'vscode';
import { isGitDirty } from '../../commands/git/dirtiness/dirtiness';
import { noLocalSearchPaths } from '../../commands/searchClonedRepos/searchClonedRepos';
import { HiddenCloned } from '../../store/hiddenCloned';
import { OrgStatus } from '../../store/organization';
import type { Repository } from '../../store/repository';
import { User } from '../../store/user';
import { TreeItem } from '../treeViewBase';
import { getEmptyOrgLabel } from './orgTreeUtils';
import { RepoItem } from './repoItem';
import { sortRepositoriesForCloned } from './sortOrder';


export function activateClonedRepos(): void {
  // Open
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.open', ({ repo }: RepoItem) =>
    repo.localPath && commands.executeCommand('vscode.openFolder', Uri.file(repo.localPath)));

  // Open in New Window
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.openInNewWindow', ({ repo }: RepoItem) =>
    repo.localPath && commands.executeCommand('vscode.openFolder', Uri.file(repo.localPath), true));

  // Add to Workspace
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.addToWorkspace', ({ repo }: RepoItem) =>
    repo.localPath && workspace.updateWorkspaceFolders(workspace.workspaceFolders?.length ?? 0, 0, { uri: Uri.file(repo.localPath) }));

  // Open Containing Folder
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.openContainingFolder', ({ repo }: RepoItem) =>
    // revealFileInOS always open the parent path. So, to open the repo dir in fact, we pass the
    repo.localPath && commands.executeCommand('revealFileInOS', Uri.file(path.resolve(repo.localPath, '.git'))));

  // Copy local path to clipboard
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.copyPath', ({ repo }: RepoItem) => {
    repo.localPath && void env.clipboard.writeText(repo.localPath);
  });

  // Delete repo
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.delete', async ({ repo }: RepoItem) => {
    if (!repo.localPath)
      return; // DO nothing if repo hasn't local path
    const isDirty = await isGitDirty(repo.localPath);

    const title = isDirty ? `Delete DIRTY ${repo.name} repository?` : `Delete ${repo.name} repository?`;
    const message = isDirty
      ? `The repository is DIRTY; there are uncommitted local changes. Are you sure you want to locally delete this repository? This action is IRREVERSIBLE.`
      : `Are you sure you want to locally delete the repository? This action is irreversible.`;

    const deleteString = 'Delete';
    const answer = await window.showWarningMessage<MessageItem>(title,
      {
        detail: message,
        modal: true,
      },
      { title: 'Cancel', isCloseAffordance: true },
      { title: deleteString },
    );

    if (answer?.title === deleteString) {
      const disposable = window.setStatusBarMessage(`Locally deleting ${repo.name}...`);
      try {
        await fse.remove(repo.localPath);
        void window.showInformationMessage(`Locally deleted the ${repo.name} repository.`);
        await User.reloadRepos();
      } catch (err) {
        void window.showErrorMessage((err as any).message);
      } finally {
        disposable.dispose();
      }
    }
  });

  // Hide organization
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.hideOrg', (item: TreeItem & { orgLogin?: string }) => {
    if (item.orgLogin)
      HiddenCloned.hideOrg(item.orgLogin);
  });

  // Hide repository
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.hideRepo', (item: RepoItem) => {
    const orgLogin = item.repo.ownerLogin;
    const repoUrl = item.repo.url;
    HiddenCloned.hideRepo(orgLogin, repoUrl);
  });

  // Unhide organization
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.unhideOrg', (item: TreeItem & { orgLogin?: string }) => {
    if (item.orgLogin)
      HiddenCloned.unhideOrg(item.orgLogin);
  });

  // Unhide repository
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.unhideRepo', (item: RepoItem) => {
    const orgLogin = item.repo.ownerLogin;
    const repoUrl = item.repo.url;
    HiddenCloned.unhideRepo(orgLogin, repoUrl);
  });
}

type ParseChildrenOptions = {
  userLogin?: string;
  includeOwner?: boolean;
  contextValue?: string;
  commandName?: string;
};

function parseChildren(clonedRepos: Repository[], options: ParseChildrenOptions = {}): TreeItem[] {
  const { userLogin, includeOwner, contextValue, commandName } = options;

  return clonedRepos.map((repo) => new RepoItem({
    repo,
    contextValue: contextValue ?? 'githubRepoMgr.context.clonedRepo',
    command: {
      // We wrap the repo in {} because we may call the cloneTo from the right click, and it passes the RepoItem.
      command: commandName ?? 'githubRepoMgr.commands.clonedRepos.open',
      arguments: [{ repo }],
    },
    includeOwner: includeOwner ?? (userLogin ? repo.ownerLogin !== userLogin : false),
  }));
}

function attachOrgMetadata(treeItem: TreeItem, orgLogin: string): TreeItem {
  return Object.assign(treeItem, { orgLogin });
}

function createVisibleOrgTreeItem(org: { name: string; login: string; clonedRepos: Repository[]; repositories: Repository[]; status: OrgStatus }, snapshot: ReturnType<typeof HiddenCloned.getSnapshot>): TreeItem | undefined {
  const hiddenRepos = snapshot.repos.get(org.login) ?? new Set<string>();
  const sortedRepos = sortRepositoriesForCloned(org.clonedRepos, org.login)
    .filter((repo) => !hiddenRepos.has(repo.url));

  const hasClonedRepos = sortedRepos.length > 0;

  if (!hasClonedRepos && org.status === OrgStatus.loaded)
    return undefined;

  return attachOrgMetadata(
    new TreeItem({
      label: `${org.name}`,
      children: (org.repositories.length
        ? parseChildren(sortedRepos, { userLogin: org.login })
        : new TreeItem({ label: getEmptyOrgLabel(org.status) })),
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: 'githubRepoMgr.context.clonedOrg',
    }),
    org.login,
  );
}

function createHiddenSectionTreeItem(snapshot: ReturnType<typeof HiddenCloned.getSnapshot>): TreeItem | undefined {
  const hiddenOrgItems: TreeItem[] = [];

  // Add completely hidden orgs
  const hiddenOrgLogins = Array.from(snapshot.orgs);
  hiddenOrgLogins.forEach((orgLogin) => {
    const orgItem = createHiddenOrgTreeItem(orgLogin, snapshot);
    if (orgItem)
      hiddenOrgItems.push(orgItem);
  });

  // Add orgs with some hidden repos (but not completely hidden)
  for (const [orgLogin, repoUrls] of snapshot.repos.entries()) {
    if (snapshot.orgs.has(orgLogin) || repoUrls.size === 0)
      continue;
    const orgItem = createHiddenOrgTreeItem(orgLogin, snapshot);
    if (orgItem)
      hiddenOrgItems.push(orgItem);
  }

  if (hiddenOrgItems.length === 0)
    return undefined;

  return new TreeItem({
    label: 'Hidden',
    children: hiddenOrgItems,
    collapsibleState: TreeItemCollapsibleState.Collapsed,
  });
}

function createHiddenOrgTreeItem(orgLogin: string, snapshot: ReturnType<typeof HiddenCloned.getSnapshot>): TreeItem | undefined {
  const org = User.organizations.find((o) => o.login === orgLogin);
  const orgName = org?.name ?? orgLogin;
  const isOrgHidden = snapshot.orgs.has(orgLogin);

  const repoItems = createHiddenRepoItems(orgLogin, snapshot);

  // Don't show the org if there are no actual repos to display
  if (!repoItems)
    return undefined;

  return attachOrgMetadata(
    new TreeItem({
      label: orgName,
      description: isOrgHidden ? 'organization hidden' : undefined,
      children: repoItems,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: 'githubRepoMgr.context.hiddenClonedOrg',
    }),
    orgLogin,
  );
}

function createHiddenRepoItems(orgLogin: string, snapshot: ReturnType<typeof HiddenCloned.getSnapshot>): TreeItem[] | undefined {
  const hiddenRepoUrlsSet = snapshot.repos.get(orgLogin);
  const org = User.organizations.find((o) => o.login === orgLogin);

  if (!org)
    return undefined; // Don't show org if not found

  const isOrgHidden = snapshot.orgs.has(orgLogin);

  if (isOrgHidden) {
    // Show all cloned repos when the entire org is hidden
    const repos = parseChildren(org.clonedRepos, {
      userLogin: org.login,
      contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
      commandName: 'githubRepoMgr.commands.clonedRepos.open',
    });
    return repos.length > 0 ? repos : undefined;
  }

  if (!hiddenRepoUrlsSet || hiddenRepoUrlsSet.size === 0)
    return undefined; // Don't show org if no hidden repos

  const hiddenRepoUrls = Array.from(hiddenRepoUrlsSet);
  const hiddenRepos = org.clonedRepos.filter((repo) => hiddenRepoUrls.includes(repo.url));

  if (hiddenRepos.length === 0)
    return undefined; // Don't show org if hidden repos not found

  return parseChildren(hiddenRepos, {
    userLogin: org.login,
    contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
    commandName: 'githubRepoMgr.commands.clonedRepos.open',
  });
}

// TODO: Add remember cloned repos when not logged option?
export function getClonedTreeItem(): TreeItem {
  if (!User.login)
    throw new Error('User.login is not set!');

  if (noLocalSearchPaths)
    return new TreeItem({
      label: 'Cloned',
      children: new TreeItem({
        label: ' Press here to select "git.defaultCloneDirectory"',
        command: 'githubRepoMgr.commands.pick.defaultCloneDirectory',
        iconPath: new ThemeIcon('file-directory'),
      }),
    });

  const snapshot = HiddenCloned.getSnapshot();

  const visibleOrgs = User.organizations
    .filter((org) => !snapshot.orgs.has(org.login))
    .map((org) => createVisibleOrgTreeItem(org, snapshot))
    .filter((orgTreeItem): orgTreeItem is TreeItem => Boolean(orgTreeItem));

  const hiddenSection = createHiddenSectionTreeItem(snapshot);

  const children: TreeItem[] = [];
  if (visibleOrgs.length > 0)
    children.push(...visibleOrgs);
  if (hiddenSection)
    children.push(hiddenSection);

  const treeChildren = children.length > 0
    ? children
    : new TreeItem({ label: 'No repositories cloned yet' });

  return new TreeItem({
    label: 'Cloned',
    children: treeChildren,
  });
}


// TODO: Add remember cloned repos when not logged option?
export function getClonedOthersTreeItem(): TreeItem {
  const sortedRepos = sortRepositoriesForCloned(User.clonedOtherRepos);
  return new TreeItem({
    label: 'Cloned - Others',
    children: parseChildren(sortedRepos, { userLogin: User.login }),
  });
}
