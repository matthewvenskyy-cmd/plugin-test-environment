import { Vec3 } from "vec3";
import {
  countBctItems,
  countMatchingItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryCorebreakerCharges,
  queryDroppedItemEntityCount,
  queryEntityCount,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider Corebreaker cannot duplicate BCT";

const BCT_BLOCK = new Vec3(231, 80, 1);
const SUPPORT_BLOCK = new Vec3(231, 79, 1);
const RIDER_FLOOR = new Vec3(232, 79, -2);
const SEAT_FLOOR = new Vec3(232, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountBctBreak", { op: false });
  const seat = await spawnBot("MountBctSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 232 1", 250);
    await command("deop MountBctBreak", 250);
    await command("deop MountBctSeat", 250);
    await command("fill 231 79 -3 233 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MountBctBreak", 250);
    await command("gamemode creative MountBctSeat", 250);
    await command("tp ScenarioBot 231 80 0 0 0", 500);
    await command("tp MountBctBreak 232 80 -2 0 0", 500);
    await command("tp MountBctSeat 232 80 2 180 0", 500);
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted seat floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MountBctBreak", 250);
    await command("gamemode survival MountBctSeat", 250);
    await command("effect give MountBctBreak minecraft:slow_falling 30 1 true", 250);
    await command("effect give MountBctSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MountBctBreak 232 80 -2 0 0", 500);
    await command("tp MountBctSeat 232 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker");
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(rider);
    await rider.equip(corebreaker, "hand");

    await command("tp MountBctBreak 232 80 -2 0 0", 500);
    await command("tp MountBctSeat 232 80 2 180 0", 500);
    await wait(250);
    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountBctSeat/i);
    assert(mounted, "rider should mount the target player before BCT Corebreaker attempt");
    await wait(250);

    const target = rider.blockAt(BCT_BLOCK);
    assert(target?.name === "crafter", "mounted rider could not see the placed BCT");
    await rider.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    await Promise.race([
      rider.dig(target, true).catch(() => {}),
      wait(1500)
    ]);
    try {
      rider.stopDigging();
    } catch {
      // The state assertions below are the important cross-plugin contract.
    }
    await wait(1000);

    assert(rider.blockAt(BCT_BLOCK)?.name === "crafter", "mounted Corebreaker should not remove the BCT");
    assert(await queryBctDisplays(ctx) === 1, "mounted Corebreaker attempt should not remove or duplicate the BCT display entity");
    const producedBctCount = countBctItems(bot)
      + countBctItems(rider)
      + countBctItems(seat)
      + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
    assert(producedBctCount === 0, `mounted Corebreaker attempt produced ${producedBctCount} BCT item(s)`);
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted denied BCT break should keep the Corebreaker item");
    assert(await queryCorebreakerCharges(rider) === startingCharges, "mounted denied BCT break should not consume a Corebreaker charge");
    assert(await selectedItemHasNoDamage(ctx, "MountBctBreak"), "mounted denied BCT break should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 231 79 -3 233 79 2 minecraft:air", 500);
    await command("forceload remove 232 1", 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
