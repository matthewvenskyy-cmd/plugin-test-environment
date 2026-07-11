import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes reset clears selected class";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassResetBot");

  await command("clear ClassResetBot", 250);
  await command("classes give ClassResetBot long_bow", 500);

  const bow = await waitForInventoryItem(bot, (item) => item?.name === "bow", "Long Bow class item");
  await bot.equip(bow, "hand");
  await wait(1500);

  const archerStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Archer/);
  assert(archerStatus, "Long Bow should set class status to Archer before reset");

  await command("clear ClassResetBot minecraft:bow", 500);
  await wait(750);
  bot.chat("/classes reset");
  await wait(750);

  const noneStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: .+/);
  assert(/Current class: No Class/.test(noneStatus), `/classes status should stay No Class after reset, got: ${noneStatus}`);
}
