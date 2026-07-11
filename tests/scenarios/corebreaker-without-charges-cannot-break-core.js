import { Vec3 } from "vec3";
import { isCorebreakerItem, isCoreItem, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Corebreaker without charges cannot break player core";

const CORE_BLOCK = new Vec3(16, 80, 1);
const SUPPORT_BLOCK = new Vec3(16, 79, 1);
const OWNER_FLOOR = new Vec3(16, 79, 0);
const BREAKER_FLOOR = new Vec3(17, 79, 1);
const SECOND_CORE_BLOCK = new Vec3(18, 80, 1);
const SECOND_SUPPORT_BLOCK = new Vec3(18, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(18, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("ChargeVictim");
  const secondOwner = await spawnBot("ChargeVictimTwo");
  const breaker = await spawnBot("NoChargeBreaker", { op: false });

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SECOND_OWNER_FLOOR.x} ${SECOND_OWNER_FLOOR.y} ${SECOND_OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SECOND_SUPPORT_BLOCK.x} ${SECOND_SUPPORT_BLOCK.y} ${SECOND_SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_CORE_BLOCK.x} ${SECOND_CORE_BLOCK.y} ${SECOND_CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative ChargeVictim", 250);
  await command("gamemode creative ChargeVictimTwo", 250);
  await command("gamemode survival NoChargeBreaker", 250);
  await command("tp ChargeVictim 16 80 0 0 0", 500);
  await command("tp ChargeVictimTwo 18 80 0 0 0", 500);
  await command("tp NoChargeBreaker 17 80 1 90 0", 500);
  await command("gamemode survival ChargeVictim", 250);
  await command("gamemode survival ChargeVictimTwo", 250);

  await placeCore(ctx, firstOwner, SUPPORT_BLOCK, CORE_BLOCK, "first owner");
  await placeCore(ctx, secondOwner, SECOND_SUPPORT_BLOCK, SECOND_CORE_BLOCK, "second owner");

  const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "Corebreaker with default charge");
  await breaker.equip(corebreaker, "hand");

  await breakCore(ctx, breaker, CORE_BLOCK, "default charge should break the first core");
  assert(breaker.blockAt(CORE_BLOCK)?.name === "air", "default Corebreaker charge should remove the first core");
  const emptyKills = await waitForChat(breaker, () => breaker.chat("/kills"), /kill queue is empty\. Corebreaker charges: 0/i);
  assert(emptyKills, "/kills should report zero charges after the default Corebreaker charge is consumed");

  await command("tp NoChargeBreaker 17 80 1 90 0", 500);
  await breakCore(ctx, breaker, SECOND_CORE_BLOCK, "exhausted Corebreaker should be cancelled");
  assert(breaker.blockAt(SECOND_CORE_BLOCK)?.name === "beacon", "exhausted Corebreaker should not remove the second core");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_CORE_BLOCK.x} ${SECOND_CORE_BLOCK.y} ${SECOND_CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_SUPPORT_BLOCK.x} ${SECOND_SUPPORT_BLOCK.y} ${SECOND_SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_OWNER_FLOOR.x} ${SECOND_OWNER_FLOOR.y} ${SECOND_OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
}

async function placeCore(ctx, owner, supportPosition, corePosition, label) {
  const { assert, wait } = ctx;
  const coreItem = await waitForInventoryItem(owner, isCoreItem, `${label} core item`);
  await owner.equip(coreItem, "hand");

  const support = owner.blockAt(supportPosition);
  assert(support?.name === "stone", `${label} support block was not prepared for core placement`);
  await owner.lookAt(corePosition.offset(0.5, 0.5, 0.5), true);
  try {
    await owner.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    await wait(750);
    if (owner.blockAt(corePosition)?.name !== "beacon") {
      throw error;
    }
  }
  await wait(1000);
  assert(owner.blockAt(corePosition)?.name === "beacon", `${label} core was not placed`);
}

async function breakCore(ctx, breaker, corePosition, label) {
  const { assert, wait } = ctx;
  const target = breaker.blockAt(corePosition);
  assert(target?.name === "beacon", `breaker could not see the core for ${label}`);
  try {
    await breaker.dig(target, true);
  } catch {
    // CorePlugin cancels some break paths and mutates others itself.
  }
  await wait(1500);
}
