import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  serverBlockIs,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider cannot place another player's core";

const CORE_BLOCK = new Vec3(240, 80, 1);
const SUPPORT_BLOCK = new Vec3(240, 79, 1);
const RIDER_FLOOR = new Vec3(241, 79, -2);
const SEAT_FLOOR = new Vec3(241, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MountOwnCore");
  const rider = await spawnBot("MountCoreCopy", { op: false });
  const seat = await spawnBot("MountCoreSit", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 240 1", 250);
    await command("deop MountCoreCopy", 250);
    await command("deop MountCoreSit", 250);
    await command("fill 239 79 -3 242 79 2 minecraft:stone", 500);
    await command("fill 239 80 -3 242 82 2 minecraft:air", 500);
    await command("gamemode creative MountOwnCore", 250);
    await command("gamemode creative MountCoreCopy", 250);
    await command("gamemode creative MountCoreSit", 250);
    await command("tp MountOwnCore 240 80 0 0 0", 500);
    await command("tp MountCoreCopy 241 80 -2 0 0", 500);
    await command("tp MountCoreSit 241 80 2 180 0", 500);
    await waitForBlock(owner, SUPPORT_BLOCK, "stone", "core placement support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted seat floor block");
    await command("gamemode survival MountOwnCore", 250);
    await command("gamemode survival MountCoreCopy", 250);
    await command("gamemode survival MountCoreSit", 250);
    await command("effect give MountCoreCopy minecraft:slow_falling 30 1 true", 250);
    await command("effect give MountCoreSit minecraft:slow_falling 30 1 true", 250);
    await owner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await wait(750);

    const ownerCore = await waitForInventoryItem(owner, isCoreItem, "real owner's core item");
    const sourceSlot = toServerContainerSlot(ownerCore.slot);
    await command("clear MountCoreCopy minecraft:beacon", 250);
    const copyOutput = await command(`item replace entity MountCoreCopy container.0 from entity MountOwnCore container.${sourceSlot}`, 500);
    assert(/Replaced|Modified|commands\.item\.target/i.test(copyOutput), `server should give the rider another player's core; output=${copyOutput}`);
    await wait(750);
    assert(countMatchingItems(rider, isCoreItem) === 1, "mounted rider should hold exactly one copied core item before placement");

    const copiedCore = await waitForInventoryItem(rider, isCoreItem, "copied core item");
    await rider.equip(copiedCore, "hand");

    await command("tp MountCoreCopy 241 80 -2 0 0", 500);
    await command("tp MountCoreSit 241 80 2 180 0", 500);
    await wait(250);
    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountCoreSit/i);
    assert(mounted, "rider should mount the target player before wrong-owner core placement");
    await wait(250);

    const support = rider.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not visible before mounted placement attempt");
    await rider.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    await Promise.race([
      rider.placeBlock(support, new Vec3(0, 1, 0)).catch(() => {}),
      wait(1500)
    ]);
    await wait(1000);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "mounted denied wrong-owner core placement should leave the target empty");
    assert(countMatchingItems(rider, isCoreItem) === 1, "mounted denied wrong-owner core placement should keep the copied core item");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("fill 239 79 -3 242 82 2 minecraft:air", 500);
    await command("forceload remove 240 1", 250);
  }
}

function toServerContainerSlot(mineflayerSlot) {
  return mineflayerSlot >= 36 && mineflayerSlot <= 44 ? mineflayerSlot - 36 : mineflayerSlot;
}
