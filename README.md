# Web Platform Tests reporter (wptr)

A quick script that logs the status vs expectation of a WPT run.

I wrote this to help out when [I was working](https://github.com/oddbird/css-anchor-positioning/pull/195) on Obbbird's CSS Anchor Positioning polyfill. I have only tested it on `/css/css-anchor-position` directory, if it does not work on other directories test feel free to open an issue/pull request and I may fix/merge it.

## Usage

Make sure you have [WPT](https://web-platform-tests.org/running-tests/from-local-system.html#system-setup) and [Deno](https://docs.deno.com/runtime/manual#install-deno) installed and setup.

[Run](https://web-platform-tests.org/running-tests/from-local-system.html#via-the-command-line) WPT on the old browser (or polyfill with `--inject-script`) to setup [expectations](https://web-platform-tests.org/tools/wptrunner/docs/expectation.html), and then on the new one using the generated expectations:

```sh
# Inside your WPT installation

./wpt run --log-wptreport=report-old.json [browsername] [tests]
./wpt update-expectations report-old.json
mkdir meta
./wpt run --metadata=meta --log-wptreport=report-new.json [browsername] [tests]
```

Now `report-new.json` should include `status` and `expected` properties for on some tests.

Then [install](https://docs.deno.com/runtime/manual/tools/script_installer) wptr
and run it on `report-new.json`:

```sh
# Install
deno install --global --allow-read https://raw.githubusercontent.com/ayoreis/wptr/main/mod.ts
wptr --report=path/to/report-new.json

# Or run from source
git clone https://github.com/ayoreis/wptr
cd wptr
deno run --allow-read mod.ts --report=path/to/report-new.json
```

## Options

### `--report`

Path to the [WPT report](https://web-platform-tests.org/running-tests/command-line-arguments.html#output-logging).

### `--output`

Comma (no space) separated list of what to output.

- **Options:** `unchanged`, `passed` (includes the `OK` status, did not find a difference), `failed`, `failed_message`
- **Default:** `failed,failed_message`
