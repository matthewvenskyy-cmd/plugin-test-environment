import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes offhand item selects class";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassOffhand");

  await command("clear ClassOffhand", 250);
  await command("classes give ClassOffhand necromancer_staff", 500);

  const staff = await waitForInventoryItem(bot, (item) => item?.name === "blaze_rod", "Necromancer Staff class item");
  await bot.equip(staff, "off-hand");
  await wait(1500);

  const status = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Necromancer/);
  assert(status, "holding a Necromancer Staff in the offhand should set class status to Necromancer");

  await command("clear ClassOffhand", 250);
}
