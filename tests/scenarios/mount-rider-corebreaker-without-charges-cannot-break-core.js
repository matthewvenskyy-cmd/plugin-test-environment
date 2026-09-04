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

export const name = "Mounted rider Corebreaker without charges cannot break player core";

const FIRST_CORE = new Vec3(400, 80, 1);
const FIRST_SUPPORT = new Vec3(400, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(400, 79, 0);
const SECOND_CORE = new Vec3(402, 80, 1);
const SECOND_SUPPORT = new Vec3(402, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(402, 79, 0);
const RIDER_FLOOR = new Vec3(401, 79, -2);
const SEAT_FLOOR = new Vec3(401, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("MNoChargeOwn");
  const secondOwner = await spawnBot("MNoChargeTwo");
  const rider = await spawnBot("MNoChargeBrk", { op: false });
  const seat = await spawnBot("MNoChargeSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("deop MNoChargeBrk", 250);
    await command("deop MNoChargeSeat", 250);
    await command("clear MNoChargeSeat", 250);
    await command("effect clear MNoChargeOwn", 250);
    await command("effect clear MNoChargeTwo", 250);
    await command("effect clear MNoChargeBrk", 250);
    await command("effect clear MNoChargeSeat", 250);
    await command("forceload add 399 -2 403 2", 250);
    await command("fill 399 79 -2 403 79 2 minecraft:stone", 500);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("gamemode creative MNoChargeOwn", 250);
    await command("gamemode creative MNoChargeTwo", 250);
    await command("gamemode creative MNoChargeBrk", 250);
    await command("gamemode creative MNoChargeSeat", 250);
    await command("tp MNoChargeOwn 400 80 0 0 0", 500);
    await command("tp MNoChargeTwo 402 80 0 0 0", 500);
    await command("tp MNoChargeBrk 401 80 -2 0 0", 500);
    await command("tp MNoChargeSeat 401 80 2 180 0", 500);
    await firstOwner.waitForChunksToLoad();
    await secondOwner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await waitForBlock(firstOwner, FIRST_OWNER_FLOOR, "stone", "first owner floor block");
    await waitForBlock(secondOwner, SECOND_OWNER_FLOOR, "stone", "second owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted no-charge rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted no-charge seat floor block");
    await command("gamemode survival MNoChargeOwn", 250);
    await command("gamemode survival MNoChargeTwo", 250);
    await command("gamemode survival MNoChargeBrk", 250);
    await command("gamemode survival MNoChargeSeat", 250);
    await wait(500);

    await placeCoreBlock(ctx, firstOwner, FIRST_CORE, FIRST_SUPPORT, { label: "mounted first owner" });
    await placeCoreBlock(ctx, secondOwner, SECOND_CORE, SECOND_SUPPORT, { label: "mounted second owner" });

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MNoChargeSeat/i);
    assert(mounted, "Corebreaker rider should mount the target before charge exhaustion checks");
    await wait(750);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker with default charge");
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    await rider.equip(corebreaker, "hand");

    await breakCore(ctx, rider, FIRST_CORE, "mounted default charge should break the first core");
    assert(await serverBlockIs(ctx, FIRST_CORE, "air"), "mounted default Corebreaker charge should remove the first core");
    assert(await queryCorebreakerCharges(rider) === 0, "/kills should report zero charges after the mounted default charge is consumed");

    await command("tp MNoChargeBrk 401 80 -2 0 0", 250);
    await command("tp MNoChargeSeat 401 80 2 180 0", 250);
    await wait(750);
    await breakCore(ctx, rider, SECOND_CORE, "mounted exhausted Corebreaker should be cancelled");
    assert(await serverBlockIs(ctx, SECOND_CORE, "beacon"), "mounted exhausted Corebreaker should not remove the second core");
    assert(await queryCorebreakerCharges(rider) === 0, "mounted exhausted Corebreaker denial should keep charges at zero");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted exhausted Corebreaker denial should keep the Corebreaker item");
    assert(await selectedItemHasNoDamage(ctx, "MNoChargeBrk"), "mounted exhausted Corebreaker denial should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MNoChargeOwn", 250);
    await command("clear MNoChargeTwo", 250);
    await command("clear MNoChargeBrk", 250);
    await command("clear MNoChargeSeat", 250);
    await command("effect clear MNoChargeOwn", 250);
    await command("effect clear MNoChargeTwo", 250);
    await command("effect clear MNoChargeBrk", 250);
    await command("effect clear MNoChargeSeat", 250);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("fill 399 79 -2 403 79 2 minecraft:air", 500);
    await command("forceload remove 399 -2 403 2", 250);
  }
}

async function breakCore(ctx, breaker, corePosition, label) {
  const { assert, wait } = ctx;
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
