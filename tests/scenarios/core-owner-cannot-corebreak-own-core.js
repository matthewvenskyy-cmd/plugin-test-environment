import { Vec3 } from "vec3";
import { countMatchingItems, isCorebreakerItem, placeCoreBlock, queryCorebreakerCharges } from "./helpers.js";

export const name = "Core owner cannot Corebreak own core";

const CORE_BLOCK = new Vec3(6, 80, 1);
const SUPPORT_BLOCK = new Vec3(6, 79, 1);
const OWNER_FLOOR = new Vec3(6, 79, 0);
const BREAK_FLOOR = new Vec3(7, 79, 1);

export async function run(ctx) {
  const { bot, assert, command, wait } = ctx;

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAK_FLOOR.x} ${BREAK_FLOOR.y} ${BREAK_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 6 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);

  await placeCoreBlock(ctx, bot, CORE_BLOCK, SUPPORT_BLOCK, { label: "own" });

  const corebreaker = bot.inventory.items().find(isCorebreakerItem);
  assert(corebreaker, "owner did not have a Corebreaker");
  const startingCorebreakers = countMatchingItems(bot, isCorebreakerItem);
  await bot.equip(corebreaker, "hand");

  await command("deop ScenarioBot", 250);
  const startingCharges = await queryCorebreakerCharges(bot);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 7 80 1 90 0", 500);
  await command("gamemode survival ScenarioBot", 250);

  const target = bot.blockAt(CORE_BLOCK);
  assert(target?.name === "beacon", "owner could not see own core before break attempt");
  try {
    await bot.dig(target, true);
  } catch {
    // Expected: CorePlugin cancels the break.
  }
  await wait(1500);

  assert(bot.blockAt(CORE_BLOCK)?.name === "beacon", "owner Corebreaker should not remove own core");
  assert(await queryCorebreakerCharges(bot) === startingCharges, "owner Corebreaker denial should not consume charges");
  assert(countMatchingItems(bot, isCorebreakerItem) === startingCorebreakers, "owner Corebreaker denial should keep the Corebreaker item");

  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAK_FLOOR.x} ${BREAK_FLOOR.y} ${BREAK_FLOOR.z} minecraft:air`, 250);
}
