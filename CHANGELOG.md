# Change Log : GitHub Repository Manager

## 1.6.5 - 2025-10-14

### Improvements

- Hidden organizations in both the **Cloned** and **Not Cloned** trees can now surface selected repositories while keeping the rest hidden.
- Updated hidden section messaging so you can quickly tell when an organization is hidden but exposing specific repositories.
- Persistence upgraded to remember per-organization visibility overrides across both trees.

## 1.6.4 - 2025-10-14

### New Features

- Added a **Clone into Managed Directory** command that guides you through cloning into the configured default directory, automatically creating the target folder when it is missing.

### Improvements

- Adds **Cloned / Others** tree to surface the same metadata as primary repositories, including dirtiness indicators and remote details.
- Updated repository timestamps to match GitHub by reading the latest commit on the default branch.
- Aligned context menu actions so hidden "Others" repositories retain the same local open and navigation commands as visible ones.
- Hardened the managed clone workflow to avoid failures when the destination folder hierarchy does not exist.

## 1.6.3 - 2025-10-13

README updated to be more clear about features and cleanup to remove original author's promotional content.

## 1.6.2 - 2025-10-13

**Fork by 6o8 AVA *

This version represents a fork of the original extension, maintained and published under a new publisher while respecting the MIT License.

### New Features:

- **Hide/Unhide Organizations and Repositories**: Added commands to hide and unhide organizations and repositories in both cloned and not-cloned sections
    - Introduced `HiddenClonedStore` to manage hidden states for cloned repositories
    - Introduced `HiddenNotClonedStore` to manage hidden states for not-cloned repositories
    - Updated tree view to visually reflect hidden items
    - Enhanced storage structure to persist hidden states
- **Repository Sorting**: Implemented sorting functionality for repositories
    - Sort by last updated date
    - Sort alphabetically
    - Added sorting submenu in repositories view
    - Created dedicated sorting functions for cloned repositories and organizations
- **Relative Time Display**: Added relative time formatting for repository updates
    - Shows time since last update in human-readable format (years, months, weeks, days, hours, minutes, seconds)
    - Displayed alongside dirty state indicator in repository descriptions
- **Enhanced Cloned Repositories Management**:
    - Refactored repository parsing to better handle organization repositories
    - Improved label display for organization status
    - Added utility functions for organization label management
- **Filter Archived Repositories**: Repositories marked as archived are now automatically filtered out from both user and organization repository lists

### Bug Fixes:

- Fixed `isFork` query parameter handling in `getOrgRepos` function (changed to null for better filtering)
- Corrected indentation and formatting in `getOrgRepos` and `getUserRepos` functions for better code readability

### Changes in this Fork:

