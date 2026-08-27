# TeachFlow Desktop release

package.json is the release version source. Keep src-tauri/tauri.conf.json and
src-tauri/Cargo.toml synchronized; npm run release:check enforces this before
every desktop build.

1. Bump all three version fields to the same SemVer value.
2. Run npm ci, npm test, and npm run release:desktop.
3. Configure TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   only as CI/GitHub secrets. Never add the private key to the repository.
4. Tag the commit as vX.Y.Z and push the tag.
5. The release workflow builds the NSIS installer, signed updater bundle,
   signature, and latest.json, then uploads them to the GitHub Release.
6. Install the previous production version and test the update to the new tag.
7. Confirm a tampered artifact or invalid signature is rejected before promotion.

Do not upload .env files, private signing keys, .pdb files, or debug builds.
