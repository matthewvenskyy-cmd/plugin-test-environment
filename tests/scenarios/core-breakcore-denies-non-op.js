import { waitForChat } from "./helpers.js";

export const name = "Core breakcore denies non-op players";

export async function run(ctx) {
  const { assert, command, spawnBot, wait } = ctx;
  const bot = await spawnBot("BreakCoreNoOp", { op: false });

  await command("deop BreakCoreNoOp", 250);
  await command("gamemode survival BreakCoreNoOp", 250);
  await wait(500);

  const denied = await waitForChat(
    bot,
    () => bot.chat("/breakcore BreakCoreNoOp"),
    /Only server operators can use this command\./
  );
  assert(denied, "non-op /breakcore should be denied before any target handling");
  assert(await playerExists(ctx, "BreakCoreNoOp"), "denied /breakcore should not disconnect or kill the player");
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
