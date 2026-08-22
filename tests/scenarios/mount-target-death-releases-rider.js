import { waitForChat, waitForEvent } from "./helpers.js";

export const name = "MountPlugin target death releases rider";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountDeathRide");
  const target = await spawnBot("MountDeathSeat");
  const nextTarget = await spawnBot("MountDeathNext");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 280 0", 250);
    await command("fill 279 79 -3 282 79 3 minecraft:stone", 500);
    await command("gamemode creative MountDeathRide", 250);
    await command("gamemode creative MountDeathSeat", 250);
    await command("gamemode creative MountDeathNext", 250);
    await command("tp MountDeathSeat 280 80 1 180 0", 500);
    await command("tp MountDeathNext 281 80 1 180 0", 500);
    await command("tp MountDeathRide 280 80 -2 0 0", 500);
    await command("gamemode survival MountDeathRide", 250);
    await command("gamemode survival MountDeathSeat", 250);
    await command("gamemode survival MountDeathNext", 250);
    await wait(750);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountDeathSeat/i);
    assert(mounted, "rider should mount the target before target death");
    await wait(500);

    const respawned = waitForEvent(target, "respawn", 8000);
    await command("kill MountDeathSeat", 500);
    await respawned;
    await wait(1500);

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "target death should clear the rider's active mount session");

    await command("tp MountDeathRide 281 80 -2 0 0", 500);
    await rider.lookAt(nextTarget.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountDeathNext/i);
    assert(remounted, "rider should be able to mount a different player after the target dies");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MountDeathSeat", 250);
    await command("fill 279 79 -3 282 79 3 minecraft:air", 500);
    await command("forceload remove 280 0", 250);
  }
}
