import { Vec3 } from "vec3";

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

export async function clearDroppedItems(ctx) {
  await ctx.command("kill @e[type=item]", 250);
}

export async function clearBctArtifacts(ctx) {
  await clearDroppedItems(ctx);
  await ctx.command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
}

export async function waitForCondition(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const intervalMs = options.intervalMs ?? 100;
  const label = options.label ?? "condition";
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const suffix = lastError ? ` Last error: ${lastError.message ?? lastError}` : "";
  throw new Error(`Timed out waiting for ${label}.${suffix}`);
}

export async function waitForInventoryItem(bot, predicate, label, timeoutMs = 5000) {
  return waitForCondition(
    () => bot.inventory.items().find(predicate),
    { timeoutMs, label }
  );
}

export async function waitForBlock(bot, position, blockName, label, timeoutMs = 5000) {
  return waitForCondition(
    () => {
      const block = bot.blockAt(position);
      return block?.name === blockName ? block : null;
    },
    { timeoutMs, label }
  );
}

export async function waitForWindowSlot(window, slot, predicate, label, timeoutMs = 5000) {
  return waitForCondition(
    () => {
      const item = window.slots[slot];
      return predicate(item) ? item : null;
    },
    { timeoutMs, label }
  );
}

export async function waitForServerBlock(ctx, position, blockName, label, timeoutMs = 5000) {
  return waitForCondition(
    async () => await serverBlockIs(ctx, position, blockName),
    { timeoutMs, label }
  );
}

export async function digUntilServerBlock(ctx, bot, position, blockName, options = {}) {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 2000;
  const label = options.label ?? `dig at ${position.x} ${position.y} ${position.z} until ${blockName}`;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (await serverBlockIs(ctx, position, blockName)) return true;

    const target = bot.blockAt(position);
    ctx.assert(target, `${label}: Mineflayer could not see the target block`);
    await bot.lookAt(position.offset(0.5, 0.5, 0.5), true);
    await bot.dig(target, true);

    try {
      await waitForServerBlock(ctx, position, blockName, label, timeoutMs);
      return true;
    } catch (error) {
      if (attempt === attempts) throw error;
    }
  }

  return false;
}

export async function placeBiggerCraftingTable(ctx, bot, bctPosition, supportPosition, options = {}) {
  const { assert, wait } = ctx;
  const settleMs = options.settleMs ?? 1000;

  bot.chat("/bctgive");
  const bctItem = await waitForInventoryItem(bot, isBiggerCraftingTableItem, "Bigger Crafting Table item");
  await bot.equip(bctItem, "hand");

  const support = bot.blockAt(supportPosition);
  assert(support?.name === "stone", "support block was not prepared for BCT placement");
  await bot.lookAt(bctPosition.offset(0.5, 0.5, 0.5), true);
  try {
    await bot.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    try {
      await waitForServerBlock(ctx, bctPosition, "crafter", "BCT block after placement retry", 3000);
    } catch {
      throw error;
    }
  }
  await waitForServerBlock(ctx, bctPosition, "crafter", "BCT block after placement", 3000);
  await wait(settleMs);

  const placed = bot.blockAt(bctPosition);
  assert(await serverBlockIs(ctx, bctPosition, "crafter"), "BCT block was not placed");
  return placed;
}

export async function placeCoreBlock(ctx, owner, corePosition, supportPosition, options = {}) {
  const { assert, wait } = ctx;
  const label = options.label ?? "owner";
  const settleMs = options.settleMs ?? 1000;

  const coreItem = await waitForInventoryItem(owner, isCoreItem, `${label} core item`);
  await owner.equip(coreItem, "hand");

  const support = owner.blockAt(supportPosition);
  assert(support?.name === "stone", `${label} support block was not prepared for core placement`);
  await owner.lookAt(corePosition.offset(0.5, 0.5, 0.5), true);
  try {
    await owner.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    await wait(750);
    if (owner.blockAt(corePosition)?.name !== "beacon") {
      throw error;
    }
  }
  await wait(settleMs);

  const placed = owner.blockAt(corePosition);
  assert(placed?.name === "beacon", `${label} core was not placed`);
  return placed;
}

