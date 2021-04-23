const gulp = requireModule("gulp");

gulp.task("git-push", async () => {
  const
    push = requireModule("git-push"),
    pushTags = requireModule("git-push-tags");
  await push();
  await pushTags();
});
