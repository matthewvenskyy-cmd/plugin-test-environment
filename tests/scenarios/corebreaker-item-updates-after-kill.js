import { displayText, isCorebreakerItem, queryCorebreakerCharges, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Corebreaker item updates after unique kill";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const killer = await spawnBot("LoreKiller", { op: false });
  const victim = await spawnBot("LoreVictim");

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("deop LoreKiller", 250);
    await command("fill 120 79 -2 122 79 1 minecraft:stone", 250);
    await command("clear LoreKiller", 250);
    await command("clear LoreVictim", 250);
    await command("effect clear LoreKiller", 250);
    await command("effect clear LoreVictim", 250);
    await command("gamemode survival LoreKiller", 250);
    await command("gamemode survival LoreVictim", 250);
    await command("tp LoreKiller 121 80 -1 0 0", 500);
    await command("tp LoreVictim 121 80 0 180 0", 500);
    await wait(1000);

    const beforeCharges = await queryCorebreakerCharges(killer);
    await killVictim(ctx, victim);
    const afterCharges = await queryCorebreakerCharges(killer);
    assert(afterCharges === beforeCharges + 1, `unique kill should add one charge; before=${beforeCharges}, after=${afterCharges}`);

    const corebreaker = await waitForInventoryItem(killer, isCorebreakerItem, "updated Corebreaker item");
    const text = displayText(corebreaker);
    assert(text.includes("Charges: ") && text.includes(`"value":"${afterCharges}"`), `Corebreaker item should show Charges: ${afterCharges}; item data=${text}`);
  } finally {
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("clear LoreKiller", 250);
    await command("clear LoreVictim", 250);
    await command("effect clear LoreKiller", 250);
    await command("effect clear LoreVictim", 250);
    await command("attribute LoreVictim minecraft:max_health base set 20", 250);
    await command("fill 120 79 -2 122 79 1 minecraft:air", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear LoreVictim", 250);
  await command("attribute LoreVictim minecraft:max_health base set 20", 250);
  await command("tp LoreVictim 121 80 0 180 0", 250);
  await command("tp LoreKiller 121 80 -1 0 0", 250);
  await wait(750);
  await command("data merge entity LoreVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage LoreVictim 40 minecraft:player_attack by LoreKiller", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `kill damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
