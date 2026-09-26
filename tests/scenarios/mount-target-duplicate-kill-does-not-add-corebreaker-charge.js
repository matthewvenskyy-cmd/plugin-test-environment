import { Vec3 } from "vec3";
import {
  applyServerDamage,
  clearDroppedItems,
  queryCorebreakerCharges,
  serverPlayerIsPassengerOf,
  waitForBlock,
  waitForChat,
  waitForEvent,
  waitForPlayerPassengerState
} from "./helpers.js";

export const name = "Mounted target duplicate kill does not add Corebreaker charge";

const RIDER_FLOOR = new Vec3(424, 79, -1);
const TARGET_FLOOR = new Vec3(424, 79, 1);
const VICTIM_FLOOR = new Vec3(425, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MTDupRider", { op: false });
  const target = await spawnBot("MTDupKiller", { op: false });
  const victim = await spawnBot("MTDupVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await clearDroppedItems(ctx);
    await command("deop MTDupRider", 250);
    await command("deop MTDupKiller", 250);
    await command("clear MTDupRider", 250);
    await command("effect clear MTDupRider", 250);
    await command("effect clear MTDupKiller", 250);
    await command("effect clear MTDupVictim", 250);
    await command("forceload add 423 -1 426 1", 250);
    await command("fill 423 79 -1 426 79 1 minecraft:stone", 500);
    await command("gamemode creative MTDupRider", 250);
    await command("gamemode creative MTDupKiller", 250);
    await command("gamemode creative MTDupVictim", 250);
    await command("tp MTDupRider 424 80 -1 0 0", 500);
    await command("tp MTDupKiller 424 80 1 180 0", 500);
    await command("tp MTDupVictim 425 80 1 -90 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target duplicate-kill rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target duplicate-kill target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target duplicate-kill victim floor block");
    await command("gamemode survival MTDupRider", 250);
    await command("gamemode survival MTDupKiller", 250);
    await command("gamemode survival MTDupVictim", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTDupKiller/i);
    assert(mounted, "rider should mount the killer target before duplicate-kill charge checks");
    await waitForPlayerPassengerState(ctx, "MTDupRider", "MTDupKiller", true, "mounted target duplicate-kill attachment");

    const startingCharges = await queryCorebreakerCharges(target);
    await killVictim(ctx, victim, "MTDupRider", "MTDupKiller", "mounted target first kill");
    const firstCharges = await queryCorebreakerCharges(target);
    assert(firstCharges === startingCharges + 1, `mounted target first unique kill should add one Corebreaker charge; before=${startingCharges}, after=${firstCharges}`);

    await killVictim(ctx, victim, "MTDupRider", "MTDupKiller", "mounted target duplicate kill");
    const secondCharges = await queryCorebreakerCharges(target);
    assert(secondCharges === firstCharges, `mounted target duplicate victim kill should not add another Corebreaker charge; first=${firstCharges}, second=${secondCharges}`);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MTDupRider", "MTDupKiller"),
      "target duplicate-kill checks should leave the rider attached"
    );

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "rider should dismount cleanly after target duplicate-kill checks");
    await waitForPlayerPassengerState(ctx, "MTDupRider", "MTDupKiller", false, "mounted target duplicate-kill detachment");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await clearDroppedItems(ctx);
    await command("clear MTDupRider", 250);
    await command("clear MTDupKiller", 250);
    await command("clear MTDupVictim", 250);
    await command("effect clear MTDupRider", 250);
    await command("effect clear MTDupKiller", 250);
    await command("effect clear MTDupVictim", 250);
    await command("fill 423 79 -1 426 79 1 minecraft:air", 500);
    await command("forceload remove 423 -1 426 1", 250);
  }
}

async function killVictim(ctx, victim, riderName, vehicleName, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MTDupVictim", 250);
  await command("attribute MTDupVictim minecraft:max_health base set 20", 250);
  await command("tp MTDupVictim 425 80 1 -90 0", 250);
  await wait(750);
  await command("data merge entity MTDupVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);
  assert(await serverPlayerIsPassengerOf(ctx, riderName, vehicleName), `${label} should occur while the killer is mounted`);

  const respawned = waitForEvent(victim, "respawn", 8000);
  await applyServerDamage(ctx, "damage MTDupVictim 40 minecraft:player_attack by MTDupKiller", "mounted target duplicate-kill damage");
  await respawned;
  await wait(1500);
}
