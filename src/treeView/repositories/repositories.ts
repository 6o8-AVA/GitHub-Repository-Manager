import * as vscode from 'vscode';
import { uiCreateRepo } from '../../commandsUi/uiCreateRepo';
import { uiPublish } from '../../commandsUi/uiPublish/uiPublish';
import { Configs } from '../../main/configs';
import { HiddenNotCloned } from '../../store/hiddenNotCloned';
import { RepositoriesState, User } from '../../store/user';
import { BaseTreeDataProvider, TreeItem } from '../treeViewBase';
import { activateClonedRepos, getClonedOthersTreeItem, getClonedTreeItem } from './clonedRepos';
import { activateNotClonedRepos, getNotClonedTreeItem } from './notClonedRepos';
import type { RepoItem } from './repoItem';
import {
  type RepositorySortOrder,
  getRepositorySortOrder,
  initializeRepositorySortOrder,
  setRepositorySortOrder,
} from './sortOrder';


const REPOSITORY_SORT_ORDER_CONTEXT_KEY = 'githubRepoMgr.repositories.sortOrder';


export function activateTreeViewRepositories(): void {
  const repositoriesTreeDataProvider = new TreeDataProvider();
  initializeRepositorySortOrder();
  void syncRepositorySortOrderContext();

  vscode.window.registerTreeDataProvider('githubRepoMgr.views.repositories',
    repositoriesTreeDataProvider);
  User.subscribe('repos', () => { repositoriesTreeDataProvider.refresh(); });
  HiddenNotCloned.onDidChange(() => { repositoriesTreeDataProvider.refresh(); });

  // Access GitHub Web Page
  vscode.commands.registerCommand('githubRepoMgr.commands.repos.openWebPage', ({ repo }: RepoItem) =>
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(repo.url)));

  // Will have .git on the end.
  vscode.commands.registerCommand('githubRepoMgr.commands.repos.copyRepositoryUrl', ({ repo }: RepoItem) =>
    vscode.env.clipboard.writeText(`${repo.url}.git`));

  // Reload repos
  vscode.commands.registerCommand('githubRepoMgr.commands.repos.reload', () => User.reloadRepos());

  const selectSortOrder = async (order: RepositorySortOrder): Promise<void> => {
    const currentOrder = getRepositorySortOrder();

    if (currentOrder === order) {
      await syncRepositorySortOrderContext();
      return;
    }

    await setRepositorySortOrder(order);
    await setRepositorySortOrderContext(order);
    repositoriesTreeDataProvider.refresh();
  };

  vscode.commands.registerCommand('githubRepoMgr.commands.repos.sort.lastUpdated', async () => {
    await selectSortOrder('lastUpdated');
  });

  vscode.commands.registerCommand('githubRepoMgr.commands.repos.sort.alphabetical', async () => {
    await selectSortOrder('alphabetical');
  });

  // Create Repo
  vscode.commands.registerCommand('githubRepoMgr.commands.repos.createRepo', () => uiCreateRepo());


  vscode.commands.registerCommand('githubRepoMgr.commands.repos.publish', () => uiPublish());

  // Sets the default directory for cloning
  vscode.commands.registerCommand('githubRepoMgr.commands.pick.defaultCloneDirectory', async () => {
    const thenable = await vscode.window.showOpenDialog({
      defaultUri: vscode.Uri.file(Configs.defaultCloneToDir),
      openLabel: `Select as default directory`,
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });

    if (thenable) {
      // 3rd param as true to change global setting. Else wouldn't work.
      await vscode.workspace.getConfiguration('git').update('defaultCloneDirectory', thenable[0]!.fsPath, true);
      await User.reloadRepos();
    }
  });

  activateClonedRepos();
  activateNotClonedRepos();
}


class TreeDataProvider extends BaseTreeDataProvider {
  constructor() { super(); }
  getData() {
    switch (User.repositoriesState) {
      case RepositoriesState.none:
        return []; // So on not logged user it won't be 'Loading...' for ever.
      case RepositoriesState.fetching:
        return new TreeItem({
          label: 'Loading...',
        });
      case RepositoriesState.partial:
      case RepositoriesState.fullyLoaded: {
        const clonedFromOthers = User.clonedOtherRepos.length
          ? [getClonedOthersTreeItem()]
          : [];
        return [getClonedTreeItem(), ...clonedFromOthers, getNotClonedTreeItem()];
      }
    }
  }

  protected makeData() {
    this.data = this.getData();
  }
}


async function syncRepositorySortOrderContext(): Promise<void> {
  await setRepositorySortOrderContext(getRepositorySortOrder());
}

async function setRepositorySortOrderContext(order: RepositorySortOrder): Promise<void> {
  await vscode.commands.executeCommand('setContext', REPOSITORY_SORT_ORDER_CONTEXT_KEY, order);
}
