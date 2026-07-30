import { Vec3 } from "vec3";
import { isCorebreakerItem, isCoreItem, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Op Corebreaker has unlimited core breaks";

const FIRST_CORE = new Vec3(84, 80, 1);
const FIRST_SUPPORT = new Vec3(84, 79, 1);
const FIRST_OWNER_FLOOR = new Vec3(84, 79, 0);
const SECOND_CORE = new Vec3(86, 80, 1);
const SECOND_SUPPORT = new Vec3(86, 79, 1);
const SECOND_OWNER_FLOOR = new Vec3(86, 79, 0);
const BREAKER_FLOOR = new Vec3(85, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const firstOwner = await spawnBot("UnlimitedOne");
  const secondOwner = await spawnBot("UnlimitedTwo");
  const breaker = await spawnBot("UnlimitedBreak");

  await command("kill @e[type=item]", 250);
  await command("fill 83 79 0 87 79 1 minecraft:stone", 250);
  await command(`setblock ${FIRST_CORE.x} ${FIRST_CORE.y} ${FIRST_CORE.z} minecraft:air`, 250);
  await command(`setblock ${SECOND_CORE.x} ${SECOND_CORE.y} ${SECOND_CORE.z} minecraft:air`, 250);
  await command("gamemode creative UnlimitedOne", 250);
  await command("gamemode creative UnlimitedTwo", 250);
  await command("gamemode survival UnlimitedBreak", 250);
  await command("tp UnlimitedOne 84 80 0 0 0", 500);
  await command("tp UnlimitedTwo 86 80 0 0 0", 500);
  await command("tp UnlimitedBreak 85 80 1 90 0", 500);
  await command("gamemode survival UnlimitedOne", 250);
  await command("gamemode survival UnlimitedTwo", 250);
  await wait(1000);

  await placeCore(ctx, firstOwner, FIRST_SUPPORT, FIRST_CORE, "first owner");
  await placeCore(ctx, secondOwner, SECOND_SUPPORT, SECOND_CORE, "second owner");

  const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "op breaker Corebreaker");
  await breaker.equip(corebreaker, "hand");

  const unlimitedBefore = await waitForChat(breaker, () => breaker.chat("/kills"), /Corebreaker charges: Unlimited/i);
  assert(unlimitedBefore, "op breaker should report unlimited Corebreaker charges before breaking cores");

  await command("tp UnlimitedBreak 85 80 1 90 0", 500);
  await breakCore(ctx, breaker, FIRST_CORE, "first core");
  assert(breaker.blockAt(FIRST_CORE)?.name === "air", "op Corebreaker should remove the first player core");

  await command("tp UnlimitedBreak 85 80 1 90 0", 500);
  await breakCore(ctx, breaker, SECOND_CORE, "second core");
  assert(breaker.blockAt(SECOND_CORE)?.name === "air", "op Corebreaker should remove the second player core without earned charges");

  const unlimitedAfter = await waitForChat(breaker, () => breaker.chat("/kills"), /Corebreaker charges: Unlimited/i);
  assert(unlimitedAfter, "op breaker should still report unlimited Corebreaker charges after multiple breaks");

  await command("kill @e[type=item]", 250);
  await command("clear UnlimitedBreak", 250);
  await command("fill 83 79 0 87 82 1 minecraft:air", 250);
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
  assert(target?.name === "beacon", `breaker could not see the ${label}`);
  try {
    await breaker.dig(target, true);
  } catch {
    // CorePlugin cancels vanilla breaking and mutates valid core breaks itself.
  }
  await wait(1500);
}
