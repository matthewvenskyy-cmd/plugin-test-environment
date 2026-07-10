import { Vec3 } from "vec3";
import { isCoreItem } from "./helpers.js";

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

  await waitForOwnerInventory(owner, isCoreItem, "owner core item");
  const coreItem = owner.inventory.items().find(isCoreItem);
  assert(coreItem, "owner did not receive a core item");
  await owner.equip(coreItem, "hand");

  const support = owner.blockAt(SUPPORT_BLOCK);
  assert(support?.name === "stone", "support block was not prepared for core placement");
  await owner.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
  try {
    await owner.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    await wait(750);
    if (owner.blockAt(CORE_BLOCK)?.name !== "beacon") {
      throw error;
    }
  }
  await wait(1000);
  assert(owner.blockAt(CORE_BLOCK)?.name === "beacon", "owner core was not placed");

  await command("clear ScenarioBot minecraft:netherite_pickaxe", 250);
  await command("give ScenarioBot minecraft:diamond_pickaxe", 500);
  const pickaxe = breaker.inventory.items().find((item) => item?.name === "diamond_pickaxe");
  assert(pickaxe, "breaker did not receive a plain diamond pickaxe");
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

  await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
}

async function waitForOwnerInventory(owner, predicate, label) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (owner.inventory.items().some(predicate)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
