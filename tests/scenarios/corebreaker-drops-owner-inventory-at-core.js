import { Vec3 } from "vec3";
import { isCorebreakerItem, placeCoreBlock, queryDroppedItemEntityCount, serverBlockIs, waitForBlock, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Corebreaker drops owner inventory at core";

const CORE_BLOCK = new Vec3(132, 80, 1);
const SUPPORT_BLOCK = new Vec3(132, 79, 1);
const DROP_CENTER = CORE_BLOCK.offset(0.5, 0.5, 0.5);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreDropOwner");
  const breaker = await spawnBot("CoreDropBreaker");

  try {
    await command("gamerule keepInventory false", 250);
    await command("kill @e[type=item]", 250);
    await command("forceload add 132 0", 250);
    await command("fill 131 79 -1 133 79 2 minecraft:stone", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative CoreDropOwner", 250);
    await command("gamemode creative CoreDropBreaker", 250);
    await command("tp CoreDropOwner 132 80 0 0 0", 500);
    await command("tp CoreDropBreaker 133 80 1 90 0", 500);
    await command("gamemode survival CoreDropOwner", 250);
    await command("gamemode survival CoreDropBreaker", 250);
    await command("give CoreDropOwner minecraft:diamond 7", 500);
    await command("give CoreDropOwner minecraft:emerald 5", 500);
    await wait(1000);

    await waitForBlock(owner, SUPPORT_BLOCK, "stone", "core support block");
    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should be placed before Corebreaker attempt");

    const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "breaker Corebreaker");
    await breaker.equip(corebreaker, "hand");
    await breaker.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);

    const respawned = waitForEvent(owner, "respawn", 8000);
    try {
      await breaker.dig(breaker.blockAt(CORE_BLOCK), true);
    } catch {
      // CorePlugin cancels vanilla breaking and handles valid core destruction itself.
    }
    await command("tp CoreDropBreaker 133 80 -1 0 0", 100);
    await respawned;
    await wait(1500);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "Corebreaker should remove the owner's core");
    const droppedItems = await queryDroppedItemEntityCount(ctx, DROP_CENTER, 2.5);
    assert(droppedItems >= 1, `owner inventory should drop at the broken core location; found ${droppedItems} item entities`);
  } finally {
    await command("kill @e[type=item]", 250);
    await command("clear CoreDropOwner", 250);
    await command("clear CoreDropBreaker", 250);
    await command("fill 131 79 -1 133 82 2 minecraft:air", 250);
    await command("forceload remove 132 0", 250);
  }
}
