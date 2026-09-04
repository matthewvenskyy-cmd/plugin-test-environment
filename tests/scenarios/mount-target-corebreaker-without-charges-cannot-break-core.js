import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCorebreakerItem,
  placeCoreBlock,
  queryCorebreakerCharges,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target Corebreaker without charges cannot break player core";

const FIRST_CORE = new Vec3(406, 80, 1);
const FIRST_SUPPORT = new Vec3(406, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(406, 79, 0);
const SECOND_CORE = new Vec3(408, 80, 1);
const SECOND_SUPPORT = new Vec3(408, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(408, 79, 0);
const RIDER_FLOOR = new Vec3(407, 79, -2);
const TARGET_FLOOR = new Vec3(407, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("MtNoChargeOwn");
  const secondOwner = await spawnBot("MtNoChargeTwo");
  const rider = await spawnBot("MtNoChargeRide", { op: false });
  const target = await spawnBot("MtNoChargeBrk", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("deop MtNoChargeRide", 250);
    await command("deop MtNoChargeBrk", 250);
    await command("clear MtNoChargeRide", 250);
    await command("effect clear MtNoChargeOwn", 250);
    await command("effect clear MtNoChargeTwo", 250);
    await command("effect clear MtNoChargeRide", 250);
    await command("effect clear MtNoChargeBrk", 250);
    await command("forceload add 405 -2 409 2", 250);
    await command("fill 405 79 -2 409 79 2 minecraft:stone", 500);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("gamemode creative MtNoChargeOwn", 250);
    await command("gamemode creative MtNoChargeTwo", 250);
    await command("gamemode creative MtNoChargeRide", 250);
    await command("gamemode creative MtNoChargeBrk", 250);
    await command("tp MtNoChargeOwn 406 80 0 0 0", 500);
    await command("tp MtNoChargeTwo 408 80 0 0 0", 500);
    await command("tp MtNoChargeRide 407 80 -2 0 0", 500);
    await command("tp MtNoChargeBrk 407 80 2 180 0", 500);
    await firstOwner.waitForChunksToLoad();
    await secondOwner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await waitForBlock(firstOwner, FIRST_OWNER_FLOOR, "stone", "mounted target first owner floor block");
    await waitForBlock(secondOwner, SECOND_OWNER_FLOOR, "stone", "mounted target second owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target no-charge rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target no-charge floor block");
    await command("gamemode survival MtNoChargeOwn", 250);
    await command("gamemode survival MtNoChargeTwo", 250);
    await command("gamemode survival MtNoChargeRide", 250);
    await command("gamemode survival MtNoChargeBrk", 250);
    await wait(500);

    await placeCoreBlock(ctx, firstOwner, FIRST_CORE, FIRST_SUPPORT, { label: "mounted target first owner" });
    await placeCoreBlock(ctx, secondOwner, SECOND_CORE, SECOND_SUPPORT, { label: "mounted target second owner" });

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtNoChargeBrk/i);
    assert(mounted, "rider should mount the Corebreaker target before charge exhaustion checks");
    await wait(750);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target Corebreaker with default charge");
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    await target.equip(corebreaker, "hand");

    await breakCore(ctx, target, FIRST_CORE, "ridden default charge should break the first core");
    assert(await serverBlockIs(ctx, FIRST_CORE, "air"), "ridden target default Corebreaker charge should remove the first core");
    assert(await queryCorebreakerCharges(target) === 0, "/kills should report zero charges after the ridden target default charge is consumed");

    await command("tp MtNoChargeRide 407 80 -2 0 0", 250);
    await command("tp MtNoChargeBrk 407 80 2 180 0", 250);
    await wait(750);
    await breakCore(ctx, target, SECOND_CORE, "ridden exhausted Corebreaker should be cancelled");
    assert(await serverBlockIs(ctx, SECOND_CORE, "beacon"), "ridden exhausted Corebreaker should not remove the second core");
    assert(await queryCorebreakerCharges(target) === 0, "ridden exhausted Corebreaker denial should keep charges at zero");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden exhausted Corebreaker denial should keep the Corebreaker item");
    assert(await selectedItemHasNoDamage(ctx, "MtNoChargeBrk"), "ridden exhausted Corebreaker denial should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MtNoChargeOwn", 250);
    await command("clear MtNoChargeTwo", 250);
    await command("clear MtNoChargeRide", 250);
    await command("clear MtNoChargeBrk", 250);
    await command("effect clear MtNoChargeOwn", 250);
    await command("effect clear MtNoChargeTwo", 250);
    await command("effect clear MtNoChargeRide", 250);
    await command("effect clear MtNoChargeBrk", 250);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("fill 405 79 -2 409 79 2 minecraft:air", 500);
    await command("forceload remove 405 -2 409 2", 250);
  }
}

async function breakCore(ctx, breaker, corePosition, label) {
  const { wait } = ctx;
  const target = await waitForBlock(breaker, corePosition, "beacon", label);
  await breaker.lookAt(corePosition.offset(0.5, 0.5, 0.5), true);
  try {
    await breaker.dig(target, true);
  } catch {
    // CorePlugin cancels denied Corebreaker paths and handles successful core removal itself.
  }
  await wait(1500);
}

async function serverBlockIs(ctx, position, blockName) {
  const output = await ctx.command(`execute if block ${position.x} ${position.y} ${position.z} minecraft:${blockName}`, 250);
  return /Test passed/.test(output);
}