export function waitForChat(bot, action, pattern, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for chat message matching ${pattern}`));
    }, timeoutMs);
    const onMessage = (message) => {
      const text = message.toString();
      if (!patternMatches(pattern, text)) return;
      cleanup();
      resolve(text);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off("message", onMessage);
    };
    bot.on("message", onMessage);
    Promise.resolve()
      .then(action)
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}

export function waitForNoChat(bot, action, pattern, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(true);
    }, timeoutMs);
    const onMessage = (message) => {
      if (!patternMatches(pattern, message.toString())) return;
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off("message", onMessage);
    };
    bot.on("message", onMessage);
    Promise.resolve()
      .then(action)
      .catch((error) => {
        cleanup();
        reject(error);
      });
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

export async function queryCorebreakerCharges(bot) {
  const message = await waitForChat(bot, () => bot.chat("/kills"), /Corebreaker charges: \d+|kill queue is empty\. Corebreaker charges: 0/i);
  const match = message.match(/Corebreaker charges: (\d+)/i);
  if (!match) {
    throw new Error(`Could not parse Corebreaker charges from: ${message}`);
  }
  return Number(match[1]);
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

export function queryBctDisplayCount(ctx, position, radius = 1.5) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${position.x + 0.5},y=${position.y + 0.5},z=${position.z + 0.5},distance=..${radius}]`);
}

export async function countBctItemsNear(ctx, position, holders = [], radius = 3) {
  const dropped = await queryDroppedItemEntityCount(ctx, position.offset(0.5, 0.5, 0.5), radius);
  return holders.reduce((total, bot) => total + countBctItems(bot), dropped);
}

