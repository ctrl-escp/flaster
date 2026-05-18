#!/usr/bin/env node
import {runCli} from '../src/domain/cli/runCli.js';

await runCli(process.argv.slice(2));
