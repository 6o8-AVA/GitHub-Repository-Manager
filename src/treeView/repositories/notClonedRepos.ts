import vscode, { commands } from 'vscode';
import { uiCloneTo } from '../../commandsUi/uiCloneTo';
import { HiddenNotCloned } from '../../store/hiddenNotCloned';
import type { Organization } from '../../store/organization';
import type { Repository } from '../../store/repository';
import { User } from '../../store/user';
import { TreeItem } from '../treeViewBase';
import { getEmptyOrgLabel } from './orgTreeUtils';
import { RepoItem } from './repoItem';
import { sortRepositoriesForOrganization } from './sortOrder';


export function activateNotClonedRepos(): void {
  // Clone repo to [open select repo location]. You must pass the repo as arg.
  commands.registerCommand('githubRepoMgr.commands.notClonedRepos.cloneTo',
    ({ repo }: RepoItem) => uiCloneTo({
      name: repo.name, ownerLogin: repo.ownerLogin, reloadRepos: true,
    }));

  commands.registerCommand('githubRepoMgr.commands.notClonedRepos.hideOrg', (item: TreeItem & { orgLogin?: string }) => {
    const orgLogin = item.orgLogin;
    if (!orgLogin)
      return;
    HiddenNotCloned.hideOrg(orgLogin);
  });

  commands.registerCommand('githubRepoMgr.commands.notClonedRepos.hideRepo', (item: (RepoItem | TreeItem) & { orgLogin?: string; repoUrl?: string }) => {
    const orgLogin = item.orgLogin ?? (item instanceof RepoItem ? item.repo.ownerLogin : undefined);
    const repoUrl = item.repoUrl ?? (item instanceof RepoItem ? item.repo.url : undefined);
    if (!orgLogin || !repoUrl)
      return;
    HiddenNotCloned.hideRepo(orgLogin, repoUrl);
  });

  commands.registerCommand('githubRepoMgr.commands.notClonedRepos.unhideOrg', (item: TreeItem & { orgLogin?: string }) => {
    const orgLogin = item.orgLogin;
    if (!orgLogin)
      return;
    HiddenNotCloned.unhideOrg(orgLogin);
  });

  commands.registerCommand('githubRepoMgr.commands.notClonedRepos.unhideRepo', (item: (RepoItem | TreeItem) & { orgLogin?: string; repoUrl?: string }) => {
    const orgLogin = item.orgLogin ?? (item instanceof RepoItem ? item.repo.ownerLogin : undefined);
    const repoUrl = item.repoUrl ?? (item instanceof RepoItem ? item.repo.url : undefined);
    if (!orgLogin || !repoUrl)
      return;
    HiddenNotCloned.unhideRepo(orgLogin, repoUrl);
  });
}

export function getNotClonedTreeItem(): TreeItem {
  const snapshot = HiddenNotCloned.getSnapshot();

  const visibleOrgs: TreeItem[] = User.organizations
    .filter((org) => !snapshot.orgs.has(org.login))
    .map((org) => createVisibleOrgTreeItem(org, snapshot));

  const hiddenSection = createHiddenSectionTreeItem(snapshot);

  return new TreeItem({
    label: 'Not Cloned',
    children: [...visibleOrgs, hiddenSection],
  });
}


type OrgTreeItem = TreeItem & {
  orgLogin: string;
  organization?: Organization;
  hiddenMode: 'visible' | 'hiddenOrg' | 'hiddenRepos';
};

type RepoTreeItem = (RepoItem | TreeItem) & {
  orgLogin: string;
  repoUrl: string;
};

function attachOrgMetadata<T extends TreeItem>(item: T, metadata: {
  orgLogin: string;
  organization?: Organization;
  hiddenMode: OrgTreeItem['hiddenMode'];
}): OrgTreeItem {
  return Object.assign(item, metadata);
}

function attachRepoMetadata<T extends RepoItem | TreeItem>(item: T, metadata: {
  orgLogin: string;
  repoUrl: string;
}): RepoTreeItem {
  return Object.assign(item, metadata);
}

function getTreeItemLabel(item: TreeItem): string {
  const { label } = item;
  if (typeof label === 'string')
    return label;
  return label?.label ?? '';
}

type HiddenSnapshot = ReturnType<typeof HiddenNotCloned.getSnapshot>;

function createVisibleOrgTreeItem(org: Organization, snapshot: HiddenSnapshot): OrgTreeItem {
  const hiddenRepos = snapshot.repos.get(org.login) ?? new Set<string>();
  const sortedRepos = sortRepositoriesForOrganization(org.notClonedRepos)
    .filter((repo) => !hiddenRepos.has(repo.url));

  const children = (sortedRepos.length > 0
    ? sortedRepos.map((repo) => createVisibleRepoItem(org, repo))
    : [new TreeItem({ label: getEmptyOrgLabel(org.status) })]);

  const item = new TreeItem({
    label: `${org.name}`,
    children,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
    contextValue: 'githubRepoMgr.context.notClonedOrg',
  });

  return attachOrgMetadata(item, {
    orgLogin: org.login,
    organization: org,
    hiddenMode: 'visible',
  });
}

