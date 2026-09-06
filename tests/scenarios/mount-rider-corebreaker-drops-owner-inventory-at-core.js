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

export const name = "Mounted rider Corebreaker drops owner inventory at core";

const CORE_BLOCK = new Vec3(436, 80, 1);
const SUPPORT_BLOCK = new Vec3(436, 79, 1);
const OWNER_FLOOR = new Vec3(436, 79, 0);
const RIDER_FLOOR = new Vec3(437, 79, -1);
const TARGET_FLOOR = new Vec3(437, 79, 1);
const DROP_CENTER = CORE_BLOCK.offset(0.5, 0.5, 0.5);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MRDropOwner");
  const rider = await spawnBot("MRDropBreaker", { op: false });
  const target = await spawnBot("MRDropSeat", { op: false });

  try {
    await command("gamerule keepInventory false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MRDropBreaker", 250);
    await command("deop MRDropSeat", 250);
    await command("clear MRDropSeat", 250);
    await command("effect clear MRDropOwner", 250);
    await command("effect clear MRDropBreaker", 250);
    await command("effect clear MRDropSeat", 250);
    await command("forceload add 435 -1 438 1", 250);
    await command("fill 435 79 -1 438 79 1 minecraft:stone", 500);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MRDropOwner", 250);
    await command("gamemode creative MRDropBreaker", 250);
    await command("gamemode creative MRDropSeat", 250);
    await command("tp MRDropOwner 436 80 0 0 0", 500);
    await command("tp MRDropBreaker 437 80 -1 0 0", 500);
    await command("tp MRDropSeat 437 80 1 180 0", 500);
    await owner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await waitForBlock(owner, OWNER_FLOOR, "stone", "mounted rider inventory-drop owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider inventory-drop rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted rider inventory-drop target floor block");
    await command("gamemode survival MRDropOwner", 250);
    await command("gamemode survival MRDropBreaker", 250);
    await command("gamemode survival MRDropSeat", 250);
    await command("give MRDropOwner minecraft:diamond 7", 500);
    await command("give MRDropOwner minecraft:emerald 5", 500);
    await wait(750);

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "mounted rider inventory-drop owner" });
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should be placed before mounted rider Corebreaker attempt");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MRDropSeat/i);
    assert(mounted, "Corebreaker rider should mount the target before inventory-drop check");
    await wait(750);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker for inventory-drop check");
    await rider.equip(corebreaker, "hand");
    await rider.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);

    try {
      await rider.dig(rider.blockAt(CORE_BLOCK), true);
    } catch {
      // CorePlugin cancels vanilla breaking and handles valid core destruction itself.
    }
    await command("tp MRDropBreaker 437 80 -1 0 0", 250);
    await command("tp MRDropSeat 437 80 1 180 0", 250);
    await wait(2000);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "mounted rider Corebreaker should remove the owner's core");
    const droppedItems = await queryDroppedItemEntityCount(ctx, DROP_CENTER, 2.5);
    assert(droppedItems >= 1, `mounted rider Corebreaker should drop owner inventory at the broken core location; found ${droppedItems} item entities`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MRDropOwner", 250);
    await command("clear MRDropBreaker", 250);
    await command("clear MRDropSeat", 250);
    await command("effect clear MRDropOwner", 250);
    await command("effect clear MRDropBreaker", 250);
    await command("effect clear MRDropSeat", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("fill 435 79 -1 438 82 1 minecraft:air", 500);
    await command("forceload remove 435 -1 438 1", 250);
  }
}
