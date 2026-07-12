import { Vec3 } from "vec3";
import { isCoreItem, serverBlockIs, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Core owner is alerted when nearby blocks break";

const CORE_BLOCK = new Vec3(46, 80, 1);
const SUPPORT_BLOCK = new Vec3(46, 79, 1);
const OWNER_FLOOR = new Vec3(46, 79, 0);
const BREAK_TARGET = new Vec3(47, 80, 1);
const BREAKER_FLOOR = new Vec3(47, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("AlertOwner");
  const breaker = await spawnBot("AlertBreaker", { op: false });

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:stone`, 250);
  await command("gamemode creative AlertOwner", 250);
  await command("gamemode survival AlertBreaker", 250);
  await command("tp AlertOwner 46 80 0 0 0", 500);
  await command("tp AlertBreaker 47 80 1 90 0", 500);
  await command("gamemode survival AlertOwner", 250);
  await wait(1000);

  const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
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
  assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core was not placed");

  await command("clear AlertBreaker minecraft:netherite_pickaxe", 250);
  await command("give AlertBreaker minecraft:diamond_pickaxe", 500);
  const pickaxe = breaker.inventory.items().find((item) => item?.name === "diamond_pickaxe");
  assert(pickaxe, "breaker did not receive a plain diamond pickaxe");
  await breaker.equip(pickaxe, "hand");

  const target = breaker.blockAt(BREAK_TARGET);
  assert(target?.name === "stone", "near-core break target was not prepared");
  const alerted = await waitForChat(owner, async () => {
    await breaker.lookAt(BREAK_TARGET.offset(0.5, 0.5, 0.5), true);
    await breaker.dig(target, true);
  }, /Block broken near your core at/i, 8000);
  assert(alerted, "owner should receive a nearby core break alert");
  await wait(1000);

  assert(await serverBlockIs(ctx, BREAK_TARGET, "air"), "nearby non-core block should still break normally");
  assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "nearby block break should not modify the core");

  await command("clear AlertBreaker minecraft:diamond_pickaxe", 250);
  await command("kill @e[type=item]", 250);
  await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:air`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
}
