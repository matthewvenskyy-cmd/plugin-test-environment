import { Vec3 } from "vec3";
import { countBctItems, countNearbyDroppedItems, isBiggerCraftingTableItem, isCorebreakerItem } from "./helpers.js";

export const name = "BCT cannot be duplicated by Corebreaker";

const BCT_BLOCK = new Vec3(0, 80, 1);
const SUPPORT_BLOCK = new Vec3(0, 79, 1);
const FLOOR_BLOCK = new Vec3(0, 79, 0);

export async function run(ctx) {
  const { bot, assert, command, chat, wait, waitForInventory } = ctx;

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 0 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);

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

  const placed = bot.blockAt(BCT_BLOCK);
  assert(placed?.name === "crafter", `expected placed BCT block to be crafter, got ${placed?.name ?? "nothing"}`);
  assert(countBctItems(bot) === 0, "BCT item should be consumed after placement in survival mode");

  const corebreaker = bot.inventory.items().find(isCorebreakerItem);
  assert(corebreaker, "Corebreaker item was not available for the scenario player");
  await bot.equip(corebreaker, "hand");

  const target = bot.blockAt(BCT_BLOCK);
  try {
    await bot.dig(target, true);
  } catch {
    // Cancelled server-side breaks often surface as a client-side dig failure.
  }
  await wait(1500);

  const afterBreak = bot.blockAt(BCT_BLOCK);
  assert(afterBreak?.name === "crafter", "Corebreaker should not break non-core Bigger Crafting Table blocks");
  const producedBctCount = countBctItems(bot) + countNearbyDroppedItems(bot, BCT_BLOCK.offset(0.5, 0.5, 0.5));
  assert(producedBctCount === 0, `Corebreaker break attempt produced ${producedBctCount} BCT item(s)`);

  await command("kill @e[type=item]", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
