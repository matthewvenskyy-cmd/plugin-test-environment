import { Vec3 } from "vec3";
import { countItemsByName, displayText, placeBiggerCraftingTable, waitForInventoryItem } from "./helpers.js";

export const name = "Rocketlytra crafts inside Bigger Crafting Table";

const BCT_BLOCK = new Vec3(44, 80, 1);
const SUPPORT_BLOCK = new Vec3(44, 79, 1);
const FLOOR_BLOCK = new Vec3(44, 79, 0);
const RESULT_SLOT = 25;

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("RocketBct");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("clear RocketBct", 250);
  await command("gamemode creative RocketBct", 250);
  await command("tp RocketBct 44 80 0 0 0", 500);
  await command("gamemode survival RocketBct", 500);
  await wait(1000);

  await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });

  await command("recipe give RocketBct fireworkselytraplugin:rocketlytra_3", 500);
  await command("give RocketBct minecraft:elytra 1", 500);
  await command("give RocketBct minecraft:firework_rocket 3", 500);
  await waitForInventoryItem(bot, (item) => item?.name === "elytra", "elytra");
  await waitForInventoryItem(bot, (item) => item?.name === "firework_rocket" && item.count >= 3, "firework rockets");

  const window = await bot.openBlock(bot.blockAt(BCT_BLOCK));
  await window.deposit(bot.registry.itemsByName.elytra.id, null, 1);
  await window.deposit(bot.registry.itemsByName.firework_rocket.id, null, 3);
  await wait(1000);

  const result = window.slots[RESULT_SLOT];
  assert(isRocketlytraWithCharges(result, 3), `BCT result slot should show Rocketlytra with 3 charges, got ${describeItem(result)}`);
  await bot.clickWindow(RESULT_SLOT, 0, 0);
  await wait(1000);
  window.close();
  await wait(500);

  const rocketlytra = await waitForInventoryItem(bot, (item) => isRocketlytraWithCharges(item, 3), "BCT-crafted Rocketlytra with 3 charges");
  assert(rocketlytra.name === "elytra", `crafted item should stay an elytra, got ${rocketlytra.name}`);
  assert(countItemsByName(bot, "firework_rocket") === 0, "BCT crafting should consume exactly three firework rockets");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command("clear RocketBct", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}

function isRocketlytraWithCharges(item, charges) {
  if (item?.name !== "elytra") return false;
  const text = displayText(item);
  return text.includes("Rocketlytra") && text.includes(String(charges));
}

function describeItem(item) {
  if (!item) return "empty";
  return `${item.name} x${item.count} ${displayText(item)}`;
}
