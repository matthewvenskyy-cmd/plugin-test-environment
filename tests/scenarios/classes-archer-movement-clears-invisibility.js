import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Archer movement clears invisibility";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const archer = await spawnBot("MoveArcher");

  try {
    await command("clear MoveArcher", 250);
    await command("effect clear MoveArcher", 250);
    await command("forceload add 144 0", 250);
    await command("fill 143 79 -1 145 79 1 minecraft:stone", 250);
    await command("gamemode creative MoveArcher", 250);
    await command("tp MoveArcher 144 80 0 0 0", 500);
    await command("gamemode survival MoveArcher", 250);
    await command("classes give MoveArcher long_bow", 500);
    await wait(1000);

    const bow = await waitForInventoryItem(archer, (item) => item?.name === "bow", "Long Bow class item");
    await archer.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(archer, () => archer.chat("/classes status"), /Current class: Archer/);
    assert(status, "Long Bow should set class status before movement invisibility check");

    await wait(32500);
    assert(await clearEffect(ctx, "MoveArcher", "minecraft:invisibility", "Invisibility"), "Archer standing still should receive Invisibility before movement");

    await wait(1250);
    assert(await clearEffect(ctx, "MoveArcher", "minecraft:invisibility", "Invisibility"), "Archer should regain Invisibility while still stationary");

    await command("tp MoveArcher 145 80 0 0 0", 500);
    await wait(1000);
    assert(!(await clearEffect(ctx, "MoveArcher", "minecraft:invisibility", "Invisibility")), "Archer movement should clear Invisibility");
  } finally {
    await command("clear MoveArcher", 250);
    await command("effect clear MoveArcher", 250);
    await command("fill 143 79 -1 145 79 1 minecraft:air", 250);
    await command("forceload remove 144 0", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
