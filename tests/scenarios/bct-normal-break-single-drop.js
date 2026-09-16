import { Vec3 } from "vec3";
import { clearBctArtifacts, countBctItemsNear, countItemsByName, digUntilServerBlock, placeBiggerCraftingTable, waitForBctItemsNear } from "./helpers.js";

export const name = "BCT normal break returns one item";

const BCT_BLOCK = new Vec3(2, 80, 1);
const SUPPORT_BLOCK = new Vec3(2, 79, 1);
const FLOOR_BLOCK = new Vec3(2, 79, 0);

export async function run(ctx) {
  const { bot, assert, command } = ctx;

  await clearBctArtifacts(ctx);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 2 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);

  await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
  assert(countItemsByName(bot, "crafter") === 0, "BCT item should be consumed after placement in survival mode");

  await command("give ScenarioBot minecraft:diamond_pickaxe", 500);
  const pickaxe = bot.inventory.items().find((item) => item?.name === "diamond_pickaxe");
  assert(pickaxe, "diamond pickaxe was not available for normal break");
  await bot.equip(pickaxe, "hand");

  const removed = await digUntilServerBlock(ctx, bot, BCT_BLOCK, "air", {
    label: "normal BCT break removes block"
  });
  assert(removed, "normal BCT break should remove the block on the server");
  await command("tp ScenarioBot 2.5 80 1.5 0 0", 1000);
  await waitForBctItemsNear(ctx, BCT_BLOCK, [bot], 1, {
    label: "normal BCT break returns one BCT item"
  });
  const returnedBctCount = await countBctItemsNear(ctx, BCT_BLOCK, [bot]);
  assert(returnedBctCount === 1, `normal BCT break should leave exactly one BCT item, found ${returnedBctCount}`);

  await clearBctArtifacts(ctx);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
