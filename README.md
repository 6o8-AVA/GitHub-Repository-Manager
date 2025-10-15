<div align="center">

[![Installs](https://img.shields.io/visual-studio-marketplace/i/6o8.github-repository-manager-6o8)](https://marketplace.visualstudio.com/items?itemName=6o8.github-repository-manager-6o8)

</div>
<h1 align="center">
<b>GitHub Repository Manager (6o8 AVA)</b>
</h1>

<h3 align="center">
VS Code extension that lists your personal and organizations GitHub repositories, allowing you to clone and access them and create new ones
</h3>


<br/>


<div align="center">
<img src="https://raw.githubusercontent.com/6o8-AVA/GitHub-Repository-Manager/main/images/readme/usage.gif" width="85%" >
</div>
<br/>

_This gif is a little old! We are now using the VS Code integrated GitHub login system and the extension is prettier!_

<br/>

<div align="center">

![](images/readme/config/coloredIconsTrue.png)

_The `*` means that the repository is **dirty**! So it has local changes that aren't yet commited!_

</div>

## Key Features

### 🔐 **Native VS Code GitHub Authentication**
Seamless integration with VS Code's built-in GitHub authentication system - no need for manual tokens or OAuth configuration.

### 🎯 **Hide/Unhide Organizations and Repositories**
Full control over your tree view visibility with persistent hidden states for both cloned and not-cloned repositories. Clean up your workspace by hiding repositories you're not actively working on.

### 📊 **Repository Sorting**
Multiple sorting options to organize your repositories your way:

- Sort by last updated date
- Sort alphabetically
- Convenient sorting submenu in repositories view

### ⏰ **Relative Time Display**
See when repositories were last updated at a glance with human-readable time formatting (years, months, weeks, days, hours, minutes, seconds ago) - displayed alongside the dirty state indicator.

### 🏢 **Enhanced Organization Repository Management**
Better handling of organization repositories with improved label display and dedicated utility functions for seamless organization workflows.

### 🗄️ **Automatic Archived Repository Filtering**
Keeps your workspace clean and focused on active projects by automatically filtering out archived repositories from both user and organization lists.

### 🔍 **Dirty Repository Indicator**
See at a glance which repositories have uncommitted local changes with the `*` indicator - keep track of your work-in-progress across all repositories.

### ➕ **Create Repositories Directly in VS Code**
Create new GitHub repositories for your personal account or organizations you belong to without leaving your editor.

### 🔎 **Smart Cloned Repository Detection**
Automatically discovers and lists all your cloned GitHub repositories from your configured clone directory, supporting both HTTPS and SSH remotes.

### � **Managed Clone Directory**
Quickly clone repositories into your configured default directory using the new guided command. The extension now validates and creates the destination folders automatically so your clones never fail because of a missing path.

### 🚀 **Publish to GitHub**
One-click publish functionality that creates a GitHub repository and pushes your current project in a single flow - whether your project has Git initialized or not.

### 🏢 **Full Organization Support**
View, manage, and create repositories for organizations you're a member of, with proper permission handling.

### 🎨 **Visual Repository Icons**
Color-coded repository icons provide quick visual distinction in the tree view, making navigation easier.

### 🗑️ **Safe Repository Deletion**
Delete cloned repositories directly from the context menu with confirmation and dirty state warnings to prevent accidental data loss.

### 📂 **Support for All Repository Types**
Includes "Others" tree for managing local repositories that aren't from your account or organizations.

<h1 align="center">
Guide
</h1>


<!-- Maybe not needed. See if someone asks on how to do it. <h2><b> Log in </b></h2>

**[1.0.0]** We are now using the VS Code integrated GitHub login system!

![](images/readme/login.png)

<h2><b> Log out </b></h2>

To logout in this new VS Code system, remove it from the Trusted Extensions. In the next VS Code session, the extension won't have access to your account. Note that if

![](images/readme/logout1.png) ![](images/readme/logout2.png) -->


<h2><b> Cloned Repositories Search </b></h2>

To make your GitHub cloned repositories show up in the **Cloned** tree view, you will need to set the **`"git.defaultCloneDirectory"`** in your VSCode `settings.json` to the path your cloned repositories are located (they may be deeply located there).

**1.4.0** - there is now a button to set this config interactively!

![](https://user-images.githubusercontent.com/28177550/171236229-86a8fbd4-d21d-4b96-938a-ff0f09a59948.png)

<h2><b> Creating a repository </b></h2>

By hovering the **REPOSITORIES** tree view title, a **+** button appears. Click on it, enter the new repository name, description (optional) and visibility. On success, you may choose to clone the new repository.

If you are a member of at least one organization that allows you to create repositories for it, it will be asked, before the repository name input, to pick the new repository owner: your own account or one of those organizations.

<h2><b> Creating a repository for current project </b></h2>

![](images/readme/publish.png)

You may create a GitHub repository and push your current project within the same flow. If there are multiple folders in your workspace that may be published to GitHub, it will be prompted to pick one.

There are 2 possible cases that allows using that publish functionality:

1) **Your project doesn't have a Git yet.** After entering the repository name, description and visibility, the repository will be created, the git will be initialized for the workspace folder, `main` branch will be created and selected, GitHub remote will be added as `origin` and your files will then be pushed to it.

2) **Your project has a Git, but it hasn't a remote yet.** After filling the repository information, it will be checked if your git HEAD is `master`. If so, it will ask if you want the branch to be renamed to `main`. Then the repository will be created, the GitHub remote is added as `origin` and your code is pushed.

<br/>
<h1 align="center"> Settings </h1>


- ### Always Clone To Default Directory

##### _"githubRepositoryManager.alwaysCloneToDefaultDirectory"_
Always clone to the directory specified in "git.defaultCloneDirectory".
##### Default: **false**

- ## Default Clone Directory Maximum Depth

##### _"githubRepositoryManager.clonedRepositoriesSearch.defaultCloneDirectoryMaximumDepth"_
How deep on `"git.defaultCloneDirectory"` the cloned repositories will be searched. A depth of 0 means it will only search in the directory itself, a depth of 3 means it will search up to 3 directories below. The lesser the faster.
##### Default: **2**


- ## Directories To Ignore

##### _"githubRepositoryManager.clonedRepositoriesSearch.directoriesToIgnore"_
Directories names that are ignored on the search for the cloned repositories. `**/` is added to their start.
##### Default: **["node_modules", ".vscode", ".git/*", "logs", "src", "lib", "out", "build"]**


<br/>

<h1 align="center">
  <a href="https://github.com/6o8-AVA/GitHub-Repository-Manager/blob/main/CHANGELOG.md">
      Changelog
  </a>
</h1>

<h2 align="center">
  
**Note**: This is a fork of the [original extension](https://github.com/SrBrahma/GitHub-Repository-Manager) by Henrique Bruno, maintained and published by 6o8 Ascendant Versioning Authority (6o8 AVA).

</h2>

<h1 align="center"> Roadmap </h1>

- Search and clone public repositories

- Visualize without cloning (useful for getting some value or checking something from some repository)

- "Order by" (alphabetically, stars, your open frequency, created on, updated on) in top menu

- Search repository by name

- Fetch repositories on demand - Some devs have hundreds or thousands of repos. Instead of fetching all of them on init and displaying all of them together, there could be a \[1..100\], \[101, 200\] tree system, for both on demand fetch and display.

<br/>
<h2 align="center"> Feel free to open an issue for features requests, problems or questions! </h2>

<h4 align="center">

For developing: clone it, run `npm i`, `npm start` and run the debugger.

</h4>
