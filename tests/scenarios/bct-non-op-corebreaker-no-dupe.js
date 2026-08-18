import { Vec3 } from "vec3";
import {
  countBctItems,
  countMatchingItems,
  isBiggerCraftingTableItem,
  isCorebreakerItem,
  queryCorebreakerCharges,
  queryDroppedItemEntityCount,
  queryEntityCount,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Non-op Corebreaker cannot duplicate BCT";

const BCT_BLOCK = new Vec3(72, 80, 1);
const SUPPORT_BLOCK = new Vec3(72, 79, 1);
const PLACER_FLOOR = new Vec3(72, 79, 0);
const BREAKER_FLOOR = new Vec3(73, 79, 1);

export async function run(ctx) {
  const { bot, assert, command, chat, wait, waitForInventory, spawnBot } = ctx;
  const breaker = await spawnBot("BctNonOpBreak", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command(`setblock ${PLACER_FLOOR.x} ${PLACER_FLOOR.y} ${PLACER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative BctNonOpBreak", 250);
    await command(`tp ScenarioBot ${PLACER_FLOOR.x} 80 ${PLACER_FLOOR.z} 0 0`, 500);
    await command(`tp BctNonOpBreak ${BREAKER_FLOOR.x} 80 ${BREAKER_FLOOR.z} -90 0`, 500);
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival BctNonOpBreak", 250);
    await breaker.waitForChunksToLoad();
    await wait(1000);

    await chat("/bctgive", 500);
    await waitForInventory((items) => items.some(isBiggerCraftingTableItem));

    const bctItem = bot.inventory.items().find(isBiggerCraftingTableItem);
    assert(bctItem, "Bigger Crafting Table item was not given by /bctgive");
    await bot.equip(bctItem, "hand");

    const support = bot.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not prepared");
    await bot.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await bot.placeBlock(support, new Vec3(0, 1, 0));
    } catch (error) {
      await wait(750);
      if (bot.blockAt(BCT_BLOCK)?.name !== "crafter") {
        throw error;
      }
    }
    await wait(1000);

    assert(bot.blockAt(BCT_BLOCK)?.name === "crafter", "BCT block was not placed");
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

    const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "non-op Corebreaker");
    const startingCorebreakers = countMatchingItems(breaker, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(breaker);
    await breaker.equip(corebreaker, "hand");
    await breaker.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);

    const denied = await waitForChat(breaker, async () => {
      try {
        await breaker.dig(breaker.blockAt(BCT_BLOCK), true);
      } catch {
        // Server-side cancellation often surfaces as a client-side dig failure.
      }
    }, /Corebreakers can only break player cores/i);
    assert(denied, "non-op Corebreaker should be denied when used on BCT");
    await wait(1000);

    assert(breaker.blockAt(BCT_BLOCK)?.name === "crafter", "non-op Corebreaker should not remove a BCT");
    assert(await queryBctDisplays(ctx) === 1, "non-op Corebreaker attempt should not remove or duplicate the BCT display entity");
    const producedBctCount = countBctItems(bot) + countBctItems(breaker) + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
    assert(producedBctCount === 0, `non-op Corebreaker attempt produced ${producedBctCount} BCT item(s)`);
    assert(countMatchingItems(breaker, isCorebreakerItem) === startingCorebreakers, "denied BCT break should keep the non-op Corebreaker item");
    assert(await queryCorebreakerCharges(breaker) === startingCharges, "denied BCT break should not consume a Corebreaker charge");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${PLACER_FLOOR.x} ${PLACER_FLOOR.y} ${PLACER_FLOOR.z} minecraft:air`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
