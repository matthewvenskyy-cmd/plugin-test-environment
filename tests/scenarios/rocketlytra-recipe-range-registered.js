export const name = "Rocketlytra recipe range is registered";

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  await spawnBot("RocketRange");

  for (const charges of [1, 8]) {
    const key = `fireworkselytraplugin:rocketlytra_${charges}`;
    const takeOutput = await command(`recipe take RocketRange ${key}`, 500);
    assert(
      /Took 1 recipe\(s\) from RocketRange|No recipes were removed/.test(takeOutput),
      `Paper could not address registered recipe ${key}: ${takeOutput}`
    );

    const giveOutput = await command(`recipe give RocketRange ${key}`, 500);
    assert(
      /Unlocked 1 recipe\(s\) for RocketRange|Gave 1 recipe\(s\) to RocketRange|Gave \[RocketRange\] the recipe/.test(giveOutput),
      `Paper could not give registered recipe ${key}: ${giveOutput}`
    );
  }

  const tooManyOutput = await command("recipe give RocketRange fireworkselytraplugin:rocketlytra_9", 500);
  assert(
    !/Unlocked 1 recipe\(s\)|Gave 1 recipe\(s\)|Gave \[RocketRange\] the recipe/.test(tooManyOutput),
    `rocketlytra_9 should stay outside the registered recipe range: ${tooManyOutput}`
  );
}
