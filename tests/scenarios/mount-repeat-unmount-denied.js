import { serverEntityExists, serverPlayerIsPassengerOf, waitForChat, waitForPlayerPassengerState } from "./helpers.js";

export const name = "MountPlugin repeated unmount is denied safely";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountUnAgain", { op: false });
  const target = await spawnBot("MountUnSeat", { op: false });

  try {
    await command("deop MountUnAgain", 250);
    await command("deop MountUnSeat", 250);
    await command("clear MountUnAgain", 250);
    await command("clear MountUnSeat", 250);
    await command("effect clear MountUnAgain", 250);
    await command("effect clear MountUnSeat", 250);
    await command("fill 23 79 -3 25 79 2 minecraft:stone", 250);
    await command("gamemode survival MountUnAgain", 250);
    await command("gamemode survival MountUnSeat", 250);
    await command("tp MountUnSeat 24 80 1 180 0", 500);
    await command("tp MountUnAgain 24 80 -2 0 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountUnSeat/i);
    assert(mounted, "initial /mount should mount the target player");
    await waitForPlayerPassengerState(ctx, "MountUnAgain", "MountUnSeat", true, "repeated-unmount initial attachment");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "first /unmount should dismount the rider");
    await waitForPlayerPassengerState(ctx, "MountUnAgain", "MountUnSeat", false, "repeated-unmount initial detachment");

    const denied = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(denied, "second /unmount should be denied after a successful dismount");
    assert(await playerExists(ctx, "MountUnAgain"), "repeated /unmount should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MountUnSeat"), "repeated /unmount should not kill or disconnect the target");
    assert(!(await serverPlayerIsPassengerOf(ctx, "MountUnAgain", "MountUnSeat")), "repeated /unmount should not reattach the rider to the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MountUnAgain", 250);
    await command("clear MountUnSeat", 250);
    await command("effect clear MountUnAgain", 250);
    await command("effect clear MountUnSeat", 250);
    await command("fill 23 79 -3 25 79 2 minecraft:air", 250);
  }
}

async function playerExists(ctx, playerName) {
  return serverEntityExists(ctx, `@a[name=${playerName}]`);
}
