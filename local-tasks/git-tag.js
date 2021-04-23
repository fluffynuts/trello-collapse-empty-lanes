const gulp = requireModule("gulp");

gulp.task("git-tag", async () => {
  const
    gitTag = requireModule("git-tag"),
    currentVersion = await readManifestVersion();
  await gitTag({
    tag: `v${currentVersion}`
  });

});

async function readManifestVersion() {
  const
    { readTextFile } = require("yafs"),
    contents = await readTextFile("manifest.json"),
    manifest = JSON.parse(contents);
  return manifest.version;
}

