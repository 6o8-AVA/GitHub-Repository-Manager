import vscode, { commands } from 'vscode';
import { uiCloneTo } from '../../commandsUi/uiCloneTo';
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
}

export function getNotClonedTreeItem(): TreeItem {
  const orgs: TreeItem[] = User.organizations.map((org) => {
    const sortedRepos = sortRepositoriesForOrganization(org.notClonedRepos);
    return new TreeItem({
      label: `${org.name}`,
      children: (org.repositories.length
        ? sortedRepos.map((repo) => new RepoItem({
          repo,
          contextValue: 'githubRepoMgr.context.notClonedRepo',
          command: {
            // We wrap the repo in {} because we may call the cloneTo from the right click, and it passes the RepoItem.
            command: 'githubRepoMgr.commands.notClonedRepos.cloneTo',
            arguments: [{ repo }],
          },
        }))
        : new TreeItem({ label: getEmptyOrgLabel(org.status) })),
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
    });
  });

  return new TreeItem({
    label: 'Not Cloned',
    children: orgs,
  });
}
