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

export function countNearbyDroppedItems(bot, position, radius = 3) {
  return Object.values(bot.entities)
    .filter((entity) => entity?.name === "item")
    .filter((entity) => entity.position.distanceTo(position) <= radius)
    .length;
}

export function displayText(item) {
  return JSON.stringify(item?.displayName ?? "") + JSON.stringify(item?.customName ?? "") + JSON.stringify(item?.nbt ?? "");
}
