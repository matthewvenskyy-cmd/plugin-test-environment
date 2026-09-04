import { waitForChat } from "./helpers.js";

export const name = "MountPlugin rider sneak dismounts cleanly";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountSneakOff", { op: false });
  const target = await spawnBot("MountSneakSeat", { op: false });

  try {
    await command("deop MountSneakOff", 250);
    await command("deop MountSneakSeat", 250);
    await command("clear MountSneakOff", 250);
    await command("clear MountSneakSeat", 250);
    await command("effect clear MountSneakOff", 250);
    await command("effect clear MountSneakSeat", 250);
    await command("fill 27 79 -3 29 79 2 minecraft:stone", 250);
    await command("gamemode survival MountSneakOff", 250);
    await command("gamemode survival MountSneakSeat", 250);
    await command("tp MountSneakSeat 28 80 1 180 0", 500);
    await command("tp MountSneakOff 28 80 -2 0 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSneakSeat/i);
    assert(mounted, "rider should mount the target before sneak-dismount");
    await wait(500);

    rider.setControlState("sneak", true);
    await wait(1000);
    rider.setControlState("sneak", false);

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "rider sneak-dismount should clear the active mount session");
    assert(await playerExists(ctx, "MountSneakOff"), "rider sneak-dismount should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MountSneakSeat"), "rider sneak-dismount should not kill or disconnect the target");

    await command("tp MountSneakSeat 28 80 1 180 0", 500);
    await command("tp MountSneakOff 28 80 -2 0 0", 500);
    await wait(500);
    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSneakSeat/i);
    assert(remounted, "rider should be able to mount again after sneak-dismount");
  } finally {
    rider.setControlState("sneak", false);
    rider.chat("/unmount");
    await wait(500);
    await command("clear MountSneakOff", 250);
    await command("clear MountSneakSeat", 250);
    await command("effect clear MountSneakOff", 250);
    await command("effect clear MountSneakSeat", 250);
    await command("fill 27 79 -3 29 79 2 minecraft:air", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
