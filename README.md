# Minecraft Plugin Testing Environment

This folder is a disposable test harness for the plugin projects in `C:\Users\Admin\Desktop\mine-plugins`.

It uses maintained building blocks instead of a fully custom test stack:

- PaperMC's public API to download a real Paper `1.21.11` server jar.
- Your existing Maven and Gradle builds to produce plugin jars.
- A headless Paper server in `.work/server`.
- Mineflayer for optional real bot smoke tests.

I also checked current off-the-shelf options. `@drownek/plugwright` is the closest ready-made E2E framework: it runs a Paper server and drives Mineflayer bots with a Playwright-like API. It is excellent for Gradle Paper projects, but your folder is mostly Maven projects, so this harness keeps the existing project layout intact. MockBukkit is still useful for fast unit tests inside each plugin, but it does not run a real server.

## Setup

Install the Node dependencies once:

```powershell
npm.cmd install
```

Download/cache the Paper server:

```powershell
npm.cmd run setup
```

Run the fast harness self-check without starting Paper:

```powershell
npm.cmd run selftest
```

## Run Everything

Build all plugins, run headless Paper startup smoke checks, then run gameplay scenario tests:

```powershell
npm.cmd test
```

Run only gameplay scenario tests:

```powershell
npm.cmd run scenarios
```

List scenarios without starting Paper:

```powershell
npm.cmd run list:scenarios
node src/harness.js list-scenarios --scenario="preserves contents"
node src/harness.js list-scenarios --scenario=bct-corebreaker --json
```

Run matching scenarios by filename fragment, exported scenario name, or expected-failure reason text:

```powershell
node src/harness.js scenarios --no-build --scenario=core-owner
node src/harness.js scenarios --no-build --scenario=bct-corebreaker
node src/harness.js scenarios --no-build --scenario="preserves contents"
```

Run matching scenarios with a fresh disposable Paper server for each scenario. This is slower, but useful when an ordered scenario run exposes state leakage or when you want the cleanest possible plugin-interaction signal:

```powershell
node src/harness.js scenarios --no-build --fresh-scenarios --scenario=core-command
```

Each scenario run also writes a JUnit-compatible report to `.work/reports/scenarios.xml`, so CI systems and IDEs can show the Paper/Mineflayer gameplay checks as normal test results. When a scenario fails, the harness writes a text artifact under `.work/failures/` with the scenario path, error stack, bot snapshots, inventories, positions, and recent server log tail. Expected-failure scenarios are marked as skipped in the JUnit report, but still fail the suite if they unexpectedly start passing.

The repository includes a manual GitHub Actions workflow in `.github/workflows/plugin-harness.yml`. It targets a self-hosted Windows runner because the harness expects this repo and the plugin projects to exist as sibling folders, matching the local `mine-plugins` workspace. The workflow runs the fast harness selftest, smoke checks, optional selected scenarios, and uploads the JUnit report plus failure/server-log artifacts.

Build plugin jars first, then run gameplay scenarios in a separate Node process:

```powershell
npm.cmd run scenarios:build
```

