import { Vec3 } from "vec3";
import {
  displayText,
  isCorebreakerItem,
  queryCorebreakerCharges,
  waitForBlock,
  waitForChat,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target Corebreaker item updates after unique kill";

const RIDER_FLOOR = new Vec3(432, 79, -1);
const TARGET_FLOOR = new Vec3(432, 79, 1);
const VICTIM_FLOOR = new Vec3(433, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MTLoreRider", { op: false });
  const target = await spawnBot("MTLoreKiller", { op: false });
  const victim = await spawnBot("MTLoreVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MTLoreRider", 250);
    await command("deop MTLoreKiller", 250);
    await command("clear MTLoreRider", 250);
    await command("effect clear MTLoreRider", 250);
    await command("effect clear MTLoreKiller", 250);
    await command("effect clear MTLoreVictim", 250);
    await command("forceload add 431 -1 434 1", 250);
    await command("fill 431 79 -1 434 79 1 minecraft:stone", 500);
    await command("gamemode creative MTLoreRider", 250);
    await command("gamemode creative MTLoreKiller", 250);
    await command("gamemode creative MTLoreVictim", 250);
    await command("tp MTLoreRider 432 80 -1 0 0", 500);
    await command("tp MTLoreKiller 432 80 1 180 0", 500);
    await command("tp MTLoreVictim 433 80 1 -90 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target lore update rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target lore update target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target lore update victim floor block");
    await command("gamemode survival MTLoreRider", 250);
    await command("gamemode survival MTLoreKiller", 250);
    await command("gamemode survival MTLoreVictim", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTLoreKiller/i);
    assert(mounted, "rider should mount the target before mounted target Corebreaker lore checks");
    await wait(750);

    await waitForInventoryItem(target, isCorebreakerItem, "mounted target Corebreaker before kill");
    const beforeCharges = await queryCorebreakerCharges(target);
    await killVictim(ctx, victim);
    const afterCharges = await queryCorebreakerCharges(target);
    assert(afterCharges === beforeCharges + 1, `mounted target unique kill should add one Corebreaker charge; before=${beforeCharges}, after=${afterCharges}`);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target updated Corebreaker item");
    const text = displayText(corebreaker);
    assert(text.includes("Charges: ") && text.includes(`"value":"${afterCharges}"`), `mounted target Corebreaker item should show Charges: ${afterCharges}; item data=${text}`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MTLoreRider", 250);
    await command("clear MTLoreKiller", 250);
    await command("clear MTLoreVictim", 250);
    await command("effect clear MTLoreRider", 250);
    await command("effect clear MTLoreKiller", 250);
    await command("effect clear MTLoreVictim", 250);
    await command("attribute MTLoreVictim minecraft:max_health base set 20", 250);
    await command("fill 431 79 -1 434 79 1 minecraft:air", 500);
    await command("forceload remove 431 -1 434 1", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MTLoreVictim", 250);
  await command("attribute MTLoreVictim minecraft:max_health base set 20", 250);
  await command("tp MTLoreRider 432 80 -1 0 0", 250);
  await command("tp MTLoreKiller 432 80 1 180 0", 250);
  await command("tp MTLoreVictim 433 80 1 -90 0", 250);
  await wait(750);
  await command("data merge entity MTLoreVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MTLoreVictim 40 minecraft:player_attack by MTLoreKiller", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `mounted target lore damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