function createVisibleRepoItem(org: Organization, repo: Repository): RepoTreeItem {
  const item = new RepoItem({
    repo,
    contextValue: 'githubRepoMgr.context.notClonedRepo',
    command: {
      command: 'githubRepoMgr.commands.notClonedRepos.cloneTo',
      arguments: [{ repo }],
    },
  });

  return attachRepoMetadata(item, {
    orgLogin: org.login,
    repoUrl: repo.url,
  });
}

function createHiddenSectionTreeItem(snapshot: HiddenSnapshot): TreeItem {
  const hiddenOrgItems: OrgTreeItem[] = [];

  const hiddenOrgLogins = Array.from(snapshot.orgs);
  hiddenOrgLogins.forEach((orgLogin) => {
    const org = User.organizations.find((candidate) => candidate.login === orgLogin);
    hiddenOrgItems.push(createHiddenOrgTreeItem({
      org,
      orgLogin,
      hiddenMode: 'hiddenOrg',
      repoUrls: undefined,
    }));
  });

  for (const [orgLogin, repoUrls] of snapshot.repos.entries()) {
    if (snapshot.orgs.has(orgLogin) || repoUrls.size === 0)
      continue;
    const org = User.organizations.find((candidate) => candidate.login === orgLogin);
    hiddenOrgItems.push(createHiddenOrgTreeItem({
      org,
      orgLogin,
      hiddenMode: 'hiddenRepos',
      repoUrls: Array.from(repoUrls),
    }));
  }

  hiddenOrgItems.sort((a, b) => getTreeItemLabel(a).localeCompare(getTreeItemLabel(b), undefined, { sensitivity: 'base' }));

  const hasHiddenItems = hiddenOrgItems.length > 0;

  const children: TreeItem[] = hasHiddenItems
    ? hiddenOrgItems
    : [new TreeItem({ label: 'No hidden organizations or repositories' })];

  return new TreeItem({
    label: 'Hidden',
    contextValue: 'githubRepoMgr.context.hiddenNotClonedSection',
    children,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  });
}

type CreateHiddenOrgArgs = {
  org?: Organization;
  orgLogin: string;
  hiddenMode: OrgTreeItem['hiddenMode'];
  repoUrls?: string[];
};

function createHiddenOrgTreeItem({ org, orgLogin, hiddenMode, repoUrls }: CreateHiddenOrgArgs): OrgTreeItem {
  const label = org?.name ?? orgLogin;
  const repoItems = createHiddenRepoItems({ org, orgLogin, hiddenMode, repoUrls });

  const item = new TreeItem({
    label,
    contextValue: 'githubRepoMgr.context.hiddenNotClonedOrg',
    description: hiddenMode === 'hiddenOrg' ? 'organization hidden' : undefined,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
    children: repoItems.length > 0 ? repoItems : [new TreeItem({ label: 'No repositories found' })],
  });

  return attachOrgMetadata(item, {
    orgLogin,
    organization: org,
    hiddenMode,
  });
}

type CreateHiddenRepoItemsArgs = {
  org?: Organization;
  orgLogin: string;
  hiddenMode: OrgTreeItem['hiddenMode'];
  repoUrls?: string[];
};

function createHiddenRepoItems({ org, orgLogin, hiddenMode, repoUrls }: CreateHiddenRepoItemsArgs): RepoTreeItem[] {
  if (hiddenMode === 'hiddenOrg') {
    if (!org)
      return [];
    const sorted = sortRepositoriesForOrganization(org.notClonedRepos);
    return sorted.map((repo) => createHiddenRepoItem(orgLogin, repo));
  }

  const urls = repoUrls ?? [];
  if (urls.length === 0)
    return [];

  if (!org)
    return urls.map((url) => createFallbackHiddenRepoItem(orgLogin, url));

  const repoByUrl = new Map<string, Repository>();
  org.repositories.forEach((repo) => { repoByUrl.set(repo.url, repo); });

  const matchingRepos: Repository[] = [];
  urls.forEach((url) => {
    const repo = repoByUrl.get(url);
    if (repo)
      matchingRepos.push(repo);
  });

  const items: RepoTreeItem[] = [];
  const sortedMatching = sortRepositoriesForOrganization(matchingRepos);
  const matchedUrls = new Set(sortedMatching.map((repo) => repo.url));

  sortedMatching.forEach((repo) => {
    items.push(createHiddenRepoItem(orgLogin, repo));
  });

  urls.forEach((url) => {
    if (!matchedUrls.has(url))
      items.push(createFallbackHiddenRepoItem(orgLogin, url));
  });

  return items;
}

function createHiddenRepoItem(orgLogin: string, repo: Repository): RepoTreeItem {
  const item = new RepoItem({
    repo,
    contextValue: 'githubRepoMgr.context.hiddenNotClonedRepo',
    command: {
      command: 'githubRepoMgr.commands.notClonedRepos.cloneTo',
      arguments: [{ repo }],
    },
  });

  return attachRepoMetadata(item, {
    orgLogin,
    repoUrl: repo.url,
  });
}

function createFallbackHiddenRepoItem(orgLogin: string, repoUrl: string): RepoTreeItem {
  const label = repoUrl.split('/').pop() ?? repoUrl;
  const item = new TreeItem({
    label,
    tooltip: repoUrl,
    contextValue: 'githubRepoMgr.context.hiddenNotClonedRepo',
    command: undefined,
  });

  return attachRepoMetadata(item, { orgLogin, repoUrl });
}
