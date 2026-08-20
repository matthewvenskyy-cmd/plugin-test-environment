import { Vec3 } from "vec3";
import { placeCoreBlock, serverBlockIs, waitForChat } from "./helpers.js";

export const name = "Core command teleports to placed core";

const CORE_BLOCK = new Vec3(42, 80, 1);
const SUPPORT_BLOCK = new Vec3(42, 79, 1);
const START_BLOCK = new Vec3(42, 79, 0);
const AWAY_BLOCK = new Vec3(70, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreTeleport");

  await command("kill @e[type=item]", 250);
  await command("fill 40 79 -1 44 79 3 minecraft:stone", 250);
  await command("fill 40 80 -1 44 82 3 minecraft:air", 250);
  await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative CoreTeleport", 250);
  await command(`tp CoreTeleport ${START_BLOCK.x} 80 ${START_BLOCK.z} 0 0`, 500);
  await command("gamemode survival CoreTeleport", 250);
  await wait(1000);

  await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });
  assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core was not placed");

  await command(`tp CoreTeleport ${AWAY_BLOCK.x} 80 ${AWAY_BLOCK.z} 0 0`, 500);
  await wait(500);
  assert(owner.entity.position.distanceTo(CORE_BLOCK) > 20, "test player was not moved away from the core");

  const queued = await waitForChat(owner, () => owner.chat("/core"), /Teleporting to your core in \d+ seconds\./);
  assert(queued, "/core should queue teleport when a safe core location exists");
  const completed = await waitForChat(owner, () => {}, /Teleported to your core\./, 6000);
  assert(completed, "/core should confirm completed teleport");
  await wait(500);

  assert(owner.entity.position.distanceTo(CORE_BLOCK.offset(0.5, 0, 0.5)) <= 4, "/core should move the player near their placed core");
  assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "/core teleport should not modify the placed core block");

  await command("kill @e[type=item]", 250);
  await command("fill 40 79 -1 44 82 3 minecraft:air", 250);
  await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:air`, 250);
}
