import { waitForChat } from "./helpers.js";

export const name = "MountPlugin target logout releases rider";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountSeatDrop");
  const target = await spawnBot("MountSeatGone");
  const nextTarget = await spawnBot("MountSeatNext");

  try {
    await command("gamemode creative MountSeatDrop", 250);
    await command("gamemode creative MountSeatGone", 250);
    await command("gamemode creative MountSeatNext", 250);
    await command("forceload add 136 0", 250);
    await command("fill 135 79 -3 138 79 3 minecraft:stone", 250);
    await command("tp MountSeatGone 136 80 1 180 0", 500);
    await command("tp MountSeatNext 137 80 1 180 0", 500);
    await command("tp MountSeatDrop 136 80 -2 0 0", 500);
    await command("gamemode survival MountSeatDrop", 250);
    await command("gamemode survival MountSeatGone", 250);
    await command("gamemode survival MountSeatNext", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSeatGone/i);
    assert(mounted, "rider should mount the target before target logout");

    target.quit("scenario target logout");
    await wait(1500);

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "target logout should clear the rider's active mount session");

    await command("tp MountSeatDrop 137 80 -2 0 0", 500);
    await rider.lookAt(nextTarget.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSeatNext/i);
    assert(remounted, "rider should be able to mount a different player after the target logs out");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("fill 135 79 -3 138 79 3 minecraft:air", 250);
    await command("forceload remove 136 0", 250);
  }
}