export async function waitForBctDisplayCount(ctx, position, expectedCount, options = {}) {
  return waitForEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${position.x + 0.5},y=${position.y + 0.5},z=${position.z + 0.5},distance=..${options.radius ?? 1.5}]`, expectedCount, {
    timeoutMs: options.timeoutMs ?? 5000,
    label: options.label ?? `BCT display count ${expectedCount}`
  });
}

export async function waitForBctItemsNear(ctx, position, holders = [], expectedCount = 1, options = {}) {
  return waitForCondition(
    async () => {
      const count = await countBctItemsNear(ctx, position, holders, options.radius ?? 3);
      return count === expectedCount ? { count } : null;
    },
    {
      timeoutMs: options.timeoutMs ?? 5000,
      intervalMs: options.intervalMs ?? 100,
      label: options.label ?? `BCT item count ${expectedCount}`
    }
  );
}

export async function assertNoBctLeak(ctx, options) {
  const {
    position,
    holders = [],
    label = "BCT state",
    expectedDisplays = 1,
    droppedRadius = 3
  } = options;
  const producedBctCount = await countBctItemsNear(ctx, position, holders, droppedRadius);
  ctx.assert(producedBctCount === 0, `${label} produced ${producedBctCount} BCT item(s)`);
  const displayCount = await queryBctDisplayCount(ctx, position);
  ctx.assert(displayCount === expectedDisplays, `${label} should have ${expectedDisplays} BCT display entity; found ${displayCount}`);
}

export async function assertBctStateStable(ctx, options) {
  const {
    position,
    blockName = "crafter",
    durationMs = 1000,
    intervalMs = 100,
    label = "BCT state"
  } = options;
  const started = Date.now();

  do {
    ctx.assert(await serverBlockIs(ctx, position, blockName), `${label} should keep the ${blockName} block on the server`);
    await assertNoBctLeak(ctx, options);
    if (Date.now() - started < durationMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } while (Date.now() - started < durationMs);
}

export async function assertWindowExcludesItemStable(ctx, window, predicate, label, options = {}) {
  const durationMs = options.durationMs ?? 750;
  const intervalMs = options.intervalMs ?? 50;
  const settleTimeoutMs = options.settleTimeoutMs ?? 2000;
  const matchingCount = () => window.containerItems()
    .filter(predicate)
    .reduce((total, item) => total + item.count, 0);

  await waitForCondition(
    () => matchingCount() === 0 ? { count: 0 } : null,
    { timeoutMs: settleTimeoutMs, intervalMs, label: `${label} to be rejected` }
  );

  const started = Date.now();

  do {
    const count = matchingCount();
    ctx.assert(count === 0, `${label} reappeared in the container (${count} item(s))`);
    if (Date.now() - started < durationMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } while (Date.now() - started < durationMs);
}

export async function queryEntityCount(ctx, selector) {
  const objective = "scenario_count";
  await ctx.command(`scoreboard objectives add ${objective} dummy`, 100);
  await ctx.command(`execute store result score item_count ${objective} if entity ${selector}`, 100);
  const output = await runCommandUntil(ctx, `scoreboard players get item_count ${objective}`, /item_count has \d+ \[/, {
    timeoutMs: 1000,
    label: `entity count for ${selector}`
  });
  const match = output.match(/item_count has (\d+) \[/);
  return match ? Number(match[1]) : 0;
}

export async function waitForEntityCount(ctx, selector, expectedCount, options = {}) {
  return waitForCondition(
    async () => {
      const count = await queryEntityCount(ctx, selector);
      return count === expectedCount ? { count } : null;
    },
    {
      timeoutMs: options.timeoutMs ?? 5000,
      intervalMs: options.intervalMs ?? 100,
      label: options.label ?? `entity count ${expectedCount} for ${selector}`
    }
  );
}

export async function serverBlockIs(ctx, position, blockName) {
  return serverCommandSucceeds(ctx, `execute if block ${position.x} ${position.y} ${position.z} minecraft:${blockName}`, {
    holder: "block_match",
    timeoutMs: 1000,
    label: `server block ${position.x} ${position.y} ${position.z} is ${blockName}`
  });
}

export async function serverEntityExists(ctx, selector, options = {}) {
  return serverCommandSucceeds(ctx, `execute if entity ${selector}`, {
    holder: "entity_match",
    timeoutMs: options.timeoutMs ?? 1000,
    label: options.label ?? `server entity ${selector}`
  });
}

export async function selectedItemHasNoDamage(ctx, username) {
  const hasDamage = await serverCommandSucceeds(ctx, `data get entity ${username} SelectedItem.components.minecraft:damage`, {
    holder: "item_damage",
    timeoutMs: 1500,
    label: `${username} selected item damage`
  });
  return !hasDamage;
}

export async function queryPlayerHealth(ctx, playerName, timeoutMs = 2000) {
  const objective = "scenario_health";
  await ctx.command(`scoreboard objectives add ${objective} dummy`, 100);
  await ctx.command(`scoreboard players reset health_value ${objective}`, 100);
  await ctx.command(`execute store result score health_value ${objective} run data get entity ${playerName} Health 100`, 100);
  const output = await runCommandUntil(ctx, `scoreboard players get health_value ${objective}`, /health_value has -?\d+ \[/, {
    timeoutMs,
    label: `${playerName} health`
  });
  const match = output.match(/health_value has (-?\d+) \[/);
  if (!match) {
    throw new Error(`Could not parse ${playerName} health from command output: ${output}`);
  }
  return Number(match[1]) / 100;
}

export async function queryPlayerAttribute(ctx, playerName, attributeName, timeoutMs = 2000) {
  const objective = "scenario_attr";
  const scale = 100000;
  await ctx.command(`scoreboard objectives add ${objective} dummy`, 100);
  await ctx.command(`scoreboard players reset attribute_value ${objective}`, 100);
  await ctx.command(`execute store result score attribute_value ${objective} run attribute ${playerName} ${attributeName} get ${scale}`, 100);
  const output = await runCommandUntil(ctx, `scoreboard players get attribute_value ${objective}`, /attribute_value has -?\d+ \[/, {
    timeoutMs,
    label: `${playerName} ${attributeName}`
  });
  const match = output.match(/attribute_value has (-?\d+) \[/);
  if (!match) {
    throw new Error(`Could not parse ${playerName} ${attributeName} from command output: ${output}`);
  }
  return Number(match[1]) / scale;
}

export async function serverCommandSucceeds(ctx, commandText, options = {}) {
  const objective = "scenario_bool";
  const holder = options.holder ?? "command_result";
  await ctx.command(`scoreboard objectives add ${objective} dummy`, 100);
  await ctx.command(`scoreboard players reset ${holder} ${objective}`, 100);
  await ctx.command(`execute store success score ${holder} ${objective} run ${commandText}`, 100);
  const output = await runCommandUntil(ctx, `scoreboard players get ${holder} ${objective}`, new RegExp(`${holder} has [01] \\[`), {
    timeoutMs: options.timeoutMs ?? 1000,
    label: options.label ?? commandText
  });
  const match = output.match(new RegExp(`${holder} has ([01]) \\[`));
  if (!match) {
    throw new Error(`Could not parse command success for ${commandText}: ${output}`);
  }
  return match[1] === "1";
}

export async function applyServerDamage(ctx, commandText, label = "damage") {
  const succeeded = await serverCommandSucceeds(ctx, commandText, {
    holder: "damage_result",
    label
  });
  ctx.assert(succeeded, `${label} command did not succeed`);
}

async function runCommandUntil(ctx, commandText, pattern, options) {
  if (ctx.commandUntil) {
    return ctx.commandUntil(commandText, pattern, options);
  }
  return ctx.command(commandText, options?.timeoutMs ?? 500);
}

function patternMatches(pattern, value) {
  pattern.lastIndex = 0;
  return pattern.test(value);
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
