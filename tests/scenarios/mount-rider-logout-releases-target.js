import { waitForChat } from "./helpers.js";

export const name = "MountPlugin rider logout releases target";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountLogout");
  const target = await spawnBot("MountLogoutSeat");
  const nextRider = await spawnBot("MountLogoutNext");

  try {
    await command("gamemode creative MountLogout", 250);
    await command("gamemode creative MountLogoutSeat", 250);
    await command("gamemode creative MountLogoutNext", 250);
    await command("forceload add 128 0", 250);
    await command("fill 127 79 -3 130 79 2 minecraft:stone", 250);
    await command("tp MountLogoutSeat 128 80 1 180 0", 500);
    await command("tp MountLogout 128 80 -2 0 0", 500);
    await command("tp MountLogoutNext 129 80 -2 0 0", 500);
    await command("gamemode survival MountLogout", 250);
    await command("gamemode survival MountLogoutSeat", 250);
    await command("gamemode survival MountLogoutNext", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountLogoutSeat/i);
    assert(mounted, "initial rider should mount the target before logout");

    rider.quit("scenario logout");
    await wait(1500);

    await command("tp MountLogoutNext 128 80 -2 0 0", 500);
    await nextRider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(nextRider, () => nextRider.chat("/mount"), /now riding MountLogoutSeat/i);
    assert(remounted, "target should be mountable again after the first rider logs out");
  } finally {
    nextRider.chat("/unmount");
    await wait(500);
    await command("fill 127 79 -3 130 79 2 minecraft:air", 250);
    await command("forceload remove 128 0", 250);
  }
}
