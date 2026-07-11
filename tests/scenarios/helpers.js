export function isBiggerCraftingTableItem(item) {
  return item?.name === "crafter" && displayText(item).includes("Bigger Crafting Table");
}

export function isCorebreakerItem(item) {
  return item?.name === "netherite_pickaxe" && displayText(item).includes("Corebreaker");
}

export function isCoreItem(item) {
  return item?.name === "beacon" && displayText(item).includes("Core");
}

export function countMatchingItems(bot, predicate) {
  return bot.inventory.items()
    .filter(predicate)
    .reduce((total, item) => total + item.count, 0);
}

export function countBctItems(bot) {
  return countMatchingItems(bot, isBiggerCraftingTableItem);
}

export function countItemsByName(bot, itemName) {
  return bot.inventory.items()
    .filter((item) => item?.name === itemName)
    .reduce((total, item) => total + item.count, 0);
}

export async function waitForInventoryItem(bot, predicate, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const item = bot.inventory.items().find(predicate);
    if (item) return item;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

export function waitForChat(bot, action, pattern, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for chat message matching ${pattern}`));
    }, timeoutMs);
    const onMessage = (message) => {
      const text = message.toString();
      if (!pattern.test(text)) return;
      cleanup();
      resolve(text);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off("message", onMessage);
    };
    bot.on("message", onMessage);
    action();
  });
}

export function waitForEvent(emitter, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const onEvent = (...args) => {
      cleanup();
      resolve(args);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      emitter.off(eventName, onEvent);
    };
    emitter.once(eventName, onEvent);
  });
}

export function countNearbyDroppedItems(bot, position, radius = 3) {
  return Object.values(bot.entities)
    .filter((entity) => entity?.name === "item")
    .filter((entity) => entity.position.distanceTo(position) <= radius)
    .length;
}

export async function queryDroppedItemEntityCount(ctx, position, radius = 3) {
  return queryEntityCount(ctx, `@e[type=item,x=${position.x},y=${position.y},z=${position.z},distance=..${radius}]`);
}

export async function queryEntityCount(ctx, selector) {
  const objective = "scenario_count";
  await ctx.command(`scoreboard objectives add ${objective} dummy`, 100);
  await ctx.command(`execute store result score item_count ${objective} if entity ${selector}`, 100);
  const output = await ctx.command(`scoreboard players get item_count ${objective}`, 250);
  const match = output.match(/item_count has (\d+) \[/);
  return match ? Number(match[1]) : 0;
}

export async function serverBlockIs(ctx, position, blockName) {
  const output = await ctx.command(`execute if block ${position.x} ${position.y} ${position.z} minecraft:${blockName}`, 250);
  return /Test passed/.test(output);
}

export function displayText(item) {
  return [
    item?.displayName,
    item?.customName,
    item?.nbt,
    item?.components,
    item?.componentMap
  ].map((value) => stringifyItemData(value)).join("");
}

function stringifyItemData(value) {
  if (value instanceof Map) {
    return JSON.stringify(Array.from(value.entries()));
  }
  return JSON.stringify(value ?? "");
}
