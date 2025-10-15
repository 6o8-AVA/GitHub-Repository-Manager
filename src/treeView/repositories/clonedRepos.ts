import path from 'path';
import fse from 'fs-extra';
import {
  type MessageItem,
  commands,
  env,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from 'vscode';
import { isGitDirty } from '../../commands/git/dirtiness/dirtiness';
import { noLocalSearchPaths } from '../../commands/searchClonedRepos/searchClonedRepos';
import { HiddenCloned } from '../../store/hiddenCloned';
import { type Organization, OrgStatus } from '../../store/organization';
import type { Repository } from '../../store/repository';
import { User } from '../../store/user';
import { TreeItem } from '../treeViewBase';
import { getEmptyOrgLabel } from './orgTreeUtils';
import { RepoItem } from './repoItem';
import { sortRepositoriesForCloned } from './sortOrder';


const CLONED_OTHERS_KEY = '__others__';
const CLONED_OTHERS_LABEL = 'Others';

type HiddenSnapshot = ReturnType<typeof HiddenCloned.getSnapshot>;


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
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.openContainingFolder', ({ repo }: RepoItem & { orgLogin?: string }) =>
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
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.hideRepo', (item: RepoItem & { orgLogin?: string }) => {
    const orgLogin = item.orgLogin ?? item.repo.ownerLogin;
    const repoUrl = item.repo.url;
    HiddenCloned.hideRepo(orgLogin, repoUrl);
  });

  // Unhide organization
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.unhideOrg', (item: TreeItem & { orgLogin?: string }) => {
    if (item.orgLogin)
      HiddenCloned.unhideOrg(item.orgLogin);
  });

  // Unhide repository
  commands.registerCommand('githubRepoMgr.commands.clonedRepos.unhideRepo', (item: RepoItem & { orgLogin?: string }) => {
    const orgLogin = item.orgLogin ?? item.repo.ownerLogin;
    const repoUrl = item.repo.url;
    HiddenCloned.unhideRepo(orgLogin, repoUrl);
  });
}

type ParseChildrenOptions = {
  userLogin?: string;
  includeOwner?: boolean;
  contextValue?: string;
  commandName?: string;
  orgLogin?: string;
};

function parseChildren(clonedRepos: Repository[], options: ParseChildrenOptions = {}): TreeItem[] {
  const { userLogin, includeOwner, contextValue, commandName, orgLogin } = options;

  return clonedRepos.map((repo) => {
    const item = new RepoItem({
      repo,
      contextValue: contextValue ?? 'githubRepoMgr.context.clonedRepo',
      command: {
        // We wrap the repo in {} because we may call the cloneTo from the right click, and it passes the RepoItem.
        command: commandName ?? 'githubRepoMgr.commands.clonedRepos.open',
        arguments: [{ repo }],
      },
      includeOwner: includeOwner ?? (userLogin ? repo.ownerLogin !== userLogin : false),
    });
    Object.assign(item, { orgLogin: orgLogin ?? repo.ownerLogin });
    return item;
  });
}

function attachOrgMetadata(treeItem: TreeItem, orgLogin: string): TreeItem {
  return Object.assign(treeItem, { orgLogin });
}

function createVisibleOrgTreeItem(org: { name: string; login: string; clonedRepos: Repository[]; repositories: Repository[]; status: OrgStatus }, snapshot: HiddenSnapshot): TreeItem | undefined {
  const hiddenRepos = snapshot.repos.get(org.login) ?? new Set<string>();
  const visibleOverrides = snapshot.orgVisibleRepos.get(org.login) ?? new Set<string>();
  const isOrgHidden = snapshot.orgs.has(org.login);

  if (isOrgHidden && visibleOverrides.size === 0)
    return undefined;

  const sortedRepos = sortRepositoriesForCloned(org.clonedRepos, org.login);
  const filteredRepos = sortedRepos.filter((repo) => {
    if (isOrgHidden)
      return visibleOverrides.has(repo.url);
    return !hiddenRepos.has(repo.url);
  });

  const hasVisibleRepos = filteredRepos.length > 0;

  if (!isOrgHidden && !hasVisibleRepos && org.status === OrgStatus.loaded)
    return undefined;

  const children = hasVisibleRepos
    ? parseChildren(filteredRepos, { userLogin: org.login, orgLogin: org.login })
    : [new TreeItem({ label: isOrgHidden ? 'No repositories selected' : getEmptyOrgLabel(org.status) })];

  const contextValue = isOrgHidden
    ? 'githubRepoMgr.context.partiallyHiddenClonedOrg'
    : 'githubRepoMgr.context.clonedOrg';

  return attachOrgMetadata(
    new TreeItem({
      label: `${org.name}`,
      children,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue,
      description: isOrgHidden ? 'hidden org · showing selected repositories' : undefined,
    }),
    org.login,
  );
}

function createOthersTreeItem(snapshot: HiddenSnapshot): TreeItem | undefined {
  const isHidden = snapshot.orgs.has(CLONED_OTHERS_KEY);
  const visibleOverrides = snapshot.orgVisibleRepos.get(CLONED_OTHERS_KEY) ?? new Set<string>();

  if (isHidden && visibleOverrides.size === 0)
    return undefined;

  const hiddenRepos = snapshot.repos.get(CLONED_OTHERS_KEY) ?? new Set<string>();
  const sortedRepos = sortRepositoriesForCloned(User.clonedOtherRepos);
  const filteredRepos = sortedRepos.filter((repo) => {
    if (isHidden)
      return visibleOverrides.has(repo.url);
    return !hiddenRepos.has(repo.url);
  });

  if (!isHidden && filteredRepos.length === 0)
    return undefined;

  const children = filteredRepos.length > 0
    ? parseChildren(filteredRepos, {
      userLogin: User.login,
      includeOwner: false,
      orgLogin: CLONED_OTHERS_KEY,
    })
    : [new TreeItem({ label: 'No repositories selected' })];

  const contextValue = isHidden
    ? 'githubRepoMgr.context.partiallyHiddenClonedOrg'
    : 'githubRepoMgr.context.clonedOrg';

  return attachOrgMetadata(
    new TreeItem({
      label: CLONED_OTHERS_LABEL,
      children,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue,
      description: isHidden ? 'hidden org · showing selected repositories' : undefined,
    }),
    CLONED_OTHERS_KEY,
  );
}

