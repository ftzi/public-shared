import { $ } from "bun";

// Pre-commit guard: fail on main, and on branches whose PR is already merged.
// Executed by the pre-commit hook via `bun shared/scripts/check-branch.ts`.

// Empty branch (non-git dir or detached HEAD) means nothing to guard — nothrow mirrors the old .sh, which ran without `set -e` (it had `set -uo pipefail`), so failed git/gh calls continued instead of aborting.
const branchOutput = await $`git branch --show-current`
  .quiet()
  .nothrow()
  .text();
const branch = branchOutput.trim();

if (branch === "main") {
  console.error("ERROR: never commit to main - create a feature branch first.");
  process.exit(1);
}

// gh errors (e.g. no PR for this branch) are treated as "no merged PR" — nothrow mirrors the old `|| true`.
const prStateOutput = await $`gh pr view ${branch} --json state -q .state`
  .quiet()
  .nothrow()
  .text();
const prState = prStateOutput.trim();

if (prState === "MERGED") {
  console.error(
    `ERROR: branch '${branch}' has a merged PR - create a new branch from origin/main instead.`
  );
  process.exit(1);
}

process.exit(0);
