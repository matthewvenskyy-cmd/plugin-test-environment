import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCorebreakerItem,
  placeCoreBlock,
  queryCorebreakerCharges,
  waitForInventoryItem
} from "./helpers.js";

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

  await placeCoreBlock(ctx, firstOwner, CORE_BLOCK, SUPPORT_BLOCK, { label: "first owner" });
  await placeCoreBlock(ctx, secondOwner, SECOND_CORE_BLOCK, SECOND_SUPPORT_BLOCK, { label: "second owner" });

  const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "Corebreaker with default charge");
  const startingCorebreakers = countMatchingItems(breaker, isCorebreakerItem);
  await breaker.equip(corebreaker, "hand");

  await breakCore(ctx, breaker, CORE_BLOCK, "default charge should break the first core");
  assert(breaker.blockAt(CORE_BLOCK)?.name === "air", "default Corebreaker charge should remove the first core");
  assert(await queryCorebreakerCharges(breaker) === 0, "/kills should report zero charges after the default Corebreaker charge is consumed");

  await command("tp NoChargeBreaker 17 80 1 90 0", 500);
  await breakCore(ctx, breaker, SECOND_CORE_BLOCK, "exhausted Corebreaker should be cancelled");
  assert(breaker.blockAt(SECOND_CORE_BLOCK)?.name === "beacon", "exhausted Corebreaker should not remove the second core");
  assert(await queryCorebreakerCharges(breaker) === 0, "exhausted Corebreaker denial should keep charges at zero");
  assert(countMatchingItems(breaker, isCorebreakerItem) === startingCorebreakers, "exhausted Corebreaker denial should keep the Corebreaker item");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_CORE_BLOCK.x} ${SECOND_CORE_BLOCK.y} ${SECOND_CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_SUPPORT_BLOCK.x} ${SECOND_SUPPORT_BLOCK.y} ${SECOND_SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_OWNER_FLOOR.x} ${SECOND_OWNER_FLOOR.y} ${SECOND_OWNER_FLOOR.z} minecraft:air`, 250);
  await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
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
