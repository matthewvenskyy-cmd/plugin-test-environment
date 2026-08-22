import { waitForChat, waitForEvent } from "./helpers.js";

export const name = "MountPlugin rider death releases target";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountDeadRide");
  const target = await spawnBot("MountDeadSeat");
  const nextRider = await spawnBot("MountDeadNext");

  try {
    await command("kill @e[type=item]", 250);
    await command("fill 83 79 -3 86 79 2 minecraft:stone", 250);
    await command("gamemode creative MountDeadRide", 250);
    await command("gamemode creative MountDeadSeat", 250);
    await command("gamemode creative MountDeadNext", 250);
    await command("tp MountDeadSeat 84 80 1 180 0", 500);
    await command("tp MountDeadRide 84 80 -2 0 0", 500);
    await command("tp MountDeadNext 85 80 -2 0 0", 500);
    await command("gamemode survival MountDeadRide", 250);
    await command("gamemode survival MountDeadSeat", 250);
    await command("gamemode survival MountDeadNext", 250);
    await wait(750);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountDeadSeat/i);
    assert(mounted, "initial rider should mount the target before rider death");
    await wait(500);

    const respawned = waitForEvent(rider, "respawn", 8000);
    await command("kill MountDeadRide", 500);
    await respawned;
    await wait(1500);

    assert(await playerExists(ctx, "MountDeadSeat"), "rider death should not disconnect or kill the ridden target");
    await command("tp MountDeadNext 84 80 -2 0 0", 500);
    await nextRider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(nextRider, () => nextRider.chat("/mount"), /now riding MountDeadSeat/i);
    assert(remounted, "target should be mountable again after the first rider dies");
  } finally {
    nextRider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MountDeadRide", 250);
    await command("fill 83 79 -3 86 79 2 minecraft:air", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
