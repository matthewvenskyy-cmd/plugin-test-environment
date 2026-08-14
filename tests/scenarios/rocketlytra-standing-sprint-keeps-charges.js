import { countItemsByName, displayText, waitForInventoryItem } from "./helpers.js";

export const name = "Rocketlytra standing sprint keeps charges";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("RocketStand");

  try {
    await command("clear RocketStand", 250);
    await command("effect clear RocketStand", 250);
    await command("gamemode creative RocketStand", 250);
    await command("tp RocketStand 125 80 0 0 0", 500);
    await command("fill 124 79 -1 126 79 1 minecraft:stone", 250);
    await command("gamemode survival RocketStand", 250);
    await command("recipe give RocketStand fireworkselytraplugin:rocketlytra_3", 500);
    await command("give RocketStand minecraft:elytra 1", 500);
    await command("give RocketStand minecraft:firework_rocket 3", 500);
    await waitForInventoryItem(bot, (item) => item?.name === "elytra", "elytra");
    await waitForInventoryItem(bot, (item) => item?.name === "firework_rocket" && item.count >= 3, "firework rockets");

    await bot.craft(rocketlytraRecipe(bot, 3), 1, null);
    await wait(750);

    const rocketlytra = await waitForInventoryItem(bot, isRocketlytraWithCharges(3), "Rocketlytra with 3 charges");
    assert(Number.isInteger(rocketlytra.slot), `crafted Rocketlytra should expose an inventory slot; item=${displayText(rocketlytra)}`);
    const equipOutput = await command(`item replace entity RocketStand armor.chest from entity RocketStand container.${rocketlytra.slot}`, 500);
    assert(/Replaced|Modified|commands\.item\.target/i.test(equipOutput), `server should equip crafted Rocketlytra; output=${equipOutput}`);
    await wait(1000);

    bot.setControlState("sprint", true);
    await wait(750);
    bot.setControlState("sprint", false);
    await wait(1500);

    const armorData = await command("data get entity RocketStand equipment", 500);
    assert(armorData.includes("minecraft:elytra"), `Rocketlytra should be equipped in an armor slot; armor=${armorData}`);
    assert(armorData.includes("rocketlytra_charges") && armorData.includes("3"), `standing sprint should keep Rocketlytra at 3 charges; armor=${armorData}`);
    assert(countItemsByName(bot, "firework_rocket") === 0, "crafting should consume the three firework rockets before sprint check");
  } finally {
    bot.setControlState("sprint", false);
    await command("clear RocketStand", 250);
    await command("effect clear RocketStand", 250);
    await command("fill 124 79 -1 126 79 1 minecraft:air", 250);
  }
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
