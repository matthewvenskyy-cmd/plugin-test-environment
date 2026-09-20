import { applyServerItemReplace, countItemsByName, displayText, isRocketlytraWithCharges, rocketlytraRecipe, waitForInventoryItem, waitForWindowSlot } from "./helpers.js";

export const name = "Rocketlytra standing sprint keeps charges";

const CHEST_EQUIPMENT_SLOT = 6;

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
    await applyServerItemReplace(
      ctx,
      `item replace entity RocketStand armor.chest from entity RocketStand container.${rocketlytra.slot}`,
      "equip crafted Rocketlytra"
    );
    await wait(1000);

    bot.setControlState("sprint", true);
    await wait(750);
    bot.setControlState("sprint", false);
    await wait(1500);

    const equippedRocketlytra = await waitForWindowSlot(
      bot.inventory,
      CHEST_EQUIPMENT_SLOT,
      isRocketlytraWithCharges(3),
      "equipped Rocketlytra with 3 charges"
    );
    assert(equippedRocketlytra.name === "elytra", `equipped Rocketlytra should remain an elytra, got ${displayText(equippedRocketlytra)}`);
    assert(countItemsByName(bot, "firework_rocket") === 0, "crafting should consume the three firework rockets before sprint check");
  } finally {
    bot.setControlState("sprint", false);
    await command("clear RocketStand", 250);
    await command("effect clear RocketStand", 250);
    await command("fill 124 79 -1 126 79 1 minecraft:air", 250);
  }
}
