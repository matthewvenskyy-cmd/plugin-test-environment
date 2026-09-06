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

export const name = "Mounted rider Corebreaker item updates after unique kill";

const RIDER_FLOOR = new Vec3(428, 79, -1);
const TARGET_FLOOR = new Vec3(428, 79, 1);
const VICTIM_FLOOR = new Vec3(429, 79, -1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MRLoreKiller", { op: false });
  const target = await spawnBot("MRLoreSeat", { op: false });
  const victim = await spawnBot("MRLoreVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("kill @e[type=item]", 250);
    await command("deop MRLoreKiller", 250);
    await command("deop MRLoreSeat", 250);
    await command("clear MRLoreSeat", 250);
    await command("effect clear MRLoreKiller", 250);
    await command("effect clear MRLoreSeat", 250);
    await command("effect clear MRLoreVictim", 250);
    await command("forceload add 427 -1 430 1", 250);
    await command("fill 427 79 -1 430 79 1 minecraft:stone", 500);
    await command("gamemode creative MRLoreKiller", 250);
    await command("gamemode creative MRLoreSeat", 250);
    await command("gamemode creative MRLoreVictim", 250);
    await command("tp MRLoreKiller 428 80 -1 0 0", 500);
    await command("tp MRLoreSeat 428 80 1 180 0", 500);
    await command("tp MRLoreVictim 429 80 -1 -90 0", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider lore update rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted rider lore update target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted rider lore update victim floor block");
    await command("gamemode survival MRLoreKiller", 250);
    await command("gamemode survival MRLoreSeat", 250);
    await command("gamemode survival MRLoreVictim", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MRLoreSeat/i);
    assert(mounted, "killer should mount the target before mounted Corebreaker lore checks");
    await wait(750);

    await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker before kill");
    const beforeCharges = await queryCorebreakerCharges(rider);
    await killVictim(ctx, victim);
    const afterCharges = await queryCorebreakerCharges(rider);
    assert(afterCharges === beforeCharges + 1, `mounted rider unique kill should add one Corebreaker charge; before=${beforeCharges}, after=${afterCharges}`);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider updated Corebreaker item");
    const text = displayText(corebreaker);
    assert(text.includes("Charges: ") && text.includes(`"value":"${afterCharges}"`), `mounted rider Corebreaker item should show Charges: ${afterCharges}; item data=${text}`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("kill @e[type=item]", 250);
    await command("clear MRLoreKiller", 250);
    await command("clear MRLoreSeat", 250);
    await command("clear MRLoreVictim", 250);
    await command("effect clear MRLoreKiller", 250);
    await command("effect clear MRLoreSeat", 250);
    await command("effect clear MRLoreVictim", 250);
    await command("attribute MRLoreVictim minecraft:max_health base set 20", 250);
    await command("fill 427 79 -1 430 79 1 minecraft:air", 500);
    await command("forceload remove 427 -1 430 1", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MRLoreVictim", 250);
  await command("attribute MRLoreVictim minecraft:max_health base set 20", 250);
  await command("tp MRLoreKiller 428 80 -1 0 0", 250);
  await command("tp MRLoreSeat 428 80 1 180 0", 250);
  await command("tp MRLoreVictim 429 80 -1 -90 0", 250);
  await wait(750);
  await command("data merge entity MRLoreVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MRLoreVictim 40 minecraft:player_attack by MRLoreKiller", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `mounted rider lore damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
