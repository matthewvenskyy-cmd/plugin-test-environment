import { waitForChat } from "./helpers.js";

export const name = "MountPlugin denies duplicate mount";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountBusy");
  const firstTarget = await spawnBot("MountFirst");
  const secondTarget = await spawnBot("MountSecond");

  await command("fill 31 79 -3 33 79 3 minecraft:stone", 250);
  await command("gamemode survival MountBusy", 250);
  await command("gamemode survival MountFirst", 250);
  await command("gamemode survival MountSecond", 250);
  await command("tp MountFirst 32 80 1 180 0", 500);
  await command("tp MountSecond 32 80 2 180 0", 500);
  await command("tp MountBusy 32 80 -2 0 0", 500);
  await wait(500);

  await rider.lookAt(firstTarget.entity.position.offset(0, 1.2, 0), true);
  const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountFirst/i);
  assert(mounted, "initial /mount should mount the first target");

  await rider.lookAt(secondTarget.entity.position.offset(0, 1.2, 0), true);
  const denied = await waitForChat(rider, () => rider.chat("/mount"), /already mounted/i);
  assert(denied, "second /mount while mounted should be denied");

  const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
  assert(unmounted, "/unmount should still cleanly dismount the original mount");

  await command("fill 31 79 -3 33 79 3 minecraft:air", 250);
}