function createHiddenSectionTreeItem(snapshot: HiddenSnapshot): TreeItem | undefined {
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

function createHiddenOrgTreeItem(orgLogin: string, snapshot: HiddenSnapshot): TreeItem | undefined {
  const isOthers = orgLogin === CLONED_OTHERS_KEY;
  const org = isOthers ? undefined : User.organizations.find((o) => o.login === orgLogin);
  const orgName = isOthers ? CLONED_OTHERS_LABEL : org?.name ?? orgLogin;
  const isOrgHidden = snapshot.orgs.has(orgLogin);
  const overrides = snapshot.orgVisibleRepos.get(orgLogin) ?? new Set<string>();

  const repoItems = createHiddenRepoItems({ orgLogin, snapshot, org, visibleOverrides: overrides });

  // Don't show the org if there are no actual repos to display
  if (!isOrgHidden && repoItems.length === 0)
    return undefined;

  const hasOverrides = overrides.size > 0;
  const children = repoItems.length > 0
    ? repoItems
    : [new TreeItem({ label: hasOverrides ? 'No hidden repositories' : 'No repositories found' })];

  return attachOrgMetadata(
    new TreeItem({
      label: orgName,
      description: isOrgHidden
        ? (hasOverrides ? 'hidden org · showing selected repositories' : 'hidden org')
        : undefined,
      children,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: 'githubRepoMgr.context.hiddenClonedOrg',
    }),
    orgLogin,
  );
}

function createHiddenRepoItems(args: {
  orgLogin: string;
  snapshot: HiddenSnapshot;
  org?: Organization;
  visibleOverrides: Set<string>;
}): TreeItem[] {
  const { orgLogin, snapshot, org, visibleOverrides } = args;
  const hiddenRepoUrlsSet = snapshot.repos.get(orgLogin);
  const isOrgHidden = snapshot.orgs.has(orgLogin);
  const overrideSet = visibleOverrides;

  if (orgLogin === CLONED_OTHERS_KEY) {
    const sourceRepos = User.clonedOtherRepos;

    if (isOrgHidden) {
      const hiddenRepos = sourceRepos.filter((repo) => !overrideSet.has(repo.url));
      const sortedRepos = sortRepositoriesForCloned(hiddenRepos);
      const repos = parseChildren(sortedRepos, {
        userLogin: User.login,
        includeOwner: false,
        contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
        commandName: 'githubRepoMgr.commands.clonedRepos.open',
        orgLogin: CLONED_OTHERS_KEY,
      });
      return repos;
    }

    if (!hiddenRepoUrlsSet || hiddenRepoUrlsSet.size === 0)
      return [];

    const hiddenRepos = sourceRepos.filter((repo) => hiddenRepoUrlsSet.has(repo.url) && !overrideSet.has(repo.url));
    const sortedRepos = sortRepositoriesForCloned(hiddenRepos);

    if (sortedRepos.length === 0)
      return [];

    return parseChildren(sortedRepos, {
      userLogin: User.login,
      includeOwner: false,
      contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
      commandName: 'githubRepoMgr.commands.clonedRepos.open',
      orgLogin: CLONED_OTHERS_KEY,
    });
  }

  if (!org)
    return []; // Don't show org if not found

  if (isOrgHidden) {
    const hiddenRepos = org.clonedRepos.filter((repo) => !overrideSet.has(repo.url));
    const sortedRepos = sortRepositoriesForCloned(hiddenRepos, org.login);
    const repos = parseChildren(sortedRepos, {
      userLogin: org.login,
      contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
      commandName: 'githubRepoMgr.commands.clonedRepos.open',
      orgLogin: org.login,
    });
    return repos;
  }

  if (!hiddenRepoUrlsSet || hiddenRepoUrlsSet.size === 0)
    return []; // Don't show org if no hidden repos

  const hiddenRepos = org.clonedRepos.filter((repo) => hiddenRepoUrlsSet.has(repo.url) && !overrideSet.has(repo.url));
  const sortedRepos = sortRepositoriesForCloned(hiddenRepos, org.login);

  if (sortedRepos.length === 0)
    return []; // Don't show org if hidden repos not found

  return parseChildren(sortedRepos, {
    userLogin: org.login,
    contextValue: 'githubRepoMgr.context.hiddenClonedRepo',
    commandName: 'githubRepoMgr.commands.clonedRepos.open',
    orgLogin: org.login,
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

  const visibleOrgs: TreeItem[] = [];
  User.organizations.forEach((org) => {
    const item = createVisibleOrgTreeItem(org, snapshot);
    if (item)
      visibleOrgs.push(item);
  });

  const othersTreeItem = createOthersTreeItem(snapshot);
  const hiddenSection = createHiddenSectionTreeItem(snapshot);

  const children: TreeItem[] = [];
  if (visibleOrgs.length > 0)
    children.push(...visibleOrgs);
  if (othersTreeItem)
    children.push(othersTreeItem);
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
