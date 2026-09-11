import { Vec3 } from "vec3";
import {
  assertNoBctLeak,
  clearBctArtifacts,
  countBctItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryBctDisplayCount,
  selectedItemHasNoDamage
} from "./helpers.js";

export const name = "BCT cannot be duplicated by Corebreaker";

const BCT_BLOCK = new Vec3(0, 80, 1);
const SUPPORT_BLOCK = new Vec3(0, 79, 1);
const FLOOR_BLOCK = new Vec3(0, 79, 0);

export async function run(ctx) {
  const { bot, assert, command, wait } = ctx;

  await clearBctArtifacts(ctx);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("clear ScenarioBot minecraft:crafter", 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 0 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);

  const placed = await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
  assert(placed?.name === "crafter", `expected placed BCT block to be crafter, got ${placed?.name ?? "nothing"}`);
  assert(countBctItems(bot) === 0, "BCT item should be consumed after placement in survival mode");
  assert(await queryBctDisplayCount(ctx, BCT_BLOCK) === 1, "placing a BCT should create exactly one display entity before Corebreaker attempt");

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
  await assertNoBctLeak(ctx, {
    position: BCT_BLOCK,
    holders: [bot],
    label: "Corebreaker break attempt"
  });
  assert(await selectedItemHasNoDamage(ctx, "ScenarioBot"), "Corebreaker attempt should not damage the Corebreaker");

  await clearBctArtifacts(ctx);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
