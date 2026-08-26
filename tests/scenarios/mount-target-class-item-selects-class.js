import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target class item selects class";

const RIDER_FLOOR = new Vec3(286, 79, 0);
const TARGET_FLOOR = new Vec3(286, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtClassR", { op: false });
  const target = await spawnBot("MtTgtClass", { op: false });

  try {
    await command("forceload add 285 0 287 2", 250);
    await wait(500);
    await command("deop MtTgtClassR", 250);
    await command("deop MtTgtClass", 250);
    await command("clear MtTgtClassR", 250);
    await command("clear MtTgtClass", 250);
    await command("effect clear MtTgtClassR", 250);
    await command("effect clear MtTgtClass", 250);
    await command("fill 285 79 0 287 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtClassR", 250);
    await command("gamemode creative MtTgtClass", 250);
    await command("tp MtTgtClassR 286 80 0 0 0", 500);
    await command("tp MtTgtClass 286 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target class rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target class floor block");
    await command("gamemode survival MtTgtClassR", 250);
    await command("gamemode survival MtTgtClass", 250);
    await command("effect give MtTgtClassR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtClass minecraft:slow_falling 30 1 true", 250);
    await command("classes give MtTgtClass long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtClassR 286 80 0 0 0", 500);
    await command("tp MtTgtClass 286 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtClass/i);
    assert(mounted, "rider should mount the target player before target class selection");
    await wait(500);

    const bow = await waitForInventoryItem(target, (item) => item?.name === "bow", "ridden target Long Bow class item");
    await target.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Archer/);
    assert(status, "ridden target holding the Long Bow class item should set class status to Archer");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "ridden target class selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MtTgtClassR", 250);
    await command("clear MtTgtClass", 250);
    await command("effect clear MtTgtClassR", 250);
    await command("effect clear MtTgtClass", 250);
    await command("fill 285 79 0 287 79 2 minecraft:air", 500);
    await command("forceload remove 285 0 287 2", 250);
  }
}
