import { serverPlayerIsPassengerOf, waitForChat, waitForPlayerPassengerState } from "./helpers.js";

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
  await waitForPlayerPassengerState(ctx, "MountBusy", "MountFirst", true, "duplicate-mount initial attachment");

  await rider.lookAt(secondTarget.entity.position.offset(0, 1.2, 0), true);
  const denied = await waitForChat(rider, () => rider.chat("/mount"), /already mounted/i);
  assert(denied, "second /mount while mounted should be denied");
  assert(await serverPlayerIsPassengerOf(ctx, "MountBusy", "MountFirst"), "denied duplicate mount should keep the original target");
  assert(!(await serverPlayerIsPassengerOf(ctx, "MountBusy", "MountSecond")), "denied duplicate mount should not attach the second target");

  const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
  assert(unmounted, "/unmount should still cleanly dismount the original mount");
  await waitForPlayerPassengerState(ctx, "MountBusy", "MountFirst", false, "duplicate-mount final detachment");

  await command("fill 31 79 -3 33 79 3 minecraft:air", 250);
}
