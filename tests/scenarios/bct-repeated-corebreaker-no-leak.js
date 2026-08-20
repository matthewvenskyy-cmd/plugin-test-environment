import { Vec3 } from "vec3";
import {
  countBctItems,
  countMatchingItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryCorebreakerCharges,
  queryDroppedItemEntityCount,
  queryEntityCount,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Repeated Corebreaker attempts do not leak BCT state";

const BCT_BLOCK = new Vec3(216, 80, 1);
const SUPPORT_BLOCK = new Vec3(216, 79, 1);
const PLACER_FLOOR = new Vec3(216, 79, 0);
const BREAKER_FLOOR = new Vec3(217, 79, 1);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const breaker = await spawnBot("BctRepeatBreak", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 216 1", 250);
    await command(`setblock ${PLACER_FLOOR.x} ${PLACER_FLOOR.y} ${PLACER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative BctRepeatBreak", 250);
    await command(`tp ScenarioBot ${PLACER_FLOOR.x} 80 ${PLACER_FLOOR.z} 0 0`, 500);
    await command(`tp BctRepeatBreak ${BREAKER_FLOOR.x} 80 ${BREAKER_FLOOR.z} -90 0`, 500);
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival BctRepeatBreak", 250);
    await breaker.waitForChunksToLoad();
    await wait(1000);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

    const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "non-op Corebreaker");
    const startingCorebreakers = countMatchingItems(breaker, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(breaker);
    await breaker.equip(corebreaker, "hand");

    for (let attempt = 1; attempt <= 3; attempt++) {
      await breaker.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
      const denied = await waitForChat(breaker, async () => {
        try {
          await breaker.dig(breaker.blockAt(BCT_BLOCK), true);
        } catch {
          // Cancelled server-side breaks often surface as client-side dig failures.
        }
      }, /Corebreakers can only break player cores/i);
      assert(denied, `Corebreaker attempt ${attempt} should be denied on BCT`);
      await wait(750);

      assert(breaker.blockAt(BCT_BLOCK)?.name === "crafter", `attempt ${attempt} should leave the BCT block placed`);
      assert(await queryBctDisplays(ctx) === 1, `attempt ${attempt} should keep exactly one BCT display entity`);
      const producedBctCount = countBctItems(bot) + countBctItems(breaker) + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
      assert(producedBctCount === 0, `attempt ${attempt} produced ${producedBctCount} BCT item(s)`);
      assert(countMatchingItems(breaker, isCorebreakerItem) === startingCorebreakers, `attempt ${attempt} should keep the Corebreaker item`);
      assert(await queryCorebreakerCharges(breaker) === startingCharges, `attempt ${attempt} should not consume a Corebreaker charge`);
    }
  } finally {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${PLACER_FLOOR.x} ${PLACER_FLOOR.y} ${PLACER_FLOOR.z} minecraft:air`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
    await command("forceload remove 216 1", 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
