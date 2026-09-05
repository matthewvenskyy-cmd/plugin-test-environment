import { Vec3 } from "vec3";
import {
  isCorebreakerItem,
  placeCoreBlock,
  queryCorebreakerCharges,
  serverBlockIs,
  waitForBlock,
  waitForChat,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider Corebreaker earned charge breaks player core";

const FIRST_CORE = new Vec3(412, 80, 1);
const FIRST_SUPPORT = new Vec3(412, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(412, 79, 0);
const SECOND_CORE = new Vec3(414, 80, 1);
const SECOND_SUPPORT = new Vec3(414, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(414, 79, 0);
const RIDER_FLOOR = new Vec3(413, 79, -2);
const SEAT_FLOOR = new Vec3(413, 79, 2);
const VICTIM_FLOOR = new Vec3(414, 79, -2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("MEarnOwnOne");
  const secondOwner = await spawnBot("MEarnOwnTwo");
  const rider = await spawnBot("MEarnBreaker", { op: false });
  const seat = await spawnBot("MEarnSeat", { op: false });
  const victim = await spawnBot("MEarnVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MEarnBreaker", 250);
    await command("deop MEarnSeat", 250);
    await command("clear MEarnSeat", 250);
    await command("effect clear MEarnOwnOne", 250);
    await command("effect clear MEarnOwnTwo", 250);
    await command("effect clear MEarnBreaker", 250);
    await command("effect clear MEarnSeat", 250);
    await command("effect clear MEarnVictim", 250);
    await command("forceload add 411 -2 415 2", 250);
    await command("fill 411 79 -2 415 79 2 minecraft:stone", 500);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("gamemode creative MEarnOwnOne", 250);
    await command("gamemode creative MEarnOwnTwo", 250);
    await command("gamemode creative MEarnBreaker", 250);
    await command("gamemode creative MEarnSeat", 250);
    await command("gamemode creative MEarnVictim", 250);
    await command("tp MEarnOwnOne 412 80 0 0 0", 500);
    await command("tp MEarnOwnTwo 414 80 0 0 0", 500);
    await command("tp MEarnBreaker 413 80 -2 0 0", 500);
    await command("tp MEarnSeat 413 80 2 180 0", 500);
    await command("tp MEarnVictim 414 80 -2 -90 0", 500);
    await firstOwner.waitForChunksToLoad();
    await secondOwner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(firstOwner, FIRST_OWNER_FLOOR, "stone", "mounted earned-charge first owner floor block");
    await waitForBlock(secondOwner, SECOND_OWNER_FLOOR, "stone", "mounted earned-charge second owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted earned-charge rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted earned-charge seat floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted earned-charge victim floor block");
    await command("gamemode survival MEarnOwnOne", 250);
    await command("gamemode survival MEarnOwnTwo", 250);
    await command("gamemode survival MEarnBreaker", 250);
    await command("gamemode survival MEarnSeat", 250);
    await command("gamemode survival MEarnVictim", 250);
    await wait(500);

    await placeCoreBlock(ctx, firstOwner, FIRST_CORE, FIRST_SUPPORT, { label: "mounted earned first owner" });
    await placeCoreBlock(ctx, secondOwner, SECOND_CORE, SECOND_SUPPORT, { label: "mounted earned second owner" });

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MEarnSeat/i);
    assert(mounted, "Corebreaker rider should mount the target before earned-charge checks");
    await wait(750);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker with default charge");
    await rider.equip(corebreaker, "hand");

    await breakCore(ctx, rider, FIRST_CORE, "mounted default charge should break the first core");
    assert(await serverBlockIs(ctx, FIRST_CORE, "air"), "mounted default Corebreaker charge should remove the first core");
    assert(await queryCorebreakerCharges(rider) === 0, "mounted default charge should be consumed before earning a kill charge");

    await killVictimWithBreaker(ctx, victim);
    assert(await queryCorebreakerCharges(rider) === 1, "mounted rider unique kill should grant one Corebreaker charge");

    await command("tp MEarnBreaker 413 80 -2 0 0", 250);
    await command("tp MEarnSeat 413 80 2 180 0", 250);
    await wait(750);
    await breakCore(ctx, rider, SECOND_CORE, "mounted earned kill charge should break the second core");
    assert(await serverBlockIs(ctx, SECOND_CORE, "air"), "mounted earned kill charge should destroy the second core");
    assert(await queryCorebreakerCharges(rider) === 0, "mounted earned kill charge should be consumed after breaking the second core");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MEarnOwnOne", 250);
    await command("clear MEarnOwnTwo", 250);
    await command("clear MEarnBreaker", 250);
    await command("clear MEarnSeat", 250);
    await command("clear MEarnVictim", 250);
    await command("effect clear MEarnOwnOne", 250);
    await command("effect clear MEarnOwnTwo", 250);
    await command("effect clear MEarnBreaker", 250);
    await command("effect clear MEarnSeat", 250);
    await command("effect clear MEarnVictim", 250);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("fill 411 79 -2 415 79 2 minecraft:air", 500);
    await command("forceload remove 411 -2 415 2", 250);
  }
}

async function breakCore(ctx, breaker, corePosition, label) {
  const { wait } = ctx;
  const target = await waitForBlock(breaker, corePosition, "beacon", label);
  await breaker.lookAt(corePosition.offset(0.5, 0.5, 0.5), true);
  try {
    await breaker.dig(target, true);
  } catch {
    // CorePlugin cancels vanilla breaking and mutates valid core breaks itself.
  }
  await wait(1500);
}

async function killVictimWithBreaker(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MEarnVictim", 250);
  await command("attribute MEarnVictim minecraft:max_health base set 20", 250);
  await command("tp MEarnBreaker 413 80 -2 0 0", 250);
  await command("tp MEarnSeat 413 80 2 180 0", 250);
  await command("tp MEarnVictim 414 80 -2 -90 0", 250);
  await wait(750);
  await command("data merge entity MEarnVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MEarnVictim 40 minecraft:player_attack by MEarnBreaker", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `mounted earned-charge damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
