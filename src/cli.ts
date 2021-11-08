#!/usr/bin/env node

import {DownloadCommand} from './commands';
import {createCommand} from 'commander';

// Make sure that unhandled promises causes the command to fail.
process.on('unhandledRejection', up => {
  throw up;
});

const program = createCommand();
program
  .command('download [root]')
  .description('download greenhouse job and education data to a directory')
  .requiredOption('-b, --boardToken <boardToken>', 'greenhouse boardToken')
  .requiredOption(
    '-j, --jobsCollectionPodPath <jobsCollectionPath>',
    'pod path for the jobs collection'
  )
  .requiredOption(
    '-e, --educationPodPath <educationPodPath>',
    'pod path for the education file'
  )
  .action((path, options) => {
    const cmd = new DownloadCommand(options);
    cmd.run(path);
  });

program.parse(process.argv);
