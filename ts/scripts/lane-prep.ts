import { existsSync } from "node:fs";
import path from "node:path";

import { $ } from "bun";

// Lane prep: create (or recycle) a worktree for a new hand lane, install the
// nested zencode deps, and print the lane's real path + branch so dispatches
// never guess the worktree directory.
//
// Usage: bun shared/scripts/lane-prep.ts <branch> [worktree-path]
//   branch        the lane branch, e.g. internal/my-lane (created from the
//                 current session branch if missing)
//   worktree-path optional; defaults to picking a warm worktree whose branch
//                 is already merged into the session branch (a stale lane
//                 shell), or creating .opencode/worktrees/<branch-basename>.
//                 NOTE: reachability cannot distinguish a merged lane branch
//                 from a QUEUED lane branch (both are ancestors) — when the
//                 pool holds queued/reserved branches, pass the worktree
//                 path explicitly instead of relying on the auto-pick.
//
// Prints: <worktree-path> <branch> — one line, for the commander's dispatch.

const [branch, explicitPath] = process.argv.slice(2);
if (branch === undefined) {
  console.error(
    "usage: bun shared/scripts/lane-prep.ts <branch> [worktree-path]"
  );
  process.exit(1);
}

const repoRoot = path.resolve(import.meta.dir, "..", "..");
const sessionBranchOutput = await $`git branch --show-current`.quiet().text();
const sessionBranch = sessionBranchOutput.trim();

const runGit = async (args: string[], cwd?: string) => {
  const result = await $`git ${args}`
    .cwd(cwd ?? repoRoot)
    .quiet()
    .nothrow();
  if (result.exitCode !== 0) {
    console.error(
      `git ${args.join(" ")} failed: ${result.stderr.toString().slice(0, 500)}`
    );
    process.exit(1);
  }
};

const nestedInstall = async (cwd: string) => {
  if (existsSync(path.join(cwd, "shared", "zencode", "bun.lock"))) {
    const result = await $`bun i`
      .cwd(path.join(cwd, "shared", "zencode"))
      .quiet()
      .nothrow();
    if (result.exitCode !== 0) {
      console.error(
        "nested zencode install failed (run it manually):",
        result.stderr.toString().slice(0, 500)
      );
    }
  }
};

const ensureBranch = async (worktree: string) => {
  const currentOutput = await $`git -C ${worktree} branch --show-current`
    .quiet()
    .nothrow()
    .text();
  const current = currentOutput.trim();
  if (current !== branch) {
    await runGit(["-C", worktree, "reset", "--hard", sessionBranch]);
    await runGit(["-C", worktree, "clean", "-fd"]);
    await runGit(["-C", worktree, "switch", "-c", branch, sessionBranch]);
  }
};

const prepareWorktree = async (worktree: string) => {
  await ensureBranch(worktree);
  await nestedInstall(worktree);
  console.log(`${worktree} ${branch}`);
};

if (explicitPath !== undefined) {
  await prepareWorktree(explicitPath);
  process.exit(0);
}

const list = await $`git worktree list --porcelain`.quiet().text();
const entries = list
  .split("\n\n")
  .map((block) => {
    const lines = block.split("\n");
    return {
      path: lines[0].slice("worktree ".length),
      branch: lines
        .find((l) => l.startsWith("branch "))
        ?.slice("branch refs/heads/".length),
    };
  })
  .filter(
    (e) =>
      e.path !== undefined &&
      e.branch !== undefined &&
      e.branch !== sessionBranch &&
      e.branch.startsWith("internal/")
  );

const mergedCheck = async (branch: string): Promise<boolean> => {
  // Reusable = merged into the session branch (an ancestor) AND not a bare
  // pointer at the session HEAD (queued/reserved lane branches sit exactly at
  // the session HEAD with no work — they must not be recycled).
  const sessionHeadOut = await $`git rev-parse ${sessionBranch}`
    .quiet()
    .nothrow()
    .text();
  const sessionHead = sessionHeadOut.trim();
  const branchHeadOut = await $`git rev-parse ${branch}`
    .quiet()
    .nothrow()
    .text();
  const branchHead = branchHeadOut.trim();
  if (branchHead === sessionHead) return false;
  const result =
    await $`git merge-base --is-ancestor ${branch} ${sessionBranch}`
      .quiet()
      .nothrow();
  return result.exitCode === 0;
};

const warmEntry = await Promise.all(
  entries.map(async (entry) =>
    (await mergedCheck(entry.branch ?? "")) ? entry : undefined
  )
).then((found) => found.find((e) => e !== undefined));

const warmPath = warmEntry?.path;
if (warmPath !== undefined) {
  await prepareWorktree(warmPath);
  process.exit(0);
}

const newPath = path.join(
  repoRoot,
  ".opencode",
  "worktrees",
  branch.replace("internal/", "")
);
await runGit(["worktree", "add", newPath, "-b", branch, sessionBranch]);
await nestedInstall(newPath);
console.log(`${newPath} ${branch}`);
