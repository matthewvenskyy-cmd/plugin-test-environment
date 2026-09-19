import { serverRecipeExists } from "./helpers.js";

export const name = "Rocketlytra recipe range is registered";

export async function run(ctx) {
  const { assert, spawnBot } = ctx;
  await spawnBot("RocketRange");

  for (const charges of [1, 8]) {
    const key = `fireworkselytraplugin:rocketlytra_${charges}`;
    assert(
      await serverRecipeExists(ctx, "RocketRange", key),
      `Paper could not give registered recipe ${key}`
    );
  }

  assert(
    !await serverRecipeExists(ctx, "RocketRange", "fireworkselytraplugin:rocketlytra_9"),
    "rocketlytra_9 should stay outside the registered recipe range"
  );
}
