import { countItemsByName, displayText, waitForInventoryItem } from "./helpers.js";

export const name = "Rocketlytra recraft preserves charges";

export async function run(ctx) {
  const { assert, bot, command, wait } = ctx;

  await command("clear ScenarioBot", 250);
  await command("gamemode survival ScenarioBot", 250);
  await command("recipe give ScenarioBot fireworkselytraplugin:rocketlytra_3", 500);
  await command("recipe give ScenarioBot fireworkselytraplugin:rocketlytra_2", 500);
  await command("give ScenarioBot minecraft:elytra 1", 500);
  await command("give ScenarioBot minecraft:firework_rocket 3", 500);
  await waitForInventoryItem(bot, (item) => item?.name === "elytra", "elytra");
  await waitForInventoryItem(bot, (item) => item?.name === "firework_rocket" && item.count >= 3, "initial firework rockets");

  await bot.craft(rocketlytraRecipe(bot, 3), 1, null);
  await wait(750);
  await waitForInventoryItem(bot, isRocketlytraWithCharges(3), "Rocketlytra with 3 charges");

  await command("give ScenarioBot minecraft:firework_rocket 2", 500);
  await waitForInventoryItem(bot, (item) => item?.name === "firework_rocket" && item.count >= 2, "additional firework rockets");
  await bot.craft(rocketlytraRecipe(bot, 2), 1, null);
  await wait(750);

  const rocketlytra = await waitForInventoryItem(bot, isRocketlytraWithCharges(5), "recrafted Rocketlytra with 5 charges");
  assert(rocketlytra.name === "elytra", `recrafted item should stay an elytra, got ${rocketlytra.name}`);
  assert(countItemsByName(bot, "firework_rocket") === 0, "recrafting should consume exactly the two added firework rockets");
  await command("gamemode creative ScenarioBot", 250);
}

function isRocketlytraWithCharges(charges) {
  return (item) => {
    if (item?.name !== "elytra") return false;
    const text = displayText(item);
    return text.includes("Rocketlytra") && text.includes(String(charges));
  };
}

function rocketlytraRecipe(bot, fireworks) {
  const elytra = bot.registry.itemsByName.elytra.id;
  const firework = bot.registry.itemsByName.firework_rocket.id;
  const ingredient = (id) => ({ id, metadata: null, count: 1 });
  return {
    result: ingredient(elytra),
    ingredients: [ingredient(elytra), ...Array.from({ length: fireworks }, () => ingredient(firework))],
    delta: [
      { id: elytra, metadata: null, count: 0 },
      { id: firework, metadata: null, count: -fireworks }
    ],
    requiresTable: false
  };
}
