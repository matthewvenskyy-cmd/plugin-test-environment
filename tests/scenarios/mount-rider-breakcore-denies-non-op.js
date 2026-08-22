import { Vec3 } from "vec3";
import { waitForBlock, waitForChat } from "./helpers.js";

export const name = "Mounted rider breakcore denies non-op players";

const RIDER_FLOOR = new Vec3(264, 79, -2);
const SEAT_FLOOR = new Vec3(264, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountBreakNoOp", { op: false });
  const seat = await spawnBot("MountBreakSeat", { op: false });

  try {
    await command("forceload add 264 0", 250);
    await command("deop MountBreakNoOp", 250);
    await command("deop MountBreakSeat", 250);
    await command("fill 263 79 -3 265 79 2 minecraft:stone", 500);
    await command("gamemode creative MountBreakNoOp", 250);
    await command("gamemode creative MountBreakSeat", 250);
    await command("tp MountBreakNoOp 264 80 -2 0 0", 500);
    await command("tp MountBreakSeat 264 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted breakcore rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted breakcore seat floor block");
    await command("gamemode survival MountBreakNoOp", 250);
    await command("gamemode survival MountBreakSeat", 250);
    await command("effect give MountBreakNoOp minecraft:slow_falling 30 1 true", 250);
    await command("effect give MountBreakSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MountBreakNoOp 264 80 -2 0 0", 500);
    await command("tp MountBreakSeat 264 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountBreakSeat/i);
    assert(mounted, "non-op rider should mount before the /breakcore permission check");
    await wait(500);

    const denied = await waitForChat(
      rider,
      () => rider.chat("/breakcore MountBreakNoOp"),
      /Only server operators can use this command\./
    );
    assert(denied, "mounted non-op /breakcore should be denied before target handling");
    assert(await playerExists(ctx, "MountBreakNoOp"), "mounted denied /breakcore should not disconnect or kill the rider");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted denied /breakcore should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("fill 263 79 -3 265 79 2 minecraft:air", 500);
    await command("forceload remove 264 0", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
