import { EventEmitter } from 'vscode';
import type { HiddenNotClonedState } from '../main/storage';
import { Storage } from '../main/storage';


type HiddenSnapshot = {
  orgs: Set<string>;
  repos: Map<string, Set<string>>;
};

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
    .sort(compareStrings);
}

function normalizeState(state: HiddenNotClonedState): HiddenNotClonedState {
  const orgs = uniqueSorted(state.orgs);
  const reposEntries = Object.entries(state.repos)
    .map(([orgLogin, repoUrls]) => [orgLogin, uniqueSorted(repoUrls)] as const)
    .filter(([, urls]) => urls.length > 0);

  return {
    orgs,
    repos: Object.fromEntries(reposEntries),
  };
}

function cloneState(state: HiddenNotClonedState): HiddenNotClonedState {
  return {
    orgs: [...state.orgs],
    repos: Object.fromEntries(
      Object.entries(state.repos).map(([orgLogin, repoUrls]) => [orgLogin, [...repoUrls]]),
    ),
  };
}

class HiddenNotClonedStore {
  private state: HiddenNotClonedState;
  private readonly emitter = new EventEmitter<void>();
  private isInitialized = false;

  readonly onDidChange = this.emitter.event;

  constructor() {
    this.state = normalizeState({ orgs: [], repos: {} });

    if (Storage.isReady())
      this.initializeFromStorage();

    Storage.onDidActivate(() => {
      this.initializeFromStorage();
    });
  }

  private initializeFromStorage(): void {
    const stored = normalizeState(Storage.hiddenNotCloned.get());
    this.state = stored;
    this.isInitialized = true;
    this.emitter.fire();
  }

  private ensureInitialized(): void {
    if (this.isInitialized)
      return;
    if (!Storage.isReady())
      return;
    this.initializeFromStorage();
  }

  private persist(): void {
    if (!this.isInitialized)
      return;
    if (Storage.isReady())
      void Storage.hiddenNotCloned.set(cloneState(this.state));
    this.emitter.fire();
  }

  getSnapshot(): HiddenSnapshot {
    this.ensureInitialized();
    return {
      orgs: new Set(this.state.orgs),
      repos: new Map(
        Object.entries(this.state.repos)
          .map(([orgLogin, repoUrls]) => [orgLogin, new Set(repoUrls)]),
      ),
    };
  }

  hasHiddenItems(): boolean {
    this.ensureInitialized();
    if (this.state.orgs.length > 0)
      return true;
    return Object.values(this.state.repos).some((urls) => urls.length > 0);
  }

  isOrgHidden(orgLogin: string): boolean {
    this.ensureInitialized();
    return this.state.orgs.includes(orgLogin);
  }

  hideOrg(orgLogin: string): void {
    this.ensureInitialized();
    if (!this.isInitialized)
      return;
    const normalizedLogin = orgLogin.trim();
    if (!normalizedLogin.length || this.isOrgHidden(normalizedLogin))
      return;
    this.state.orgs.push(normalizedLogin);
    this.state.orgs.sort(compareStrings);
    delete this.state.repos[normalizedLogin];
    this.persist();
  }

  unhideOrg(orgLogin: string): void {
    this.ensureInitialized();
    if (!this.isInitialized)
      return;
    const normalizedLogin = orgLogin.trim();
    if (!normalizedLogin.length)
      return;
    const index = this.state.orgs.indexOf(normalizedLogin);
    if (index === -1)
      return;
    this.state.orgs.splice(index, 1);
    delete this.state.repos[normalizedLogin];
    this.persist();
  }

  getHiddenRepoUrls(orgLogin: string): string[] {
    this.ensureInitialized();
    return [...(this.state.repos[orgLogin] ?? [])];
  }

  isRepoHidden(orgLogin: string, repoUrl: string): boolean {
    this.ensureInitialized();
    return this.state.repos[orgLogin]?.includes(repoUrl) ?? false;
  }

  hideRepo(orgLogin: string, repoUrl: string): void {
    this.ensureInitialized();
    if (!this.isInitialized)
      return;
    const normalizedLogin = orgLogin.trim();
    const normalizedUrl = repoUrl.trim();
    if (!normalizedLogin.length || !normalizedUrl.length)
      return;

    if (this.isOrgHidden(normalizedLogin))
      return; // Org hidden overrides repo-level hidden state.

    const repos = this.state.repos[normalizedLogin] ?? [];
    if (repos.includes(normalizedUrl))
      return;

    repos.push(normalizedUrl);
    repos.sort(compareStrings);
    this.state.repos[normalizedLogin] = repos;
    this.persist();
  }

  unhideRepo(orgLogin: string, repoUrl: string): void {
    this.ensureInitialized();
    if (!this.isInitialized)
      return;
    const normalizedLogin = orgLogin.trim();
    const normalizedUrl = repoUrl.trim();
    if (!normalizedLogin.length || !normalizedUrl.length)
      return;

    const repos = this.state.repos[normalizedLogin];
    if (!repos)
      return;

    const index = repos.indexOf(normalizedUrl);
    if (index === -1)
      return;

    repos.splice(index, 1);
    if (repos.length === 0)
      delete this.state.repos[normalizedLogin];

    this.persist();
  }
}

export const HiddenNotCloned = new HiddenNotClonedStore();