The first scenarios cover Bigger Crafting Table break behavior and CorePlugin interactions: normal survival BCT break returns exactly one BCT, op and non-op Corebreaker break attempts against a non-core BCT leave the block in place, preserve charges, and do not duplicate the item, repeated cancelled Corebreaker attempts against a BCT do not leak items, displays, charges, or tool state, tracks a known expected failure for BCT contents lost after a Corebreaker attempt, BCT display entities follow block placement/breaking, players cannot place another player's core, cores cannot be placed on beacon bases or duplicated into a second placed core, no-core `/core` teleport is denied, `/core` denies placed cores without safe destinations, teleports to a safe placed-core location, and fails if that destination becomes unsafe during the countdown, right-clicking a placed core identifies its owner, near-core block breaks alert the owner without damaging the core while owner nearby breaks stay quiet, core owners cannot Corebreak their own core, selfdestruct removes an owned core, drops owner inventory, and restores a core item while no-core selfdestruct is denied, `/breakcore` denies non-ops and targets without placed cores, Corebreaker charge use, duplicate-kill de-duplication, player-visible Corebreaker charge lore updates, classed Viking kill charge tracking, earned-charge consumption, op unlimited breaks, and owner inventory drops at broken cores are reflected in `/kills` and world state, Corebreakers cannot mine ordinary blocks or consume charges on denied normal-block attempts, uncharged Corebreakers cannot destroy cores or lose their item on denied core attempts, owner Corebreaker denials preserve charges and the item, plain tools cannot break another player's core or take damage on denied core attempts, bound CorePlugin items cannot be dropped, cannot leak into death drops, cannot be hotbar-swapped into chests or Bigger Crafting Tables, and cannot be stored in chests or Bigger Crafting Table inventories, AdminPlugin triple-sneak toggles operator game mode only for ops and only inside the timing window, and `/adminplugin` respects command permissions, ClassesPlugin class items select from main hand/offhand, Class Rechooser opens its menu without being consumed, grants the selected class item, and resets/selects the expected class, Archer stillness invisibility and a known expected failure for movement cleanup, movement modifiers, Heavy Knight speed penalty, Light Knight speed boost, Viking axe damage, a known expected failure for Viking shield bash, and berserk health, Basic Mage melee penalty and ally food healing, Dark/Divine Mage death effects, Necromancer darkness, night speed, and melee resistance, Knight incoming sword reduction, and give permissions, Fireworks Elytra exposes, crafts, preserves custom elytra names while adding charges, recrafts, keeps Rocketlytra standing sprint from spending charges, tracks a known expected failure for Rocketlytra crafting through Bigger Crafting Table, and registers the expected Rocketlytra recipe range, MountPlugin can mount, reject duplicate mounting and occupied targets, release targets after rider logout or death, release riders after target logout or death, let ridden players kick riders, deny unsafe mount/unmount commands, unmount another player, preserve mounted rider class selection, deny non-op `/breakcore` while riding or being ridden, cannot drop rider or target bound CorePlugin items, cannot store rider or target bound CorePlugin items in chests or Bigger Crafting Tables, cannot hotbar-swap rider or target bound CorePlugin items into Bigger Crafting Tables or target bound CorePlugin items into chests, tracks a known expected failure for mounted rider Corebreaker hotbar-swaps into chests, cannot death-drop rider or target bound items, bypass core protection while riding or being ridden, or place wrong-owner cores while riding or being ridden, mounted rider or target Corebreaker normal-block denials preserve charge/item/tool state, and mounted rider or target Corebreaker BCT denials do not duplicate items or displays, offline owners are protected, and Corebreaker can destroy another online player's core.

If Mineflayer is behind the newest Minecraft protocol, run the server-only smoke test:

```powershell
npm.cmd run smoke
```

When jars are already built and memory is tight, skip Maven/Gradle and only assemble/start the disposable server:

```powershell
node src/harness.js smoke --no-build
node src/harness.js test --no-build
```

## Run One Plugin

```powershell
node src/harness.js test --plugin=ClassesPlugin
node src/harness.js smoke --plugin=Core-Plugin
```

The plugin selector accepts either the project folder name or the plugin name from `plugin.yml`.

## Start A Manual Test Server

This builds and copies the plugins, then leaves the server attached to your terminal:

```powershell
npm.cmd run server
```

The server is rebuilt under:

```text
C:\Users\Admin\Desktop\mine-plugins\plugin-testing-environment\.work\server
```

## Configure Tests

Edit `test-env.config.json`.

Useful fields:

- `projects`: plugin folder, build type, jar glob, expected plugin name, smoke commands.
- `consoleCommands`: commands sent from the server console after startup.
- `botCommands`: commands sent by the `TestBot` Mineflayer client after it is op'd.
- `scenarios`: Mineflayer scenario modules, or objects with `path`, `manual`, `expectedFailure`, and `reason`.
- `serverProperties`: generated fresh for every run.

Manual scenarios are skipped by default and can be run with `--scenario=<name>`. Expected-failure scenarios are useful for regressions the environment can already detect but the plugin has not fixed yet. The suite fails if an expected-failure scenario unexpectedly starts passing, which is the cue to remove the `expectedFailure` marker.

## Suggested Testing Strategy

Use three layers:

1. Compile/build checks in every plugin project.
2. MockBukkit unit tests for isolated event listeners, commands, config parsing, and item factories.
3. This harness or Plugwright for real Paper startup, plugin compatibility, commands, inventories, movement, and cross-plugin behavior.

When a plugin moves to Gradle and needs richer bot flows, consider adding Plugwright directly to that project:

```kotlin
plugins {
    id("io.github.drownek.plugwright") version "2.0.2"
}
```

For now, this environment gives you one command that exercises the whole local plugin folder on real Paper `1.21.11`.
