import { queryCorebreakerCharges, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Viking kill grants one Corebreaker charge";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const killer = await spawnBot("VikingCharge", { op: false });
  const victim = await spawnBot("VikingVictim");

  await command("gamerule keepInventory true", 250);
  await command("gamerule naturalRegeneration false", 250);
  await command("fill 116 79 -2 118 79 1 minecraft:stone", 250);
  await command("deop VikingCharge", 250);
  await command("clear VikingCharge", 250);
  await command("clear VikingVictim", 250);
  await command("effect clear VikingCharge", 250);
  await command("effect clear VikingVictim", 250);
  await command("gamemode survival VikingCharge", 250);
  await command("gamemode survival VikingVictim", 250);
  await command("tp VikingCharge 117 80 -1 0 0", 500);
  await command("tp VikingVictim 117 80 0 180 0", 500);
  await wait(1000);
  await command("classes give VikingCharge double_long_axe", 500);
  await wait(1000);

  const axe = await waitForInventoryItem(killer, (item) => item?.name === "iron_axe", "Viking class axe");
  await killer.equip(axe, "hand");
  await wait(1500);

  const status = await waitForChat(killer, () => killer.chat("/classes status"), /Current class: Viking/);
  assert(status, "Viking class axe should set class status before the kill");

  const beforeCharges = await queryCorebreakerCharges(killer);
  await killVictim(ctx, victim);
  const afterCharges = await queryCorebreakerCharges(killer);

  assert(afterCharges === beforeCharges + 1, `Viking kill should add exactly one Corebreaker charge; before=${beforeCharges}, after=${afterCharges}`);

  killer.chat("/classes reset");
  await wait(500);
  await command("gamerule keepInventory false", 250);
  await command("gamerule naturalRegeneration true", 250);
  await command("clear VikingCharge", 250);
  await command("clear VikingVictim", 250);
  await command("fill 116 79 -2 118 79 1 minecraft:air", 250);
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear VikingVictim", 250);
  await command("attribute VikingVictim minecraft:max_health base set 20", 250);
  await command("tp VikingVictim 117 80 0 180 0", 250);
  await command("tp VikingCharge 117 80 -1 0 0", 250);
  await wait(750);
  await command("data merge entity VikingVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage VikingVictim 40 minecraft:generic by VikingCharge", 500);
  assert(/Applied|damaged|was slain by/i.test(output), `Viking kill damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
