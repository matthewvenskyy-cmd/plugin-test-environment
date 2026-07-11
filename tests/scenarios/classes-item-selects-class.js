import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes item selects class";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassItemBot");

  await command("clear ClassItemBot", 250);
  await command("classes give ClassItemBot long_bow", 500);

  const bow = await waitForInventoryItem(bot, (item) => item?.name === "bow", "Long Bow class item");
  await bot.equip(bow, "hand");
  await wait(1500);

  const status = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Archer/);
  assert(status, "holding the Long Bow class item should set class status to Archer");
}
