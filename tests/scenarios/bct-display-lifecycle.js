import { Vec3 } from "vec3";
import { clearBctArtifacts, digUntilServerBlock, placeBiggerCraftingTable, waitForBctDisplayCount, waitForInventoryItem } from "./helpers.js";

export const name = "BCT display lifecycle follows block";

const BCT_BLOCK = new Vec3(22, 80, 1);
const SUPPORT_BLOCK = new Vec3(22, 79, 1);
const FLOOR_BLOCK = new Vec3(22, 79, 0);

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  const bot = await spawnBot("BctDisplayBot");

  await clearBctArtifacts(ctx);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("clear BctDisplayBot minecraft:crafter", 250);
  await command("gamemode creative BctDisplayBot", 250);
  await command("tp BctDisplayBot 22 80 0 0 0", 500);
  await command("gamemode survival BctDisplayBot", 250);

  await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });
  await waitForBctDisplayCount(ctx, BCT_BLOCK, 1, {
    label: "placed BCT display entity"
  });

  await command("give BctDisplayBot minecraft:diamond_pickaxe", 500);
  const pickaxe = await waitForInventoryItem(bot, (item) => item?.name === "diamond_pickaxe", "diamond pickaxe");
  await bot.equip(pickaxe, "hand");

  const removed = await digUntilServerBlock(ctx, bot, BCT_BLOCK, "air", {
    label: "normal BCT break removes block"
  });
  assert(removed, "normal BCT break should remove the block");
  await waitForBctDisplayCount(ctx, BCT_BLOCK, 0, {
    label: "removed BCT display entity"
  });

  await clearBctArtifacts(ctx);
  await command("clear BctDisplayBot minecraft:crafter", 250);
  await command("clear BctDisplayBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
