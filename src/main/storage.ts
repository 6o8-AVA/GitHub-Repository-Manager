import type vscode from 'vscode';
import { EventEmitter } from 'vscode';


let context: vscode.ExtensionContext | undefined;
const didActivateEmitter = new EventEmitter<void>();
let isActivated = false;

export type HiddenNotClonedState = {
  orgs: string[];
  repos: Record<string, string[]>;
  orgVisibleRepos: Record<string, string[]>;
};

export type HiddenClonedState = {
  orgs: string[];
  repos: Record<string, string[]>;
  orgVisibleRepos: Record<string, string[]>;
};

function createDefaultHiddenNotClonedState(): HiddenNotClonedState {
  return {
    orgs: [],
    repos: {},
    orgVisibleRepos: {},
  };
}

function createDefaultHiddenClonedState(): HiddenClonedState {
  return {
    orgs: [],
    repos: {},
    orgVisibleRepos: {},
  };
}


// https://stackoverflow.com/a/57857305

function get<T>(key: string): T | undefined;
function get<T>(key: string, defaultValue: T): T;
function get<T>(key: string, defaultValue?: T): T | undefined;
function get<T>(key: string, defaultValue?: T): T | undefined {
  if (!context)
    return defaultValue;
  return context.globalState.get(key, defaultValue as T);
}
function set<T>(key: string, value: T) {
  if (!context)
    return Promise.resolve();
  return context.globalState.update(key, value);
}
function remove(key: string) {
  if (!context)
    return Promise.resolve();
  return context.globalState.update(key, undefined);
}


type ItemCommon = {
  additionalKey: string | string[];
};
class Item<T> {
  constructor(private key: string) { }
  private getKey(additionalKey: string | string[]) {
    const array = [this.key];
    array.push(...(typeof additionalKey === 'string' ? [additionalKey] : additionalKey));
    return array.join('.');
  }

  get<D = T>(args: ItemCommon & { defaultValue: D }): T | D {
    return get(this.getKey(args.additionalKey), args.defaultValue);
  }

  set(args: ItemCommon & { value: T }) {
    return set(this.getKey(args.additionalKey), args.value);
  }

  remove(args: ItemCommon) { return remove(this.getKey(args.additionalKey)); }
}

class StorageClass {
  activate(contextArg: vscode.ExtensionContext) {
    context = contextArg;
    isActivated = true;
    didActivateEmitter.fire();
  }

  // Call it favorites2 if change its schema
  item = new Item<boolean>('favorites');
  favoritesRepos = {
    _item: new Item<boolean>('favorites'),
    isFavorite(repoName: string): boolean { return this._item.get({ additionalKey: repoName, defaultValue: false }); },
    setFavorite(repoName: string) { return this._item.set({ additionalKey: repoName, value: true }); },
    unsetFavorite(repoName: string) { return this._item.set({ additionalKey: repoName, value: false }); },
  };

  repositorySortOrder = {
    _item: new Item<'alphabetical' | 'lastUpdated'>('repositorySortOrder'),
    get(): 'alphabetical' | 'lastUpdated' {
      return this._item.get({ additionalKey: 'value', defaultValue: 'lastUpdated' });
    },
    set(value: 'alphabetical' | 'lastUpdated') {
      return this._item.set({ additionalKey: 'value', value });
    },
  };

  hiddenNotCloned = {
    _item: new Item<HiddenNotClonedState>('hiddenNotCloned'),
    get(): HiddenNotClonedState {
      const stored = this._item.get({
        additionalKey: 'state',
        defaultValue: createDefaultHiddenNotClonedState(),
      });
      return {
        orgs: [...stored.orgs],
        repos: Object.fromEntries(
          Object.entries(stored.repos).map(([key, value]) => [key, [...value]]),
        ),
        orgVisibleRepos: Object.fromEntries(
          Object.entries(stored.orgVisibleRepos)
            .map(([key, value]) => [key, [...value]] as [string, string[]]),
        ),
      };
    },
    set(value: HiddenNotClonedState) {
      return this._item.set({ additionalKey: 'state', value });
    },
  };

  hiddenCloned = {
    _item: new Item<HiddenClonedState>('hiddenCloned'),
    get(): HiddenClonedState {
      const stored = this._item.get({
        additionalKey: 'state',
        defaultValue: createDefaultHiddenClonedState(),
      });
      const storedOrgVisibleRepos = (stored as unknown as { orgVisibleRepos?: Record<string, string[]> }).orgVisibleRepos ?? {};
      return {
        orgs: [...stored.orgs],
        repos: Object.fromEntries(
          Object.entries(stored.repos).map(([key, value]) => [key, [...value]]),
        ),
        orgVisibleRepos: Object.fromEntries(
          Object.entries(storedOrgVisibleRepos)
            .map(([key, value]) => [key, [...value]] as [string, string[]]),
        ),
      };
    },
    set(value: HiddenClonedState) {
      return this._item.set({ additionalKey: 'state', value });
    },
  };

  // Removes all keys
  // resetGlobalState() {
  //   // Forces the read of the private _value.
  //   const keys = Object.keys((context.globalState as any)._value);
  //   keys.forEach(key => remove(key));
  // }

  onDidActivate = didActivateEmitter.event;

  isReady(): boolean {
    return isActivated;
  }
}

export const Storage = new StorageClass();
