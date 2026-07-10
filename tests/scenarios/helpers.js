export function isBiggerCraftingTableItem(item) {
  return item?.name === "crafter" && displayText(item).includes("Bigger Crafting Table");
}

export function isCorebreakerItem(item) {
  return item?.name === "netherite_pickaxe" && displayText(item).includes("Corebreaker");
}

export function countMatchingItems(bot, predicate) {
  return bot.inventory.items()
    .filter(predicate)
    .reduce((total, item) => total + item.count, 0);
}

export function countBctItems(bot) {
  return countMatchingItems(bot, isBiggerCraftingTableItem);
}

export function displayText(item) {
  return JSON.stringify(item?.displayName ?? "") + JSON.stringify(item?.customName ?? "") + JSON.stringify(item?.nbt ?? "");
}
