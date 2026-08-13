import { countMatchingItems, displayText, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Classes rechooser opens menu and preserves item";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassMenuBot");

  await command("clear ClassMenuBot", 250);
  await command("classes give ClassMenuBot long_bow", 500);
  await command("classes give ClassMenuBot class_rechooser", 500);

  const bow = await waitForInventoryItem(bot, (item) => item?.name === "bow", "Long Bow class item");
  await bot.equip(bow, "hand");
  await wait(1500);

  const archerStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Archer/);
  assert(archerStatus, "Long Bow should set class status to Archer before rechooser use");

  const rechooser = await waitForInventoryItem(bot, isClassRechooser, "Class Rechooser");
  const startingRechoosers = countMatchingItems(bot, isClassRechooser);
  await bot.equip(rechooser, "hand");
  await wait(500);

  const opened = waitForEvent(bot, "windowOpen", 5000);
  await bot.activateItem();
  await opened;
  await wait(750);

  const resetStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: No Class/);
  assert(resetStatus, "right-clicking Class Rechooser should reset the current class");
  assert(countMatchingItems(bot, isClassRechooser) === startingRechoosers, "Class Rechooser should not be consumed when opening the menu");

  await bot.clickWindow(10, 0, 0);
  await wait(1000);

  const vikingStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Viking/);
  assert(vikingStatus, "clicking the Viking option in the rechooser menu should select Viking");
  assert(countMatchingItems(bot, isClassRechooser) === startingRechoosers, "Class Rechooser should remain after selecting from the menu");

  bot.chat("/classes reset");
  await wait(750);
  await command("clear ClassMenuBot", 250);
}

function isClassRechooser(item) {
  return item?.name === "compass" && displayText(item).includes("Class Rechooser");
}
