import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Viking shield bashes target";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const viking = await spawnBot("ShieldViking");
  await spawnBot("ShieldTarget");

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("clear ShieldViking", 250);
    await command("clear ShieldTarget", 250);
    await command("effect clear ShieldViking", 250);
    await command("effect clear ShieldTarget", 250);
    await command("fill 112 79 -1 114 79 1 minecraft:stone", 250);
    await command("gamemode survival ShieldViking", 250);
    await command("gamemode survival ShieldTarget", 250);
    await command("tp ShieldViking 113 80 -1 0 0", 500);
    await command("tp ShieldTarget 113 80 0 180 0", 500);
    await command("classes give ShieldViking viking_shield", 500);
    await wait(1000);

    const shield = await waitForInventoryItem(viking, (item) => item?.name === "shield", "Viking Shield class item");
    await viking.equip(shield, "hand");
    await wait(1500);

    const status = await waitForChat(viking, () => viking.chat("/classes status"), /Current class: Viking/);
    assert(status, "Viking Shield should set class status to Viking before shield bash");

    await command("attribute ShieldTarget minecraft:max_health base set 20", 250);
    await command("data merge entity ShieldTarget {Health:20.0f,HurtTime:0s,Invulnerable:0b}", 250);
    await command("tp ShieldViking 113 80 -1 0 0", 250);
    await command("tp ShieldTarget 113 80 0 180 0", 250);
    await wait(750);

    const before = await health(ctx, "ShieldTarget");
    await viking.lookAt(viking.entity.position.offset(0, 1.4, 2), true);
    viking.activateItem();
    await wait(1500);
    viking.deactivateItem();

    const after = await health(ctx, "ShieldTarget");
    const damage = before - after;
    assert(damage >= 2.5, `Viking shield bash should damage the nearby target; before=${before}, after=${after}, damage=${damage}`);
  } finally {
    await command("gamerule naturalRegeneration true", 250);
    await command("clear ShieldViking", 250);
    await command("clear ShieldTarget", 250);
    await command("effect clear ShieldTarget", 250);
    await command("attribute ShieldTarget minecraft:max_health base set 20", 250);
    await command("fill 112 79 -1 114 79 1 minecraft:air", 250);
  }
}

async function health(ctx, playerName) {
  const output = await ctx.command(`data get entity ${playerName} Health`, 500);
  const cleanOutput = stripAnsi(output);
  const match = cleanOutput.match(/Health:?\s*([\d.]+)f?/i) || cleanOutput.match(/entity data:\s*([\d.]+)f?/i);
  if (!match) {
    throw new Error(`Could not parse ${playerName} health from command output: ${output}`);
  }
  return Number(match[1]);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}
