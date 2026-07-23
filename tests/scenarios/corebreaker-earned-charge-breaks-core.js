import { Vec3 } from "vec3";
import { isCorebreakerItem, isCoreItem, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Corebreaker earned charge breaks player core";

const FIRST_CORE = new Vec3(78, 80, 1);
const FIRST_SUPPORT = new Vec3(78, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(78, 79, 0);
const SECOND_CORE = new Vec3(80, 80, 1);
const SECOND_SUPPORT = new Vec3(80, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(80, 79, 0);
const BREAKER_FLOOR = new Vec3(79, 79, 1);
const KILL_FLOOR = new Vec3(79, 79, -1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("EarnOwnerOne");
  const secondOwner = await spawnBot("EarnOwnerTwo");
  const breaker = await spawnBot("EarnBreaker", { op: false });
  const killVictim = await spawnBot("EarnVictim");

  await command("gamerule keepInventory true", 250);
  await command("gamerule naturalRegeneration false", 250);
  await command("kill @e[type=item]", 250);
  await command("deop EarnBreaker", 250);
  await command("fill 77 79 -2 81 79 2 minecraft:stone", 250);
  await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
  await command("gamemode creative EarnOwnerOne", 250);
  await command("gamemode creative EarnOwnerTwo", 250);
  await command("gamemode survival EarnBreaker", 250);
  await command("gamemode survival EarnVictim", 250);
  await command("tp EarnOwnerOne 78 80 0 0 0", 500);
  await command("tp EarnOwnerTwo 80 80 0 0 0", 500);
  await command("tp EarnBreaker 79 80 1 90 0", 500);
  await command("tp EarnVictim 79 80 -1 180 0", 500);
  await command("gamemode survival EarnOwnerOne", 250);
  await command("gamemode survival EarnOwnerTwo", 250);
  await wait(1000);

  await placeCore(ctx, firstOwner, FIRST_SUPPORT, FIRST_CORE, "first owner");
  await placeCore(ctx, secondOwner, SECOND_SUPPORT, SECOND_CORE, "second owner");

  const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "non-op breaker Corebreaker");
  await breaker.equip(corebreaker, "hand");

  await command("tp EarnBreaker 79 80 1 90 0", 500);
  await breakCore(ctx, breaker, FIRST_CORE, "default charge");
  assert(breaker.blockAt(FIRST_CORE)?.name === "air", "default Corebreaker charge should destroy the first core");
  assert(await queryCharges(breaker) === 0, "default charge should be consumed before earning a kill charge");

  await killPlayerWithBreaker(ctx, killVictim);
  assert(await queryCharges(breaker) === 1, "unique kill should grant one Corebreaker charge");

  await command("tp EarnBreaker 79 80 1 90 0", 500);
  await breakCore(ctx, breaker, SECOND_CORE, "earned kill charge");
  assert(breaker.blockAt(SECOND_CORE)?.name === "air", "earned kill charge should destroy the second core");
  assert(await queryCharges(breaker) === 0, "earned kill charge should be consumed after breaking a core");

  await command("gamerule keepInventory false", 250);
  await command("gamerule naturalRegeneration true", 250);
  await command("kill @e[type=item]", 250);
  await command("clear EarnBreaker", 250);
  await command("clear EarnVictim", 250);
  await command("fill 77 79 -2 81 82 2 minecraft:air", 250);
}

async function placeCore(ctx, owner, supportPosition, corePosition, label) {
  const { assert, wait } = ctx;
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
  await wait(1000);
  assert(owner.blockAt(corePosition)?.name === "beacon", `${label} core was not placed`);
}

async function breakCore(ctx, breaker, corePosition, label) {
  const { assert, wait } = ctx;
  const target = breaker.blockAt(corePosition);
  assert(target?.name === "beacon", `breaker could not see the core for ${label}`);
  try {
    await breaker.dig(target, true);
  } catch {
    // CorePlugin cancels vanilla breaking and mutates valid core breaks itself.
  }
  await wait(1500);
}

async function killPlayerWithBreaker(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear EarnVictim", 250);
  await command("attribute EarnVictim minecraft:max_health base set 20", 250);
  await command(`setblock ${KILL_FLOOR.x} ${KILL_FLOOR.y} ${KILL_FLOOR.z} minecraft:stone`, 250);
  await command("tp EarnVictim 79 80 -1 180 0", 250);
  await command("tp EarnBreaker 79 80 1 180 0", 250);
  await wait(750);
  await command("data merge entity EarnVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage EarnVictim 40 minecraft:player_attack by EarnBreaker", 500);
  assert(/Applied|damaged/i.test(output), `earned-charge damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}

async function queryCharges(bot) {
  const message = await waitForChat(bot, () => bot.chat("/kills"), /Corebreaker charges: \d+|kill queue is empty\. Corebreaker charges: 0/i);
  const match = message.match(/Corebreaker charges: (\d+)/i);
  if (!match) {
    throw new Error(`Could not parse Corebreaker charges from: ${message}`);
  }
  return Number(match[1]);
}
