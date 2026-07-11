import { waitForChat } from "./helpers.js";

export const name = "MountPlugin player riding cycle";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountRider");
  const target = await spawnBot("MountTarget");

  await command("fill 19 79 -3 21 79 2 minecraft:stone", 250);
  await command("gamemode survival MountRider", 250);
  await command("gamemode survival MountTarget", 250);
  await command("tp MountTarget 20 80 1 180 0", 500);
  await command("tp MountRider 20 80 -2 0 0", 500);
  await wait(500);

  await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
  const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountTarget/i);
  assert(mounted, "MountPlugin should allow mounting another player through /mount");

  await wait(500);
  const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
  assert(unmounted, "MountPlugin should allow /unmount after player riding");

  await command("fill 19 79 -3 21 79 2 minecraft:air", 250);
}
