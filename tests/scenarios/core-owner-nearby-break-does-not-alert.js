import { Vec3 } from "vec3";
import { isCoreItem, serverBlockIs, waitForInventoryItem } from "./helpers.js";

export const name = "Core owner nearby break does not alert";

const CORE_BLOCK = new Vec3(148, 80, 1);
const SUPPORT_BLOCK = new Vec3(148, 79, 1);
const BREAK_TARGET = new Vec3(149, 80, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("OwnBreakOwner");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 148 0", 250);
    await command("fill 147 79 -1 150 79 2 minecraft:stone", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:stone`, 250);
    await command("gamemode creative OwnBreakOwner", 250);
    await command("tp OwnBreakOwner 148 80 0 0 0", 500);
    await command("gamemode survival OwnBreakOwner", 250);
    await wait(1000);

    const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
    await owner.equip(coreItem, "hand");

    const support = await waitForBlock(owner, SUPPORT_BLOCK, "stone", "core support block");
    await owner.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await owner.placeBlock(support, new Vec3(0, 1, 0));
    } catch (error) {
      await wait(750);
      if (owner.blockAt(CORE_BLOCK)?.name !== "beacon") {
        throw error;
      }
    }
    await wait(1000);
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should be placed before nearby owner break");

    await command("clear OwnBreakOwner minecraft:netherite_pickaxe", 250);
    await command("give OwnBreakOwner minecraft:diamond_pickaxe", 500);
    const pickaxe = await waitForInventoryItem(owner, (item) => item?.name === "diamond_pickaxe", "plain diamond pickaxe");
    await owner.equip(pickaxe, "hand");

    const target = await waitForBlock(owner, BREAK_TARGET, "stone", "near-core owner break target");
    const noAlert = waitForNoChat(owner, /Block broken near your core at/i, 2500);
    await owner.lookAt(BREAK_TARGET.offset(0.5, 0.5, 0.5), true);
    await owner.dig(target, true);
    assert(await noAlert, "owner should not receive a nearby-core alert for breaking near their own core");
    assert(await serverBlockIs(ctx, BREAK_TARGET, "air"), "owner nearby non-core block should still break normally");
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner nearby block break should not modify the core");
  } finally {
    await command("clear OwnBreakOwner", 250);
    await command("kill @e[type=item]", 250);
    await command("fill 147 79 -1 150 82 2 minecraft:air", 250);
    await command("forceload remove 148 0", 250);
  }
}

function waitForNoChat(bot, pattern, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(true);
    }, timeoutMs);
    const onMessage = (message) => {
      if (!pattern.test(message.toString())) return;
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off("message", onMessage);
    };
    bot.on("message", onMessage);
  });
}

async function waitForBlock(bot, position, blockName, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const block = bot.blockAt(position);
    if (block?.name === blockName) return block;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
