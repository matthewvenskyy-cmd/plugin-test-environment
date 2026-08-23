import { Vec3 } from "vec3";
import {
  countItemsByName,
  placeCoreBlock,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target cannot bypass core protection";

const CORE_BLOCK = new Vec3(94, 80, 1);
const SUPPORT_BLOCK = new Vec3(94, 79, 1);
const RIDER_FLOOR = new Vec3(95, 79, -2);
const TARGET_FLOOR = new Vec3(95, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MtTgtProtOwn");
  const rider = await spawnBot("MtTgtProtR");
  const target = await spawnBot("MtTgtProt");

  try {
    await command("kill @e[type=item]", 250);
    await command("fill 93 79 -3 96 79 2 minecraft:stone", 250);
    await command("fill 93 80 -3 96 82 2 minecraft:air", 250);
    await command("gamemode creative MtTgtProtOwn", 250);
    await command("gamemode creative MtTgtProtR", 250);
    await command("gamemode creative MtTgtProt", 250);
    await command("tp MtTgtProtOwn 94 80 0 0 0", 500);
    await command("tp MtTgtProtR 95 80 -2 0 0", 500);
    await command("tp MtTgtProt 95 80 2 180 0", 500);
    await waitForBlock(owner, SUPPORT_BLOCK, "stone", "mounted target protection support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target protection rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target protection floor block");
    await command("gamemode survival MtTgtProtOwn", 250);
    await command("gamemode survival MtTgtProtR", 250);
    await command("gamemode survival MtTgtProt", 250);
    await command("effect give MtTgtProtOwn minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtProtR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtProt minecraft:slow_falling 30 1 true", 250);
    await owner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtProtR 95 80 -2 0 0", 500);
    await command("tp MtTgtProt 95 80 2 180 0", 500);
    await wait(250);

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });

    await command("clear MtTgtProt minecraft:netherite_pickaxe", 250);
    await command("give MtTgtProt minecraft:diamond_pickaxe", 500);
    const pickaxe = await waitForInventoryItem(target, (item) => item?.name === "diamond_pickaxe", "ridden target plain diamond pickaxe");
    const startingPickaxes = countItemsByName(target, "diamond_pickaxe");
    await target.equip(pickaxe, "hand");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtProt/i);
    assert(mounted, "rider should mount the target player before target core protection break attempt");
    await wait(500);

    const core = await waitForBlock(target, CORE_BLOCK, "beacon", "placed core block");
    await target.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await target.dig(core, true);
    } catch {
      // CorePlugin should cancel the break even while the player is being ridden.
    }
    await wait(1500);

    assert(target.blockAt(CORE_BLOCK)?.name === "beacon", "ridden plain-tool target should not remove another player's core");
    assert(countItemsByName(target, "diamond_pickaxe") === startingPickaxes, "ridden denied core break should keep the diamond pickaxe");
    assert(await selectedItemHasNoDamage(ctx, "MtTgtProt"), "ridden denied core break should not damage the diamond pickaxe");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MtTgtProt minecraft:diamond_pickaxe", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("fill 93 79 -3 96 82 2 minecraft:air", 250);
  }
}
