const
  gulp = requireModule("gulp"),
  Git = require("simple-git/promise"),
  { readTextFile, writeTextFile } = require("yafs");

gulp.task("increment-manifest-version", async () => {
  const
    filename = "manifest.json",
    contents = await readTextFile(filename),
    manifest = JSON.parse(contents),
    parts = manifest.version.split("."),
    last = parseInt(parts[parts.length - 1]);
  parts[parts.length - 1] = (last + 1).toString();
  manifest.version = parts.join(".");
  await writeTextFile(filename, JSON.stringify(manifest, null, 2));

  const git = new Git(".");
  await git.add(":/");
  await git.commit(`:bookmark: bump package version to ${manifest.version}`);
});
