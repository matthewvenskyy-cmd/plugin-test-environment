import { countItemsByName, displayText, waitForInventoryItem } from "./helpers.js";

export const name = "Rocketlytra craft adds charges";

export async function run(ctx) {
  const { assert, bot, command, wait } = ctx;

  await command("clear ScenarioBot", 250);
  await command("gamemode survival ScenarioBot", 250);
  await command("recipe give ScenarioBot fireworkselytraplugin:rocketlytra_3", 500);
  await command("give ScenarioBot minecraft:elytra 1", 500);
  await command("give ScenarioBot minecraft:firework_rocket 3", 500);
  await waitForInventoryItem(bot, (item) => item?.name === "elytra", "elytra");
  await waitForInventoryItem(bot, (item) => item?.name === "firework_rocket" && item.count >= 3, "firework rockets");

  const recipe = rocketlytraRecipe(bot);
  await bot.craft(recipe, 1, null);
  await wait(750);

  const rocketlytra = await waitForRocketlytra(bot);
  assert(rocketlytra.name === "elytra", `crafted item should stay an elytra, got ${rocketlytra.name}`);
  assert(countItemsByName(bot, "firework_rocket") === 0, "crafting should consume exactly three firework rockets");
  await command("gamemode creative ScenarioBot", 250);
}

function isRocketlytraWithThreeCharges(item) {
  if (item?.name !== "elytra") return false;
  const text = displayText(item);
  return text.includes("Rocketlytra") && text.includes("3");
}

async function waitForRocketlytra(bot) {
  try {
    return await waitForInventoryItem(bot, isRocketlytraWithThreeCharges, "crafted Rocketlytra with 3 charges");
  } catch (error) {
    const inventory = bot.inventory.items().map((item) => ({
      name: item.name,
      count: item.count,
      keys: Object.keys(item),
      text: displayText(item)
    }));
    throw new Error(`${error.message}. Inventory: ${JSON.stringify(inventory)}`);
  }
}

function rocketlytraRecipe(bot) {
  const elytra = bot.registry.itemsByName.elytra.id;
  const firework = bot.registry.itemsByName.firework_rocket.id;
  const ingredient = (id) => ({ id, metadata: null, count: 1 });
  return {
    result: ingredient(elytra),
    ingredients: [ingredient(elytra), ingredient(firework), ingredient(firework), ingredient(firework)],
    delta: [
      { id: elytra, metadata: null, count: 0 },
      { id: firework, metadata: null, count: -3 }
    ],
    requiresTable: false
  };
}
