import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Archer stillness grants invisibility";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const archer = await spawnBot("StillArcher");

  await command("clear StillArcher", 250);
  await command("effect clear StillArcher", 250);
  await command("fill 100 79 -1 102 79 1 minecraft:stone", 250);
  await command("gamemode survival StillArcher", 250);
  await command("tp StillArcher 101 80 0 0 0", 500);
  await command("classes give StillArcher long_bow", 500);
  await wait(1000);

  const bow = await waitForInventoryItem(archer, (item) => item?.name === "bow", "Long Bow class item");
  await archer.equip(bow, "hand");
  await wait(1500);

  const status = await waitForChat(archer, () => archer.chat("/classes status"), /Current class: Archer/);
  assert(status, "Long Bow should set class status before stillness check");

  await wait(32500);
  assert(await clearEffect(ctx, "StillArcher", "minecraft:invisibility", "Invisibility"), "Archer standing still should receive Invisibility");

  await command("clear StillArcher", 250);
  await command("effect clear StillArcher", 250);
  await command("fill 100 79 -1 102 79 1 minecraft:air", 250);
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
