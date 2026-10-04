import { Vec3 } from "vec3";
import {
  clearBctArtifacts,
  collectChatMessages,
  countBctItemsNear,
  digUntilServerBlock,
  placeBiggerCraftingTable,
  waitForBctDisplayCount,
  waitForBctItemsNear,
  waitForCondition,
  waitForInventoryItem
} from "./helpers.js";

export const name = "TimeMachine records one successful BCT break";

const BCT_BLOCK = new Vec3(344, 80, 1);
const SUPPORT_BLOCK = new Vec3(344, 79, 1);
const FLOOR_BLOCK = new Vec3(344, 79, 0);

export async function run(ctx) {
  const { assert, bot, command } = ctx;

  try {
    await clearBctArtifacts(ctx);
    await command("forceload add 344 1", 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command(`tp ScenarioBot ${FLOOR_BLOCK.x} 80 ${FLOOR_BLOCK.z} 0 0`, 500);
    await command("gamemode survival ScenarioBot", 250);
    await bot.waitForChunksToLoad();

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    await waitForBctDisplayCount(ctx, BCT_BLOCK, 1, { label: "TimeMachine BCT display after placement" });

    await command("give ScenarioBot minecraft:diamond_pickaxe", 500);
    const pickaxe = await waitForInventoryItem(bot, (item) => item?.name === "diamond_pickaxe", "TimeMachine BCT pickaxe");
    await bot.equip(pickaxe, "hand");
    assert(
      await digUntilServerBlock(ctx, bot, BCT_BLOCK, "air", { label: "TimeMachine-observed BCT break" }),
      "successful BCT break should remove the block"
    );
    await waitForBctDisplayCount(ctx, BCT_BLOCK, 0, { label: "TimeMachine BCT display after break" });

    await command(`tp ScenarioBot ${BCT_BLOCK.x + 0.5} 80 ${BCT_BLOCK.z + 0.5} 0 0`, 750);
    await waitForBctItemsNear(ctx, BCT_BLOCK, [bot], 1, { label: "TimeMachine BCT single returned item" });
    const returnedItems = await countBctItemsNear(ctx, BCT_BLOCK, [bot]);
    assert(returnedItems === 1, `successful BCT break should return exactly one table, found ${returnedItems}`);

    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:stone`, 250);
    await bot.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    const provenance = await waitForCondition(async () => {
      const messages = await collectChatMessages(bot, () => bot.chat("/timemachine why"), 500);
      const transcript = messages.join("\n");
      return /Provenance of/i.test(transcript) && /PLAYER_BREAK/i.test(transcript) ? transcript : null;
    }, { timeoutMs: 5000, intervalMs: 100, label: "TimeMachine successful BCT break provenance" });

    assert(/PLAYER_PLACE/i.test(provenance), `BCT provenance should retain the player placement; provenance=${provenance}`);
    const breakEntries = provenance.match(/PLAYER_BREAK/gi) ?? [];
    assert(breakEntries.length === 1, `TimeMachine should record exactly one BCT break, found ${breakEntries.length}; provenance=${provenance}`);
  } finally {
    await clearBctArtifacts(ctx);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond_pickaxe", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
    await command("forceload remove 344 1", 250);
  }
}
