import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider class item selects class";

const RIDER_FLOOR = new Vec3(284, 79, 0);
const TARGET_FLOOR = new Vec3(284, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntClassRider", { op: false });
  const target = await spawnBot("MntClassSeat", { op: false });

  try {
    await command("forceload add 283 0 285 2", 250);
    await wait(500);
    await command("deop MntClassRider", 250);
    await command("deop MntClassSeat", 250);
    await command("clear MntClassRider", 250);
    await command("clear MntClassSeat", 250);
    await command("effect clear MntClassRider", 250);
    await command("effect clear MntClassSeat", 250);
    await command("fill 283 79 0 285 79 2 minecraft:stone", 500);
    await command("gamemode creative MntClassRider", 250);
    await command("gamemode creative MntClassSeat", 250);
    await command("tp MntClassRider 284 80 0 0 0", 500);
    await command("tp MntClassSeat 284 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted class rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted class target floor block");
    await command("gamemode survival MntClassRider", 250);
    await command("gamemode survival MntClassSeat", 250);
    await command("effect give MntClassRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntClassSeat minecraft:slow_falling 30 1 true", 250);
    await command("classes give MntClassRider long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MntClassRider 284 80 0 0 0", 500);
    await command("tp MntClassSeat 284 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntClassSeat/i);
    assert(mounted, "rider should mount the target player before class selection");
    await wait(500);

    const bow = await waitForInventoryItem(rider, (item) => item?.name === "bow", "mounted rider Long Bow class item");
    await rider.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Archer/);
    assert(status, "mounted rider holding the Long Bow class item should set class status to Archer");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted rider class selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MntClassRider", 250);
    await command("clear MntClassSeat", 250);
    await command("effect clear MntClassRider", 250);
    await command("effect clear MntClassSeat", 250);
    await command("fill 283 79 0 285 79 2 minecraft:air", 500);
    await command("forceload remove 283 0 285 2", 250);
  }
}
