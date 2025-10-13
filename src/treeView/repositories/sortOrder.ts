import { Storage } from '../../main/storage';
import type { Repository } from '../../store/repository';


export type RepositorySortOrder = 'alphabetical' | 'lastUpdated';

const defaultSortOrder: RepositorySortOrder = 'lastUpdated';

let currentSortOrder: RepositorySortOrder | undefined;

export function initializeRepositorySortOrder(): void {
  currentSortOrder = Storage.repositorySortOrder.get();
}

export function getRepositorySortOrder(): RepositorySortOrder {
  if (!currentSortOrder)
    initializeRepositorySortOrder();
  return currentSortOrder ?? defaultSortOrder;
}

export async function setRepositorySortOrder(order: RepositorySortOrder): Promise<void> {
  currentSortOrder = order;
  await Storage.repositorySortOrder.set(order);
}

type SortInternalOptions = {
  userLogin?: string;
  prioritizeUserInAlphabetical?: boolean;
};

export function sortRepositoriesForCloned(repos: Repository[], userLogin?: string): Repository[] {
  return sortRepositoriesInternal(repos, {
    userLogin,
    prioritizeUserInAlphabetical: Boolean(userLogin),
  });
}

export function sortRepositoriesForOrganization(repos: Repository[]): Repository[] {
  return sortRepositoriesInternal(repos, {
    prioritizeUserInAlphabetical: false,
  });
}

function sortRepositoriesInternal(repos: Repository[], options: SortInternalOptions): Repository[] {
  const sorted = [...repos];
  const sortOrder = getRepositorySortOrder();

  if (sortOrder === 'lastUpdated')
    sorted.sort((a, b) => compareByUpdatedAt(a, b, options));
  else
    sorted.sort((a, b) => compareAlphabetical(a, b, options));

  return sorted;
}

function compareByUpdatedAt(a: Repository, b: Repository, options: SortInternalOptions): number {
  const aTime = getUpdatedAtTime(a);
  const bTime = getUpdatedAtTime(b);

  if (aTime !== bTime)
    return bTime - aTime;

  return compareAlphabetical(a, b, options);
}

function getUpdatedAtTime(repo: Repository): number {
  if (repo.type === 'remote')
    return repo.updatedAt.getTime();
  return 0;
}

function compareAlphabetical(a: Repository, b: Repository, options: SortInternalOptions): number {
  const { userLogin, prioritizeUserInAlphabetical } = options;

  if (prioritizeUserInAlphabetical && userLogin) {
    const aIsUser = a.ownerLogin === userLogin;
    const bIsUser = b.ownerLogin === userLogin;

    if (aIsUser && !bIsUser)
      return -1;
    if (!aIsUser && bIsUser)
      return 1;
  }

  return compareByOwnerAndName(a, b);
}

function compareByOwnerAndName(a: Repository, b: Repository): number {
  const ownerA = a.ownerLogin.toLocaleUpperCase();
  const ownerB = b.ownerLogin.toLocaleUpperCase();

  if (ownerA < ownerB)
    return -1;
  if (ownerA > ownerB)
    return 1;

  const nameA = a.name.toLocaleUpperCase();
  const nameB = b.name.toLocaleUpperCase();

  if (nameA < nameB)
    return -1;
  if (nameA > nameB)
    return 1;

  return 0;
}
