import { parseArgs } from 'jsr:@std/cli/parse-args';
import {
	bgBrightBlack,
	blue,
	bold,
	green,
	red,
	yellow,
} from 'jsr:@std/fmt/colors';

type SubtestStatus = 'PASS' | 'FAIL';
type TestStatus = 'PASS' | 'OK' | 'FAIL';

interface Subtest {
	name: string;
	status: SubtestStatus;
	message: string;
	expected?: SubtestStatus;
}

interface Test {
	test: string;
	subtests: Subtest[];
	status: TestStatus;
	message?: string;
	expected?: TestStatus;
}

interface Report {
	results: Test[];
}

const DEFAULT_FLAGS = {
	unchanged: false,
	passed: false,
	failed: true,
	failed_message: true,
} as const;
const START_OR_LINE_BREAKS = /(?<=^|\n)/g;

function flags<
	Flags extends Record<string, boolean>,
>(
	flags: string[],
	defaults: Flags,
) {
	const result = { ...defaults };
	// @ts-ignore TODO
	for (const flag of flags) result[flag] = true;
	return result;
}

function get_status(status: TestStatus, expected: TestStatus | undefined) {
	if (
		(status === 'PASS' && expected === undefined) ||
		(status === 'OK' && expected === undefined) ||
		// (status === 'FAIL' && expected === 'FAIL') ||
		(status === 'FAIL' && expected === undefined)
	) return 'unchanged';

	if (status === 'PASS' && expected === 'FAIL') return 'passed';
	if (status === 'FAIL' && expected === 'PASS') return 'failed';

	return 'error';
}

function indent(string: string) {
	return string.replaceAll(START_OR_LINE_BREAKS, '\t');
}

const config = parseArgs(Deno.args, { string: ['report', 'output'] });

if (!config.report) {
	console.error(
		`\n${red('ERROR:')} Expected ${
			bgBrightBlack('--report=path/to/report.json')
		}\n`,
	);

	Deno.exit(1);
}

const report: Report = JSON.parse(await Deno.readTextFile(config.report));
const output = flags(config.output?.split(',') ?? [], DEFAULT_FLAGS);

let unchanged = 0;
let passed = 0;
let failed = 0;

console.log('');

for (let index = 0; index < report.results.length; index++) {
	const test = report.results[index];

	const log_queue: string[] = [];
	let local_unchanged = 0;
	let local_passed = 0;
	let local_failed = 0;

	for (const subtest of test.subtests) {
		const status = get_status(subtest.status, subtest.expected);

		if (status === 'error') {
			log_queue.push(
				`${red('ERROR:')} Unexpected status-expectation (${
					bgBrightBlack(`"${subtest.status}"`)
				}-${
					bgBrightBlack(
						subtest.expected ? `"${subtest.expected}"` : '<undefined>',
					)
				})`,
			);

			continue;
		}

		if (status === 'unchanged') {
			local_unchanged++;
			if (!output.unchanged) continue;
			log_queue.push(
				`${subtest.status} (from ${subtest.status}) 🡪 ${blue(subtest.name)}`,
			);
		}

		if (status === 'passed') {
			local_passed++;
			if (!output.passed) continue;
			log_queue.push(`PASS (from FAIL) 🡭 ${green(subtest.name)}`);
		}

		if (status === 'failed') {
			local_failed++;
			if (!output.failed) continue;
			log_queue.push(`FAIL (from PASS) 🡮 ${red(subtest.name)}`);

			if (!(output.failed_message && subtest.message)) continue;
			log_queue.push(yellow(indent(subtest.message)));
			log_queue.push('');
		}
	}

	unchanged += local_unchanged;
	passed += local_passed;
	failed += local_failed;

	const has_logs = log_queue.length > 0;
	const status = get_status(test.status, test.expected);
	const score = `(${blue(local_unchanged.toString())}/${
		green(local_passed.toString())
	}/${red(local_failed.toString())})`;

	if (has_logs && index !== 0) {
		console.log('');
	}

	if (status === 'error') {
		console.log(
			`${red('ERROR:')} Unexpected status-expectation (${
				bgBrightBlack(`"${test.status}"`)
			}-${
				bgBrightBlack(test.expected ? `"${test.expected}"` : '<undefined>')
			})`,
		);
	}

	if (status === 'unchanged') {
		console.log(
			`${score} ${
				bold(`${test.status} (from ${test.status}) 🡪 ${blue(test.test)}`)
			}`,
		);
	}

	if (status === 'passed') {
		local_passed++;
		if (!output.passed) continue;
		console.log(`PASS (from FAIL) 🡭 ${green(test.test)}`);
	}

	if (status === 'failed') {
		local_failed++;
		if (!output.failed) continue;
		console.log(`FAIL (from PASS) 🡮 ${red(test.test)}`);

		if (!(output.failed_message && test.message)) continue;
		console.log(yellow(test.message.replaceAll(START_OR_LINE_BREAKS, '\t')));
		console.log('');
	}

	if (log_queue.at(-1) === '') log_queue.pop();

	if (has_logs) {
		console.log(log_queue.join('\n'));
	}

	if (has_logs || index === report.results.length - 1) {
		console.log('');
	}
}

console.log(
	`${blue(`Unchanged: ${unchanged}`)} | ${green(`Passed: ${passed}`)} | ${
		red(`Failed: ${failed}`)
	}\n`,
);
