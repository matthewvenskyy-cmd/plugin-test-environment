import { Vec3 } from "vec3";
import {
  isCorebreakerItem,
  placeCoreBlock,
  queryDroppedItemEntityCount,
  serverBlockIs,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target Corebreaker drops owner inventory at core";

const CORE_BLOCK = new Vec3(440, 80, 1);
const SUPPORT_BLOCK = new Vec3(440, 79, 1);
const OWNER_FLOOR = new Vec3(440, 79, 0);
const RIDER_FLOOR = new Vec3(441, 79, -1);
const TARGET_FLOOR = new Vec3(441, 79, 1);
const SAFE_RIDER_FLOOR = new Vec3(447, 79, -1);
const SAFE_TARGET_FLOOR = new Vec3(447, 79, 1);
const DROP_CENTER = CORE_BLOCK.offset(0.5, 0.5, 0.5);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MTDropOwner");
  const rider = await spawnBot("MTDropRider", { op: false });
  const target = await spawnBot("MTDropBreaker", { op: false });

  try {
    await command("gamerule keepInventory false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MTDropRider", 250);
    await command("deop MTDropBreaker", 250);
    await command("clear MTDropRider", 250);
    await command("effect clear MTDropOwner", 250);
    await command("effect clear MTDropRider", 250);
    await command("effect clear MTDropBreaker", 250);
    await command("forceload add 439 -1 447 1", 250);
    await command("fill 439 79 -1 447 79 1 minecraft:stone", 500);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MTDropOwner", 250);
    await command("gamemode creative MTDropRider", 250);
    await command("gamemode creative MTDropBreaker", 250);
    await command("tp MTDropOwner 440 80 0 0 0", 500);
    await command("tp MTDropRider 441 80 -1 0 0", 500);
    await command("tp MTDropBreaker 441 80 1 180 0", 500);
    await owner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await waitForBlock(owner, OWNER_FLOOR, "stone", "mounted target inventory-drop owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target inventory-drop rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target inventory-drop target floor block");
    await waitForBlock(rider, SAFE_RIDER_FLOOR, "stone", "mounted target inventory-drop safe rider floor block");
    await waitForBlock(target, SAFE_TARGET_FLOOR, "stone", "mounted target inventory-drop safe target floor block");
    await command("gamemode survival MTDropOwner", 250);
    await command("gamemode survival MTDropRider", 250);
    await command("gamemode survival MTDropBreaker", 250);
    await command("give MTDropOwner minecraft:diamond 7", 500);
    await command("give MTDropOwner minecraft:emerald 5", 500);
    await wait(750);

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "mounted target inventory-drop owner" });
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should be placed before mounted target Corebreaker attempt");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTDropBreaker/i);
    assert(mounted, "rider should mount the Corebreaker target before inventory-drop check");
    await wait(750);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target Corebreaker for inventory-drop check");
    await target.equip(corebreaker, "hand");
    await target.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);

    try {
      await target.dig(target.blockAt(CORE_BLOCK), true);
    } catch {
      // CorePlugin cancels vanilla breaking and handles valid core destruction itself.
    }
    await command("tp MTDropRider 447 80 -1 0 0", 250);
    await command("tp MTDropBreaker 447 80 1 180 0", 250);
    await wait(2000);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "mounted target Corebreaker should remove the owner's core");
    const droppedItems = await queryDroppedItemEntityCount(ctx, DROP_CENTER, 2.5);
    assert(droppedItems >= 1, `mounted target Corebreaker should drop owner inventory at the broken core location; found ${droppedItems} item entities`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MTDropOwner", 250);
    await command("clear MTDropRider", 250);
    await command("clear MTDropBreaker", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("fill 439 79 -1 447 82 1 minecraft:air", 500);
    await command("forceload remove 439 -1 447 1", 250);
  }
}