- Forked from [original repository](https://github.com/SrBrahma/GitHub-Repository-Manager) by Henrique Bruno
- Changed publisher from "henriqueBruno" to "6o8"
- Updated display name to "GitHub Repository Manager (6o8)"
- Updated author information (Mario Ricalde - git@V77z.com)
- Updated all repository URLs to point to https://github.com/6o8-AVA/GitHub-Repository-Manager
- Updated bug tracker URL
- Updated LICENSE to include fork maintainer copyright while preserving original author copyright
- Updated README to reflect fork status with proper attribution
- Removed original author's promotional content from README
- Changed branch references from "master" to "main"
- Verified and tested production build process
- Republished to VS Code Marketplace under new publisher
- Full compliance with MIT License terms

## 1.6.1

- Fix: 'setAsFavorite' is already registered [#50](https://github.com/SrBrahma/GitHub-Repository-Manager/pull/50).

## 1.6.0

- Added `Cloned - Others` tree for local repositories that aren't from the user or from an organization the user is part of. For now they must have a remote URL. Later I will add support for repositories without remote.
- Added `Delete` to cloned repositories' context menu. It has a confirmation and informs if the repository is dirty, but still, be careful!

## 1.5.1 - 2022-06-20

- Improved HEAD detection for repository cloning. It shall work for all the languages. [#42](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/42). Thanks, [lo-ca](https://github.com/lo-ca)!

## 1.5.0 - 2022-06-09

- Now using `globby` to find the dirs that contains .git. It's not only faster but fixes a strange bug where there wouldn't appear any cloned repositories.
- Removed `coloredIcons` option. It's just ugly if the repos don't have colors, certainly no one disabled that. Contact me if you did.
- Added `logs, src, lib, out, build` as default to `"githubRepositoryManager.directoriesToIgnore"`.
- Changed `"git.defaultCloneDirectory"` default from `3` to `2`.

## 1.4.0~1 - 2022-05-31

- Added button in the TreeView to set the "git.defaultCloneDirectory"! [#40](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/40) [#29](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/29)

## 1.3.3 - 2022-03-03

- Fixed the Remote HEAD obtaining for japanese Git - [#35](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/35). Thanks, [@YuuJinS](https://github.com/YuuJinS)!
- Fixed `tokenHidden` replace not being applied on all tokens in error messages.

## 1.3.2 - 2022-01-19

- Possible solution. Seems it was a git language output issue on `git remote show ...`. But no idea on why it isn't happenning on Dev.

## 1.3.1 - 2022-01-19

- Trying to fix #33 by setting specific dependencies version. Strangely, this error doesn't happen on dev.

## 1.3.0 - 2021/08/03

- Added support to create repositories for organizations the user has permission to.
- Organization repositories are now alphabetically ordered.
- Create repository and reload buttons now will only show up if user is logged.

## 1.2.0 - 2021/08/03

- Added "Create Repository for Current Files", our "Publish to GitHub". Finally, after more than a year, had the time, the will and the hacky ideas to have it working! [#2](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/2) Thanks [hediet](https://github.com/hediet) for the idea and the patience! 😅

## 1.1.0 - 2021/07/25

- Fixed repositories without remote HEAD (new repositories, empty) being marked as dirty.
- Dirtiness may now be marked as `E`, for errors.
- Fixed master/main issue.
- Fixed [#22](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/22)
- Refactor: Removed mz and rimraf packages. Added fs-extra and execa.

## 1.0.1 - 2021/07/23

- Fixed `directoriesToIgnore` setting not working.
- Removed `"clonedRepositoriesSearch."` section from `"githubRepositoryManager.clonedRepositoriesSearch.defaultCloneDirectoryMaximumDepth"` and `"githubRepositoryManager.clonedRepositoriesSearch.directoriesToIgnore"` settings.

- Removed excess keywords in package.json

## 1.0.0 - 2021/07/23

- Added the new VS Code GitHub Authentication. (!)
- Added dirty repository indicator ([#16](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/16)). Being ok and validated, later I will add a 'Delete' context menu option to non-dirty cloned repos. Please report errors.
- Repositories in Tree View are now colored. There is a new option to turn that off and use the old monochromatic style.
- Now using `main` instead of `master` [#18](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/18)
- Fixed `Fork of` in repository tooltip not being bold.
- Fixed the Account tree view displaying a "not logged" view at the initial credentials load. Now shows a "Loading...", as happens while logging in.
- Now shows local path of the cloned repository in its tooltip.
- Removed `showRepositoryCommandsIcons` option. If you used that, tell me!
- Removed the OAuth login system.
- Removed the manual token login system.
- Removed the save token setting as it is no longer used.
- Code big rewrite.
- Fixed some minor bugs / exceptions.

## 0.6.1 - Feb 03, 2021

- Fixed [#15](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/15).
- Fixed [#21](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/21). Thanks for the issue, [xCONFLiCTiONx](https://github.com/xCONFLiCTiONx)!
- Updated dependency packages.

## 0.6.0 - Aug 29, 2020

- Fixed breaking bug in Windows. It was not allowing opening the cloned repos. (in [#13](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/13), but isn't actually the original error in #13. #13 looks a VsCode bug in revealFileInOs using the current focused file instead of the provided file path (https://github.com/microsoft/vscode/issues/87804).)

Sorry, Windows users. It scares me when I think about how much time it has been happening. I will also fix the ugly repository tooltip spacing.

- Removed the cloned repository "Open Containing Directory" icon for now until VsCode fixes the API (https://github.com/microsoft/vscode/issues/105666). It can still be accessed with the right-click menu.

- Renamed aux.ts files to utils.ts. Windows doesn't allow 'aux' files.

- Fixed infinite 'Loading...' on error ([#12](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/12)). Also, if "git.defaultCloneDirectory" is not set, a message will be displayed under Cloned tree view.

- Fixed some other minor stuff

## 0.5.0 - Aug 06, 2020

Added support to organizations repositories ([#10](https://github.com/SrBrahma/GitHub-Repository-Manager/pull/10))! You will need to re-OAuth again or add the 'org:read' to your Personal Acess Token permissions.

Many thanks to [jonathan-fielding](https://github.com/jonathan-fielding) for this feature!

## 0.4.0 - Jul 08, 2020

Added 'one click to clone' setting ([#7](https://github.com/SrBrahma/GitHub-Repository-Manager/pull/7))

Added support to SSH cloned repositories to be found ([#9](https://github.com/SrBrahma/GitHub-Repository-Manager/pull/9))

Thanks to [jonathan-fielding](https://github.com/jonathan-fielding) for both pull requests!

## 0.3.6 - May 22, 2020 -> Today was the day of quick and small changes

Reworked the Repositories Tree View Item Tooltip. Looks better now. Unfortunatelly, the ":" aren't perfectly alignable, as the font is not monospaced. Yeah, it annoys me too. We have to accept it!!

<img src="https://raw.githubusercontent.com/SrBrahma/GitHub-Repository-Manager/master/images/changelog/0_3_6.png" alt="0.3.6">

## 0.3.5 - May 22, 2020

Clone command seems to be fully fixed. Now, on repository commit, it will have "master" as the default destination.

## 0.3.4 - May 22, 2020

Quick fix on Activity Bar name. It was still being called GitHub Repository Loader (early name) instead of Manager.

## 0.3.3 - May 22, 2020

Fixed private repositories not showing as private.

Added "Created" and "Updated" dates on repository tooltip.

Fixed "Git fatal no configured push destination" on a cloned repository push

## 0.3.2 - May 16, 2020

Added "Copy Repository URL" on repository right-click menu

## 0.3.1 - May 16, 2020

Fixed donate button centering in Visual Studio Marketplace web page.

## 0.3.0 - May 15, 2020

<img src="https://raw.githubusercontent.com/SrBrahma/GitHub-Repository-Manager/master/images/changelog/0_3_0.png" alt="0.3.0">

Added Show Repository Commands Icons and a setting for it. ([#3](https://github.com/SrBrahma/GitHub-Repository-Manager/issues/3))

Thanks for the idea, hediet!

## 0.2.7 - May 12, 2020

Fixed username.github.io repositories not being found by the Cloned Repository Searcher. Thanks, u/tHeSiD!

## 0.2.1 ~ 0.2.6 - May 11, 2020

Quick README fixes.

Logo updated again. I looked at my screen while I was a little slid in the chair and I got this idea of the gradient. "Blue gradient. Nice. Now let's add pink or purple." and I kept moving two linear gradients and changing its colors until it looked nice on both of my monitors. lol

## 0.2.0 - May 11, 2020

Fixed Cloned Repositories Search not working with some remotes.

Changed project logo.

Improved README.

- Added usage .gif (that took my time to get it "ok"!)

Added error message if the extension can't open the OAuth callback server.

Changed REST requests to Graphql. Reduces network usage, reduces time to retrieve the data and also now shows the "Fork of" information when hovering a repository.

## 0.1.1 - May 6, 2020

Quick fixes

## 0.1.0 - May 6, 2020

First release
