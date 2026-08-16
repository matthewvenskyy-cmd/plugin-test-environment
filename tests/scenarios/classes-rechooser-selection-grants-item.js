import {
  countMatchingItems,
  displayText,
  waitForChat,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Classes rechooser selection grants class item";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassMenuGrant");

  try {
    await command("clear ClassMenuGrant", 250);
    await command("gamemode survival ClassMenuGrant", 250);
    await command("classes give ClassMenuGrant class_rechooser", 500);
    await wait(1000);

    const rechooser = await waitForInventoryItem(bot, isClassRechooser, "Class Rechooser");
    await bot.equip(rechooser, "hand");
    const startingVikingItems = countMatchingItems(bot, isDoubleLongAxe);
    await wait(500);

    const opened = waitForEvent(bot, "windowOpen", 5000);
    await bot.activateItem();
    await opened;
    await wait(750);

    await bot.clickWindow(10, 0, 0);
    await wait(1000);

    const status = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Viking/);
    assert(status, "clicking the Viking menu option should set class status to Viking");
    assert(
      countMatchingItems(bot, isDoubleLongAxe) === startingVikingItems + 1,
      "clicking the Viking menu option should grant exactly one Double-Bladed Long Axe"
    );
  } finally {
    bot.chat("/classes reset");
    await wait(750);
    await command("clear ClassMenuGrant", 250);
  }
}

function isClassRechooser(item) {
  return item?.name === "compass" && displayText(item).includes("Class Rechooser");
}

function isDoubleLongAxe(item) {
  return item?.name === "iron_axe" && displayText(item).includes("Double-Bladed Long Axe");
}
