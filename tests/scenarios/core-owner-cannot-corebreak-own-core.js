import { Vec3 } from "vec3";
import { isCorebreakerItem, isCoreItem } from "./helpers.js";

export const name = "Core owner cannot Corebreak own core";

const CORE_BLOCK = new Vec3(6, 80, 1);
const SUPPORT_BLOCK = new Vec3(6, 79, 1);
const OWNER_FLOOR = new Vec3(6, 79, 0);
const BREAK_FLOOR = new Vec3(7, 79, 1);

export async function run(ctx) {
  const { bot, assert, command, wait, waitForInventory } = ctx;

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAK_FLOOR.x} ${BREAK_FLOOR.y} ${BREAK_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative ScenarioBot", 250);
  await command("tp ScenarioBot 6 80 0 0 0", 500);
  await command("gamemode survival ScenarioBot", 250);

  await waitForInventory((items) => items.some(isCoreItem));
  const coreItem = bot.inventory.items().find(isCoreItem);
  assert(coreItem, "owner did not have a core item");
  await bot.equip(coreItem, "hand");

  const support = bot.blockAt(SUPPORT_BLOCK);
  assert(support?.name === "stone", "support block was not prepared for own-core placement");
  await bot.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
  try {
    await bot.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    await wait(750);
    if (bot.blockAt(CORE_BLOCK)?.name !== "beacon") {
      throw error;
    }
  }
  await wait(1000);
  assert(bot.blockAt(CORE_BLOCK)?.name === "beacon", "own core was not placed");

  const corebreaker = bot.inventory.items().find(isCorebreakerItem);
  assert(corebreaker, "owner did not have a Corebreaker");
  await bot.equip(corebreaker, "hand");

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

  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAK_FLOOR.x} ${BREAK_FLOOR.y} ${BREAK_FLOOR.z} minecraft:air`, 250);
}
