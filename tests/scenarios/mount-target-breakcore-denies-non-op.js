import { Vec3 } from "vec3";
import { waitForBlock, waitForChat } from "./helpers.js";

export const name = "Mounted target breakcore denies non-op players";

const RIDER_FLOOR = new Vec3(266, 79, -2);
const TARGET_FLOOR = new Vec3(266, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtBreakR", { op: false });
  const target = await spawnBot("MtTgtBreakNoOp", { op: false });

  try {
    await command("forceload add 265 -3 267 2", 250);
    await wait(500);
    await command("deop MtTgtBreakR", 250);
    await command("deop MtTgtBreakNoOp", 250);
    await command("fill 265 79 -3 267 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtBreakR", 250);
    await command("gamemode creative MtTgtBreakNoOp", 250);
    await command("tp MtTgtBreakR 266 80 -2 0 0", 500);
    await command("tp MtTgtBreakNoOp 266 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target breakcore rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target breakcore floor block");
    await command("gamemode survival MtTgtBreakR", 250);
    await command("gamemode survival MtTgtBreakNoOp", 250);
    await command("effect give MtTgtBreakR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtBreakNoOp minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtBreakR 266 80 -2 0 0", 500);
    await command("tp MtTgtBreakNoOp 266 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtBreakNoOp/i);
    assert(mounted, "rider should mount before the ridden target /breakcore permission check");
    await wait(500);

    const denied = await waitForChat(
      target,
      () => target.chat("/breakcore MtTgtBreakNoOp"),
      /Only server operators can use this command\./
    );
    assert(denied, "ridden non-op target /breakcore should be denied before target handling");
    assert(await playerExists(ctx, "MtTgtBreakNoOp"), "ridden denied /breakcore should not disconnect or kill the target");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "ridden denied /breakcore should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("fill 265 79 -3 267 79 2 minecraft:air", 500);
    await command("forceload remove 265 -3 267 2", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
