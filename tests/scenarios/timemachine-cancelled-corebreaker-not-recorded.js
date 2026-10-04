import { Vec3 } from "vec3";
import {
  assertBctStateStable,
  clearBctArtifacts,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  waitForInventoryItem,
  waitForTimeMachineProvenance
} from "./helpers.js";

export const name = "TimeMachine ignores cancelled BCT Corebreaker breaks";

const BCT_BLOCK = new Vec3(340, 80, 1);
const SUPPORT_BLOCK = new Vec3(340, 79, 1);
const FLOOR_BLOCK = new Vec3(340, 79, 0);

export async function run(ctx) {
  const { assert, bot, command } = ctx;

  try {
    await clearBctArtifacts(ctx);
    await command("forceload add 340 1", 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command(`tp ScenarioBot ${FLOOR_BLOCK.x} 80 ${FLOOR_BLOCK.z} 0 0`, 500);
    await command("gamemode survival ScenarioBot", 250);
    await bot.waitForChunksToLoad();

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    const corebreaker = await waitForInventoryItem(bot, isCorebreakerItem, "TimeMachine provenance Corebreaker");
    await bot.equip(corebreaker, "hand");
    await bot.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await bot.dig(bot.blockAt(BCT_BLOCK), true);
    } catch {
      // CorePlugin cancels this break on Paper, which Mineflayer may report as a dig failure.
    }

    await assertBctStateStable(ctx, {
      position: BCT_BLOCK,
      holders: [bot],
      label: "TimeMachine-observed cancelled Corebreaker attempt",
      durationMs: 1000
    });

    const provenance = await waitForTimeMachineProvenance(ctx, bot, BCT_BLOCK, {
      requiredPattern: /PLAYER_PLACE/i,
      label: "TimeMachine BCT placement provenance"
    });

    assert(!/PLAYER_BREAK/i.test(provenance), `cancelled Corebreaker break must not enter TimeMachine history; provenance=${provenance}`);
  } finally {
    await clearBctArtifacts(ctx);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
    await command("forceload remove 340 1", 250);
  }
}
