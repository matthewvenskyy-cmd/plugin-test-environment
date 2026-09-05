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

export const name = "Mounted target Corebreaker earned charge breaks player core";

const FIRST_CORE = new Vec3(416, 80, 1);
const FIRST_SUPPORT = new Vec3(416, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(416, 79, 0);
const SECOND_CORE = new Vec3(418, 80, 1);
const SECOND_SUPPORT = new Vec3(418, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(418, 79, 0);
const RIDER_FLOOR = new Vec3(417, 79, -2);
const TARGET_FLOOR = new Vec3(417, 79, 2);
const VICTIM_FLOOR = new Vec3(418, 79, -2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("MTEarnOwnOne");
  const secondOwner = await spawnBot("MTEarnOwnTwo");
  const rider = await spawnBot("MTEarnRider", { op: false });
  const target = await spawnBot("MTEarnBreaker", { op: false });
  const victim = await spawnBot("MTEarnVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MTEarnRider", 250);
    await command("deop MTEarnBreaker", 250);
    await command("clear MTEarnRider", 250);
    await command("effect clear MTEarnOwnOne", 250);
    await command("effect clear MTEarnOwnTwo", 250);
    await command("effect clear MTEarnRider", 250);
    await command("effect clear MTEarnBreaker", 250);
    await command("effect clear MTEarnVictim", 250);
    await command("forceload add 415 -2 419 2", 250);
    await command("fill 415 79 -2 419 79 2 minecraft:stone", 500);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("gamemode creative MTEarnOwnOne", 250);
    await command("gamemode creative MTEarnOwnTwo", 250);
    await command("gamemode creative MTEarnRider", 250);
    await command("gamemode creative MTEarnBreaker", 250);
    await command("gamemode creative MTEarnVictim", 250);
    await command("tp MTEarnOwnOne 416 80 0 0 0", 500);
    await command("tp MTEarnOwnTwo 418 80 0 0 0", 500);
    await command("tp MTEarnRider 417 80 -2 0 0", 500);
    await command("tp MTEarnBreaker 417 80 2 180 0", 500);
    await command("tp MTEarnVictim 418 80 -2 -90 0", 500);
    await firstOwner.waitForChunksToLoad();
    await secondOwner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(firstOwner, FIRST_OWNER_FLOOR, "stone", "mounted target earned-charge first owner floor block");
    await waitForBlock(secondOwner, SECOND_OWNER_FLOOR, "stone", "mounted target earned-charge second owner floor block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target earned-charge rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target earned-charge target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target earned-charge victim floor block");
    await command("gamemode survival MTEarnOwnOne", 250);
    await command("gamemode survival MTEarnOwnTwo", 250);
    await command("gamemode survival MTEarnRider", 250);
    await command("gamemode survival MTEarnBreaker", 250);
    await command("gamemode survival MTEarnVictim", 250);
    await wait(500);

    await placeCoreBlock(ctx, firstOwner, FIRST_CORE, FIRST_SUPPORT, { label: "mounted target earned first owner" });
    await placeCoreBlock(ctx, secondOwner, SECOND_CORE, SECOND_SUPPORT, { label: "mounted target earned second owner" });

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTEarnBreaker/i);
    assert(mounted, "rider should mount the Corebreaker target before earned-charge checks");
    await wait(750);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target Corebreaker with default charge");
    await target.equip(corebreaker, "hand");

    await breakCore(ctx, target, FIRST_CORE, "ridden default charge should break the first core");
    assert(await serverBlockIs(ctx, FIRST_CORE, "air"), "ridden target default Corebreaker charge should remove the first core");
    assert(await queryCorebreakerCharges(target) === 0, "ridden target default charge should be consumed before earning a kill charge");

    await killVictimWithBreaker(ctx, victim);
    assert(await queryCorebreakerCharges(target) === 1, "ridden target unique kill should grant one Corebreaker charge");

    await command("tp MTEarnRider 417 80 -2 0 0", 250);
    await command("tp MTEarnBreaker 417 80 2 180 0", 250);
    await wait(750);
    await breakCore(ctx, target, SECOND_CORE, "ridden earned kill charge should break the second core");
    assert(await serverBlockIs(ctx, SECOND_CORE, "air"), "ridden earned kill charge should destroy the second core");
    assert(await queryCorebreakerCharges(target) === 0, "ridden earned kill charge should be consumed after breaking the second core");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MTEarnOwnOne", 250);
    await command("clear MTEarnOwnTwo", 250);
    await command("clear MTEarnRider", 250);
    await command("clear MTEarnBreaker", 250);
    await command("clear MTEarnVictim", 250);
    await command("effect clear MTEarnOwnOne", 250);
    await command("effect clear MTEarnOwnTwo", 250);
    await command("effect clear MTEarnRider", 250);
    await command("effect clear MTEarnBreaker", 250);
    await command("effect clear MTEarnVictim", 250);
    await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
    await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
    await command("fill 415 79 -2 419 79 2 minecraft:air", 500);
    await command("forceload remove 415 -2 419 2", 250);
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
  await command("effect clear MTEarnVictim", 250);
  await command("attribute MTEarnVictim minecraft:max_health base set 20", 250);
  await command("tp MTEarnRider 417 80 -2 0 0", 250);
  await command("tp MTEarnBreaker 417 80 2 180 0", 250);
  await command("tp MTEarnVictim 418 80 -2 -90 0", 250);
  await wait(750);
  await command("data merge entity MTEarnVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MTEarnVictim 40 minecraft:player_attack by MTEarnBreaker", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `mounted target earned-charge damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
