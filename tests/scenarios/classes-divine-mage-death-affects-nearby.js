import { waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Divine Mage death affects nearby players";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const mage = await spawnBot("DivineDeathMage");
  await spawnBot("DivineDeathNear");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear DivineDeathMage", 250);
  await command("clear DivineDeathNear", 250);
  await command("effect clear DivineDeathMage", 250);
  await command("effect clear DivineDeathNear", 250);
  await command("fill 92 79 -1 94 79 1 minecraft:stone", 250);
  await command("gamemode survival DivineDeathMage", 250);
  await command("gamemode survival DivineDeathNear", 250);
  await command("attribute DivineDeathMage minecraft:max_health base set 20", 250);
  await command("attribute DivineDeathNear minecraft:max_health base set 40", 250);
  await command("tp DivineDeathMage 93 80 0 0 0", 500);
  await command("tp DivineDeathNear 94 80 0 180 0", 500);
  await command("data merge entity DivineDeathMage {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await command("data merge entity DivineDeathNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await command("classes give DivineDeathMage divine_mage_staff", 500);
  await wait(1000);

  const staff = await waitForInventoryItem(mage, (item) => item?.name === "blaze_rod", "Divine Mage Staff class item");
  await mage.equip(staff, "hand");
  await wait(1500);

  const status = await waitForChat(mage, () => mage.chat("/classes status"), /Current class: Divine Mage/);
  assert(status, "Divine Mage Staff should set class status before death");

  const respawned = waitForEvent(mage, "respawn", 8000);
  const damageOutput = await command("damage DivineDeathMage 40 minecraft:generic", 500);
  assert(/Applied|damaged|died/i.test(damageOutput), `Divine Mage death damage command did not report success: ${damageOutput}`);
  await respawned;
  await wait(1500);

  assert(await clearEffect(ctx, "DivineDeathNear", "minecraft:blindness", "Blindness"), "Divine Mage death should apply Blindness to nearby players");
  assert(await clearEffect(ctx, "DivineDeathNear", "minecraft:slowness", "Slowness"), "Divine Mage death should apply Slowness to nearby players");

  await command("gamerule naturalRegeneration true", 250);
  await command("clear DivineDeathMage", 250);
  await command("clear DivineDeathNear", 250);
  await command("effect clear DivineDeathMage", 250);
  await command("effect clear DivineDeathNear", 250);
  await command("attribute DivineDeathMage minecraft:max_health base set 20", 250);
  await command("attribute DivineDeathNear minecraft:max_health base set 20", 250);
  await command("fill 92 79 -1 94 79 1 minecraft:air", 250);
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
