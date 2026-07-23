import { waitForChat, waitForEvent } from "./helpers.js";

export const name = "Core duplicate kill does not add Corebreaker charge";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const killer = await spawnBot("DupKiller", { op: false });
  const victim = await spawnBot("DupVictim");

  await command("gamerule keepInventory true", 250);
  await command("gamerule naturalRegeneration false", 250);
  await command("fill 72 79 -1 74 79 1 minecraft:stone", 250);
  await command("gamemode survival DupKiller", 250);
  await command("gamemode survival DupVictim", 250);
  await command("effect clear DupKiller", 250);
  await command("effect clear DupVictim", 250);
  await command("tp DupKiller 73 80 -1 0 0", 500);
  await command("tp DupVictim 73 80 0 180 0", 500);
  await wait(1000);

  const startingCharges = await queryCharges(killer);
  await killVictim(ctx, victim);
  const firstCharges = await queryCharges(killer);
  assert(firstCharges === startingCharges + 1, `first unique kill should add one Corebreaker charge; before=${startingCharges}, after=${firstCharges}`);

  await killVictim(ctx, victim);
  const secondCharges = await queryCharges(killer);
  assert(secondCharges === firstCharges, `killing the same victim twice should not add another Corebreaker charge; first=${firstCharges}, second=${secondCharges}`);

  await command("gamerule keepInventory false", 250);
  await command("gamerule naturalRegeneration true", 250);
  await command("clear DupKiller", 250);
  await command("clear DupVictim", 250);
  await command("fill 72 79 -1 74 79 1 minecraft:air", 250);
}

async function queryCharges(bot) {
  const message = await waitForChat(bot, () => bot.chat("/kills"), /Corebreaker charges: \d+/i);
  const match = message.match(/Corebreaker charges: (\d+)/i);
  if (!match) {
    throw new Error(`Could not parse Corebreaker charges from: ${message}`);
  }
  return Number(match[1]);
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear DupVictim", 250);
  await command("attribute DupVictim minecraft:max_health base set 20", 250);
  await command("tp DupVictim 73 80 0 180 0", 250);
  await command("tp DupKiller 73 80 -1 0 0", 250);
  await wait(750);
  await command("data merge entity DupVictim {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage DupVictim 40 minecraft:player_attack by DupKiller", 500);
  assert(/Applied|damaged/i.test(output), `duplicate-kill damage command did not report success: ${output}`);
  await respawned;
  await wait(1500);
}
