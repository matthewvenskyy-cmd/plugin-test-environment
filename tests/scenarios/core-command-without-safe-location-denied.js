import { Vec3 } from "vec3";
import { placeCoreBlock, serverBlockIs, waitForChat } from "./helpers.js";

export const name = "Core command without safe location is denied";

const CORE_BLOCK = new Vec3(214, 80, 1);
const SUPPORT_BLOCK = new Vec3(214, 79, 1);
const START_BLOCK = new Vec3(214, 79, 0);
const AWAY_BLOCK = new Vec3(230, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreNoSafe");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 214 1", 250);
    await command("forceload add 230 0", 250);
    await command("fill 211 79 -2 217 79 4 minecraft:stone", 250);
    await command("fill 211 80 -2 217 83 4 minecraft:air", 250);
    await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative CoreNoSafe", 250);
    await command(`tp CoreNoSafe ${START_BLOCK.x} 80 ${START_BLOCK.z} 0 0`, 500);
    await command("gamemode survival CoreNoSafe", 250);
    await owner.waitForChunksToLoad();
    await wait(1000);

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core was not placed");

    await command("fill 211 77 -2 217 84 4 minecraft:stone", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:beacon`, 250);
    await command(`tp CoreNoSafe ${AWAY_BLOCK.x} 80 ${AWAY_BLOCK.z} 0 0`, 500);
    await wait(500);
    const awayPosition = owner.entity.position.clone();
    assert(awayPosition.distanceTo(CORE_BLOCK) > 10, "test player was not moved away from the core");

    const denied = await waitForChat(owner, () => owner.chat("/core"), /do not have a safe core teleport location/i);
    assert(denied, "/core should be denied immediately when no safe destination exists");
    await wait(1500);

    assert(owner.entity.position.distanceTo(awayPosition) < 2, "denied /core should leave the player away from the core");
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "denied /core should not modify the placed core");
    await waitForChat(owner, () => owner.chat("/selfdestruct"), /core selfdestructed/i);
    await wait(1000);
  } finally {
    await command("kill @e[type=item]", 250);
    await command("fill 211 77 -2 217 84 4 minecraft:air", 250);
    await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:air`, 250);
    await command("forceload remove 214 1", 250);
    await command("forceload remove 230 0", 250);
  }
}
