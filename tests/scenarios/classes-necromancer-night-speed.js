import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Necromancer gains speed at night";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const necromancer = await spawnBot("NightNecro");

  try {
    await command("clear NightNecro", 250);
    await command("effect clear NightNecro", 250);
    await command("time set day", 250);
    await command("classes give NightNecro necromancer_staff", 500);
    await wait(1000);

    const staff = await waitForInventoryItem(necromancer, (item) => item?.name === "blaze_rod", "Necromancer Staff class item");
    await necromancer.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(necromancer, () => necromancer.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "Necromancer Staff should set class status before speed checks");

    await command("effect clear NightNecro minecraft:speed", 250);
    await command("time set day", 250);
    await wait(1500);
    assert(!(await clearEffect(ctx, "NightNecro", "minecraft:speed", "Speed")), "Necromancer should not receive Speed during daytime");

    await command("time set night", 250);
    await wait(1500);
    assert(await clearEffect(ctx, "NightNecro", "minecraft:speed", "Speed"), "Necromancer should receive Speed at night");
  } finally {
    await command("time set day", 250);
    await command("clear NightNecro", 250);
    await command("effect clear NightNecro", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
