import { Vec3 } from "vec3";
import { queryCorebreakerCharges, waitForBlock, waitForChat, waitForEvent } from "./helpers.js";

export const name = "Mounted rider duplicate kill does not add Corebreaker charge";

const RIDER_FLOOR = new Vec3(420, 79, -1);
const TARGET_FLOOR = new Vec3(420, 79, 1);
const VICTIM_FLOOR = new Vec3(421, 79, -1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MRDupKiller", { op: false });
  const target = await spawnBot("MRDupSeat", { op: false });
  const victim = await spawnBot("MRDupVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MRDupKiller", 250);
    await command("deop MRDupSeat", 250);
    await command("clear MRDupSeat", 250);
    await command("effect clear MRDupKiller", 250);
    await command("effect clear MRDupSeat", 250);
    await command("effect clear MRDupVictim", 250);
    await command("forceload add 419 -1 422 1", 250);
    await command("fill 419 79 -1 422 79 1 minecraft:stone", 500);
    await command("gamemode creative MRDupKiller", 250);
    await command("gamemode creative MRDupSeat", 250);
    await command("gamemode creative MRDupVictim", 250);
    await command("tp MRDupKiller 420 80 -1 0 0", 500);
    await command("tp MRDupSeat 420 80 1 180 0", 500);
    await command("tp MRDupVictim 421 80 -1 -90 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider duplicate-kill rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted rider duplicate-kill target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted rider duplicate-kill victim floor block");
    await command("gamemode survival MRDupKiller", 250);
    await command("gamemode survival MRDupSeat", 250);
    await command("gamemode survival MRDupVictim", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MRDupSeat/i);
    assert(mounted, "killer should mount the target before duplicate-kill charge checks");
    await wait(750);

    const startingCharges = await queryCorebreakerCharges(rider);
    await killVictim(ctx, victim);
    const firstCharges = await queryCorebreakerCharges(rider);
    assert(firstCharges === startingCharges + 1, `mounted rider first unique kill should add one Corebreaker charge; before=${startingCharges}, after=${firstCharges}`);

    await killVictim(ctx, victim);
    const secondCharges = await queryCorebreakerCharges(rider);
    assert(secondCharges === firstCharges, `mounted rider duplicate victim kill should not add another Corebreaker charge; first=${firstCharges}, second=${secondCharges}`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MRDupKiller", 250);
    await command("clear MRDupSeat", 250);
    await command("clear MRDupVictim", 250);
    await command("effect clear MRDupKiller", 250);
    await command("effect clear MRDupSeat", 250);
    await command("effect clear MRDupVictim", 250);
    await command("fill 419 79 -1 422 79 1 minecraft:air", 500);
    await command("forceload remove 419 -1 422 1", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MRDupVictim", 250);
  await command("attribute MRDupVictim minecraft:max_health base set 20", 250);
  await command("tp MRDupKiller 420 80 -1 0 0", 250);
  await command("tp MRDupSeat 420 80 1 180 0", 250);
  await command("tp MRDupVictim 421 80 -1 -90 0", 250);
  await wait(750);
  await command("data merge entity MRDupVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MRDupVictim 40 minecraft:player_attack by MRDupKiller", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `mounted rider duplicate-kill damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
