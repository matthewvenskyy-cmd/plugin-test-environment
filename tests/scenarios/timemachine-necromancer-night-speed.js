import {
  giveClassItem,
  serverCommandSucceeds,
  setWorldTimePhase,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "TimeMachine night drives Necromancer speed";

export async function run(ctx) {
  const { assert, bot, command, wait } = ctx;

  try {
    await command("clear ScenarioBot", 250);
    await command("effect clear ScenarioBot", 250);
    await command("classes reset ScenarioBot", 250);

    const initialStatus = await waitForChat(
      bot,
      () => bot.chat("/timemachine status"),
      /Present: day \d+ at \d{1,2}:\d{2}/i
    );
    assert(initialStatus, "TimeMachine should expose its current authoritative clock to players");

    await setWorldTimePhase(ctx, "night");

    await giveClassItem(ctx, "ScenarioBot", "necromancer_staff", "TimeMachine Necromancer staff give");
    const staff = await waitForInventoryItem(bot, (item) => item?.name === "blaze_rod", "TimeMachine Necromancer Staff");
    await bot.equip(staff, "hand");
    await wait(1500);

    const classStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Necromancer/i);
    assert(classStatus, "Necromancer Staff should select the class under TimeMachine clock control");
    assert(
      await serverCommandSucceeds(ctx, "effect clear ScenarioBot minecraft:speed", {
        holder: "effect_clear",
        label: "clear TimeMachine-driven Necromancer Speed"
      }),
      "TimeMachine night should make ClassesPlugin grant Necromancer Speed"
    );
  } finally {
    await command("classes reset ScenarioBot", 250);
    await command("effect clear ScenarioBot", 250);
    await command("clear ScenarioBot", 250);
  }
}
