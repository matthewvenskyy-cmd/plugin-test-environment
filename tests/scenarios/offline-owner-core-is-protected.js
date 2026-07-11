import { Vec3 } from "vec3";
import { isCorebreakerItem, isCoreItem, waitForInventoryItem } from "./helpers.js";

export const name = "Offline owner's core is protected from Corebreaker";

const CORE_BLOCK = new Vec3(10, 80, 1);
const SUPPORT_BLOCK = new Vec3(10, 79, 1);
const OWNER_FLOOR = new Vec3(10, 79, 0);
const BREAKER_FLOOR = new Vec3(11, 79, 1);

export async function run(ctx) {
  const { bot: breaker, assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("OffCoreOwner");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative OffCoreOwner", 250);
  await command("gamemode creative ScenarioBot", 250);
  await command("tp OffCoreOwner 10 80 0 0 0", 500);
  await command("tp ScenarioBot 11 80 1 90 0", 500);
  await command("gamemode survival OffCoreOwner", 250);
  await command("gamemode survival ScenarioBot", 250);

  const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
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

  owner.quit("testing offline protection");
  await wait(1000);

  const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "breaker Corebreaker");
  assert(corebreaker, "breaker did not receive a Corebreaker");
  await breaker.equip(corebreaker, "hand");

  const target = breaker.blockAt(CORE_BLOCK);
  assert(target?.name === "beacon", "breaker could not see the offline owner's core");
  try {
    await breaker.dig(target, true);
  } catch {
    // Expected: CorePlugin cancels the break while the owner is offline-protected.
  }
  await wait(1500);

  assert(breaker.blockAt(CORE_BLOCK)?.name === "beacon", "offline owner's core should remain protected");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
}
