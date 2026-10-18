# Publishing @isothrum/editor

The package is published to npm with **Trusted Publishing (OIDC)** from GitHub
Actions — the same model as the Isoloom/Isothrum crates on crates.io. No
long-lived npm token is stored; the CI job authenticates over OIDC and npm
attaches a provenance attestation automatically. The workflow is
`.github/workflows/publish-npm.yml` (trigger: a `vX.Y.Z` tag, or run by hand from
the Actions tab).

## Can trusted publishing do the FIRST publish? No — it needs one manual bootstrap.

**npm Trusted Publishers are configured per package, on an existing package's
settings page.** A brand-new package name does not exist on the registry yet, so
there is nothing to attach a trusted publisher to. Therefore the **first** publish
of `@isothrum/editor` **cannot** go through trusted publishing: it must be
bootstrapped with one manual `npm publish` (local `npm login` + OTP, or a granular
automation token). After that first version exists, the maintainer configures the
Trusted Publisher and **every subsequent** publish runs through CI over OIDC with
no token.

This is the same constraint as crates.io ("a brand-new crate name must be created
by one manual `cargo publish` first"), and it is a deliberate npm security
measure. (Requirements: npm CLI ≥ 11.5.1 and Node ≥ 22.14 — Node 24 satisfies
both; GitHub Actions `permissions: id-token: write`; provenance is automatic.)

## Maintainer setup (once)

1. **Bootstrap the first version manually** (local machine, this folder):

   ```sh
   cd ~/code/isothrum-ui
   npm login                       # as a maintainer of the @isothrum org
   npm run check                   # typecheck + tests + build
   npm publish --access public     # confirm the OTP / 2FA prompt
   npm view @isothrum/editor version   # expect 0.1.0
   ```

   (If 2FA-on-publish blocks the CLI prompt, create a short-lived **granular
   automation token** with publish rights for `@isothrum` on npmjs.com, use it for
   this one publish, then delete it.)

2. **Configure the Trusted Publisher** on npmjs.com so all later publishes are
   token-free:
   - Open the package page → **Settings** → **Trusted Publisher** (per-package;
     npm has no org-wide trusted-publisher setting).
   - Add a **GitHub Actions** publisher with exactly:
     - **Organization / owner:** `isoloom`
     - **Repository:** `isothrum-ui`  (i.e. `isoloom/isothrum-ui`)
     - **Workflow filename:** `publish-npm.yml`
     - **Environment:** `npm-publish`  (the workflow runs in this GitHub
       environment; the names must match)
   - Save. npm notes that a newly created trusted-publisher config must complete
     its first successful CI publish within 2 days to bind to the repo identity —
     so bump the version and tag soon after (step 3).
   - In the GitHub repo, create an Environment named **`npm-publish`**
     (Settings → Environments) if it does not exist; no secrets are needed.

3. **Release through CI thereafter:** bump `version` in `package.json`, commit,
   and push a tag `vX.Y.Z` (or run the workflow manually). The job does
   `npm ci → npm run check → npm publish --access public --provenance` over OIDC.

## After the first version is live: switch the consumers off the local link

While unpublished, both consumers point at this folder with a `file:` link. Once
`@isothrum/editor@0.1.0` resolves on the registry, switch them to the version
range and reinstall:

- **isothrum (desktop app)** — `apps/desktop/package.json`: change
  `"@isothrum/editor": "file:../../../isothrum-ui"` to `"^0.1.0"`, then
  `npm install`. The desktop build (`npm run editor`) and `release.yml` already
  consume the package; no token and no website checkout are needed.
- **isothrum-website** — `package.json`: same change, then `npm install`, and
  remove the `install-links=true` line from `.npmrc` (it was only needed to make
  the bundler resolve the local `file:` symlink). The website keeps its own
  `public/wasm/` (served) and its Next.js SSR wrapper; it imports `LabCanvas` from
  `@isothrum/editor` and the model helpers from `@isothrum/editor/model`.

## Package name

**`@isothrum/editor`** (confirmed). The repo is `isoloom/isothrum-ui`; the npm
name need not match the repo. Renaming later would be a one-line change to `name`
in `package.json` plus the two consumer dependency keys.

## What could not be verified without the published package

- Installing `@isothrum/editor` from the npm registry (resolution of the public
  tarball, peer-dependency warnings in a real consumer tree).
- The CI trusted-publishing run itself (OIDC auth + provenance), which only works
  once the package exists and the Trusted Publisher is configured.
- The desktop CI `release.yml` producing Windows/Linux installers with the editor
  from the published package (only an unsigned local macOS build was proven).
- The website's production build against the npm version rather than the `file:`
  link (the `file:` link build was proven locally).
