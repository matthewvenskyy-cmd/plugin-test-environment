import { Vec3 } from "vec3";
import { countBctItems, countNearbyDroppedItems, isBiggerCraftingTableItem } from "./helpers.js";

export const name = "BCT normal break returns one item";

const BCT_BLOCK = new Vec3(2, 80, 1);
const SUPPORT_BLOCK = new Vec3(2, 79, 1);
const FLOOR_BLOCK = new Vec3(2, 79, 0);

export async function run(ctx) {
  const { bot, assert, command, chat, wait, waitForInventory } = ctx;

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 2 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);

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
  assert(countBctItems(bot) === 0, "BCT item should be consumed after placement in survival mode");

  await command("give ScenarioBot minecraft:diamond_pickaxe", 500);
  const pickaxe = bot.inventory.items().find((item) => item?.name === "diamond_pickaxe");
  assert(pickaxe, "diamond pickaxe was not available for normal break");
  await bot.equip(pickaxe, "hand");

  const target = bot.blockAt(BCT_BLOCK);
  await bot.dig(target, true);
  await wait(1500);

  assert(bot.blockAt(BCT_BLOCK)?.name === "air", "normal BCT break should remove the block");
  await command("tp ScenarioBot 2.5 80 1.5 0 0", 1000);
  await waitForInventory(() => {
    return countBctItems(bot) + countNearbyDroppedItems(bot, BCT_BLOCK.offset(0.5, 0.5, 0.5)) === 1;
  }, 5000);
  const returnedBctCount = countBctItems(bot) + countNearbyDroppedItems(bot, BCT_BLOCK.offset(0.5, 0.5, 0.5));
  assert(returnedBctCount === 1, `normal BCT break should leave exactly one BCT item, found ${returnedBctCount}`);

  await command("kill @e[type=item]", 250);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
