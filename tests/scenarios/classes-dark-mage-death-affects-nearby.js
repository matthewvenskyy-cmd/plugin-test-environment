import { waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Dark Mage death affects nearby players";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const mage = await spawnBot("DarkDeathMage");
  await spawnBot("DarkDeathNear");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear DarkDeathMage", 250);
  await command("clear DarkDeathNear", 250);
  await command("effect clear DarkDeathMage", 250);
  await command("effect clear DarkDeathNear", 250);
  await command("fill 88 79 -1 90 79 1 minecraft:stone", 250);
  await command("gamemode survival DarkDeathMage", 250);
  await command("gamemode survival DarkDeathNear", 250);
  await command("attribute DarkDeathMage minecraft:max_health base set 20", 250);
  await command("attribute DarkDeathNear minecraft:max_health base set 40", 250);
  await command("tp DarkDeathMage 89 80 0 0 0", 500);
  await command("tp DarkDeathNear 90 80 0 180 0", 500);
  await command("data merge entity DarkDeathMage {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await command("data merge entity DarkDeathNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await command("classes give DarkDeathMage dark_mage_staff", 500);
  await wait(1000);

  const staff = await waitForInventoryItem(mage, (item) => item?.name === "blaze_rod", "Dark Mage Staff class item");
  await mage.equip(staff, "hand");
  await wait(1500);

  const status = await waitForChat(mage, () => mage.chat("/classes status"), /Current class: Dark Mage/);
  assert(status, "Dark Mage Staff should set class status before death");

  const respawned = waitForEvent(mage, "respawn", 8000);
  const damageOutput = await command("damage DarkDeathMage 40 minecraft:generic", 500);
  assert(/Applied|damaged|died/i.test(damageOutput), `Dark Mage death damage command did not report success: ${damageOutput}`);
  await respawned;
  await wait(1500);

  assert(await clearEffect(ctx, "DarkDeathNear", "minecraft:wither", "Wither"), "Dark Mage death should apply Wither to nearby players");
  assert(await clearEffect(ctx, "DarkDeathNear", "minecraft:slowness", "Slowness"), "Dark Mage death should apply Slowness to nearby players");

  await command("gamerule naturalRegeneration true", 250);
  await command("clear DarkDeathMage", 250);
  await command("clear DarkDeathNear", 250);
  await command("effect clear DarkDeathMage", 250);
  await command("effect clear DarkDeathNear", 250);
  await command("attribute DarkDeathMage minecraft:max_health base set 20", 250);
  await command("attribute DarkDeathNear minecraft:max_health base set 20", 250);
  await command("fill 88 79 -1 90 79 1 minecraft:air", 250);
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
