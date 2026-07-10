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

## Run Everything

Build all plugins, start a clean headless Paper server, run console smoke checks, connect a bot, run basic player commands, scan the log for startup/enabling failures, then stop the server:

```powershell
npm.cmd test
```

Run only gameplay scenario tests:

```powershell
npm.cmd run scenarios
```

The first scenarios cover Bigger Crafting Table break behavior: normal survival break returns exactly one BCT, while a Corebreaker break attempt against a non-core BCT leaves the block in place and does not duplicate the item.

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
- `scenarios`: Mineflayer scenario modules that perform real in-server actions and assertions.
- `serverProperties`: generated fresh for every run.

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
