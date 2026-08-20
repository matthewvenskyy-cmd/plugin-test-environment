import { Vec3 } from "vec3";
import { countItemsByName, placeCoreBlock, selectedItemHasNoDamage } from "./helpers.js";

export const name = "Non-Corebreaker cannot break another player's core";

const CORE_BLOCK = new Vec3(8, 80, 1);
const SUPPORT_BLOCK = new Vec3(8, 79, 1);
const OWNER_FLOOR = new Vec3(8, 79, 0);
const BREAKER_FLOOR = new Vec3(9, 79, 1);

export async function run(ctx) {
  const { bot: breaker, assert, command, wait, waitForInventory, spawnBot } = ctx;
  const owner = await spawnBot("PlainToolOwner");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative PlainToolOwner", 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp PlainToolOwner 8 80 0 0 0", 500);
  await command("tp ScenarioBot 9 80 1 90 0", 500);
  await command("gamemode survival PlainToolOwner", 250);
  await command("gamemode survival ScenarioBot", 250);

  await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });

  await command("clear ScenarioBot minecraft:netherite_pickaxe", 250);
  await command("give ScenarioBot minecraft:diamond_pickaxe", 500);
  const pickaxe = breaker.inventory.items().find((item) => item?.name === "diamond_pickaxe");
  assert(pickaxe, "breaker did not receive a plain diamond pickaxe");
  const startingPickaxes = countItemsByName(breaker, "diamond_pickaxe");
  await breaker.equip(pickaxe, "hand");

  const target = breaker.blockAt(CORE_BLOCK);
  assert(target?.name === "beacon", "breaker could not see the placed core block");
  try {
    await breaker.dig(target, true);
  } catch {
    // Expected: CorePlugin cancels the break.
  }
  await wait(1500);

  assert(breaker.blockAt(CORE_BLOCK)?.name === "beacon", "plain tools should not remove another player's core");
  assert(countItemsByName(breaker, "diamond_pickaxe") === startingPickaxes, "denied plain-tool core break should keep the diamond pickaxe");
  assert(await selectedItemHasNoDamage(ctx, "ScenarioBot"), "denied plain-tool core break should not damage the diamond pickaxe");

  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
}
